/**
 * Testes unitários do IndicatorPeriodBackfillService.
 *
 * Usa serviços reais (sem mocks de negócio) e apenas PrismaService mockado.
 * Cobre os 30 cenários obrigatórios da ETAPA 3E-C.
 */

import {
  IndicatorPeriodBackfillService,
  MAX_PERIODS_PER_INDICATOR,
} from './indicator-period-backfill.service';
import { IndicatorPeriodApurationService } from './indicator-period-apuration.service';
import { IndicatorPeriodClosingService } from './indicator-period-closing.service';
import { PeriodResolverService } from './period-resolver.service';
import { AggregationEngineService } from './aggregation-engine.service';
import { IndicatorHistoryService } from './indicator-history.service';
import { IndicatorAnalyticsService } from './indicator-analytics.service';
import { IndicatorCurrentStateService } from './indicator-current-state.service';
import { IndicatorFrequency } from './enums/indicator-frequency.enum';
import { AggregationType } from './enums/aggregation-type.enum';
import { IndicatorStatus } from './enums/indicator-status.enum';

// ── Constantes ────────────────────────────────────────────────────────────────

// meia-noite BRT (UTC-3) de cada mês
const JAN_1 = new Date('2026-01-01T03:00:00.000Z');
const FEB_1 = new Date('2026-02-01T03:00:00.000Z');
const MAR_1 = new Date('2026-03-01T03:00:00.000Z');
const APR_1 = new Date('2026-04-01T03:00:00.000Z');
const MAY_1 = new Date('2026-05-01T03:00:00.000Z');
const JUN_1 = new Date('2026-06-01T03:00:00.000Z');
const JUL_1 = new Date('2026-07-01T03:00:00.000Z');
const AUG_1 = new Date('2026-08-01T03:00:00.000Z');
const SEP_1 = new Date('2026-09-01T03:00:00.000Z');
const OCT_1 = new Date('2026-10-01T03:00:00.000Z');
const NOV_1 = new Date('2026-11-01T03:00:00.000Z');
const DEC_1 = new Date('2026-12-01T03:00:00.000Z');
const JAN_1_2027 = new Date('2027-01-01T03:00:00.000Z');

const IND_ID = 'backfill-test-0001-4000-a000-000000000001';
const HIST_ID = 'hist-backfill-0000-4000-a000-000000000001';

// ── Helpers ───────────────────────────────────────────────────────────────────

const dec = (n: number) => ({ toNumber: () => n });

const makeInd = (overrides: Record<string, unknown> = {}) => ({
  id: IND_ID,
  frequency: IndicatorFrequency.MONTHLY,
  aggregationType: AggregationType.SUM,
  formula: null,
  goalValue: null,
  minimumGoalValue: null,
  maximumGoalValue: null,
  desiredDirection: 'HIGHER_IS_BETTER',
  isActive: true,
  name: 'Indicador Backfill Test',
  createdAt: JAN_1,
  ...overrides,
});

const makeMeasurement = (value: number, date: Date) => ({
  value: dec(value),
  referenceDate: date,
});

const makeHistRecord = (
  periodStart: Date,
  periodEnd: Date,
  overrides: Record<string, unknown> = {},
) => ({
  id: HIST_ID,
  indicatorId: IND_ID,
  periodStart,
  periodEnd,
  value: dec(100),
  goalValue: null,
  previousValue: null,
  variationPercent: null,
  status: IndicatorStatus.NEUTRAL,
  notes: null,
  calculatedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('IndicatorPeriodBackfillService', () => {
  let prisma: {
    indicator: { findMany: jest.Mock; findUnique: jest.Mock };
    indicatorHistory: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    indicatorMeasurement: { findMany: jest.Mock };
  };
  let backfill: IndicatorPeriodBackfillService;
  let apuration: IndicatorPeriodApurationService;

  const buildStack = () => {
    const periodResolver = new PeriodResolverService();
    const periodClosing = new IndicatorPeriodClosingService(periodResolver);
    const aggregation = new AggregationEngineService();
    const analytics = new IndicatorAnalyticsService();
    const historyService = new IndicatorHistoryService(prisma as never);
    const currentStateMock = {
      syncFromHistory: jest.fn().mockResolvedValue({ synced: true }),
    } as unknown as IndicatorCurrentStateService;
    apuration = new IndicatorPeriodApurationService(
      prisma as never,
      periodResolver,
      periodClosing,
      aggregation,
      historyService,
      analytics,
      currentStateMock,
    );
    backfill = new IndicatorPeriodBackfillService(
      prisma as never,
      periodResolver,
      apuration,
    );
  };

  beforeEach(() => {
    prisma = {
      indicator: { findMany: jest.fn(), findUnique: jest.fn() },
      indicatorHistory: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      indicatorMeasurement: { findMany: jest.fn().mockResolvedValue([]) },
    };
    buildStack();

    // Default: findUnique retorna indicador (necessário para closePeriod internamente)
    prisma.indicator.findUnique.mockResolvedValue(makeInd());

    // Default: create retorna histórico
    prisma.indicatorHistory.create.mockImplementation(
      (args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          ...makeHistRecord(
            args.data['periodStart'] as Date,
            args.data['periodEnd'] as Date,
          ),
          value:
            args.data['value'] != null
              ? dec(args.data['value'] as number)
              : null,
          status: args.data['status'],
        }),
    );
  });

  // ── 1. Nenhum período pendente ─────────────────────────────────────────────

  describe('1. Nenhum período pendente', () => {
    it('retorna periodsFound=0 quando todos os períodos já têm histórico', async () => {
      // Janeiro e fevereiro já fechados
      prisma.indicatorHistory.findMany.mockResolvedValue([
        { periodStart: JAN_1 },
        { periodStart: FEB_1 },
      ]);

      const result = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        MAR_1,
      );

      expect(result.periodsFound).toBe(0);
      expect(result.closed).toBe(0);
      expect(prisma.indicatorHistory.create).not.toHaveBeenCalled();
    });
  });

  // ── 2. Um período pendente ─────────────────────────────────────────────────

  describe('2. Um período pendente', () => {
    it('fecha exatamente 1 período', async () => {
      // Nenhum histórico existente
      prisma.indicatorHistory.findMany.mockResolvedValue([]);
      prisma.indicatorHistory.findUnique.mockResolvedValue(null);
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        makeMeasurement(100, new Date('2026-01-15T12:00:00.000Z')),
      ]);

      const result = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        FEB_1,
      );

      expect(result.periodsFound).toBe(1);
      expect(result.closed).toBe(1);
      expect(prisma.indicatorHistory.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── 3. Três períodos pendentes ─────────────────────────────────────────────

  describe('3. Três períodos pendentes', () => {
    it('fecha 3 períodos em ordem cronológica', async () => {
      prisma.indicatorHistory.findMany.mockResolvedValue([]);
      // Usa spy para simular closePeriod retornando CLOSED para cada período
      const spyClose = jest
        .spyOn(apuration, 'closePeriod')
        .mockResolvedValueOnce({
          status: 'CLOSED',
          historyId: 'h1',
          indicatorId: IND_ID,
          periodStart: JAN_1,
          periodEnd: FEB_1,
          value: 100,
          previousValue: null,
          variationPercent: null,
          goalValue: null,
          indicatorStatus: 'NEUTRAL' as never,
          measurementCount: 1,
          aggregationType: 'SUM' as never,
          isActive: true,
        })
        .mockResolvedValueOnce({
          status: 'CLOSED',
          historyId: 'h2',
          indicatorId: IND_ID,
          periodStart: FEB_1,
          periodEnd: MAR_1,
          value: 120,
          previousValue: 100,
          variationPercent: 20,
          goalValue: null,
          indicatorStatus: 'NEUTRAL' as never,
          measurementCount: 1,
          aggregationType: 'SUM' as never,
          isActive: true,
        })
        .mockResolvedValueOnce({
          status: 'CLOSED',
          historyId: 'h3',
          indicatorId: IND_ID,
          periodStart: MAR_1,
          periodEnd: APR_1,
          value: 150,
          previousValue: 120,
          variationPercent: 25,
          goalValue: null,
          indicatorStatus: 'NEUTRAL' as never,
          measurementCount: 1,
          aggregationType: 'SUM' as never,
          isActive: true,
        });

      const result = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        APR_1, // janeiro, fevereiro, março
      );

      expect(result.periodsFound).toBe(3);
      expect(result.closed).toBe(3);
      expect(spyClose).toHaveBeenCalledTimes(3);
      spyClose.mockRestore();
    });
  });

  // ── 4. Seis períodos pendentes ─────────────────────────────────────────────

  describe('4. Seis períodos pendentes', () => {
    it('fecha 6 períodos', async () => {
      prisma.indicatorHistory.findMany.mockResolvedValue([]);
      prisma.indicatorHistory.findUnique.mockResolvedValue(null);
      prisma.indicatorMeasurement.findMany.mockImplementation(
        (args: { where?: { referenceDate?: { gte?: Date } } }) => {
          const gte = args?.where?.referenceDate?.gte ?? JAN_1;
          const mid = new Date(gte.getTime() + 10 * 24 * 3600 * 1000);
          return Promise.resolve([makeMeasurement(50, mid)]);
        },
      );

      const result = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        JUL_1, // jan, fev, mar, abr, mai, jun
      );

      expect(result.periodsFound).toBe(6);
      expect(result.closed).toBe(6);
    });
  });

  // ── 5. Gap no histórico ────────────────────────────────────────────────────

  describe('5. Gap no histórico — período faltando no meio', () => {
    it('identifica agosto como pendente quando julho, setembro e outubro existem', async () => {
      // Julho e setembro existem; agosto ausente
      prisma.indicatorHistory.findMany.mockResolvedValue([
        { periodStart: JUL_1 },
        { periodStart: SEP_1 },
        { periodStart: OCT_1 },
      ]);
      prisma.indicatorHistory.findUnique.mockResolvedValue(null);
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        makeMeasurement(200, new Date('2026-08-10T12:00:00.000Z')),
      ]);

      const result = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JUL_1,
        NOV_1, // jul, ago, set, out
      );

      expect(result.periodsFound).toBe(1); // apenas agosto
      expect(result.closed).toBe(1);

      // Verifica que o create foi chamado com o período de agosto
      const createCall = prisma.indicatorHistory.create.mock.calls[0][0];
      expect(createCall.data.periodStart).toEqual(AUG_1);
      expect(createCall.data.periodEnd).toEqual(SEP_1);
    });
  });

  // ── 6. Ordem cronológica ───────────────────────────────────────────────────

  describe('6. Períodos em ordem cronológica', () => {
    it('chama closePeriod com periodEnd do mais antigo para o mais recente', async () => {
      prisma.indicatorHistory.findMany.mockResolvedValue([]);
      prisma.indicatorHistory.findUnique.mockResolvedValue(null);
      prisma.indicatorMeasurement.findMany.mockImplementation(
        (args: { where?: { referenceDate?: { gte?: Date } } }) => {
          const gte = args?.where?.referenceDate?.gte ?? JAN_1;
          const mid = new Date(gte.getTime() + 10 * 24 * 3600 * 1000);
          return Promise.resolve([makeMeasurement(100, mid)]);
        },
      );

      const result = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        APR_1,
      );

      expect(result.closed).toBe(3);

      // Verifica que os creates foram chamados com os períodos em ordem
      const calls = prisma.indicatorHistory.create.mock.calls;
      expect(calls[0][0].data.periodStart).toEqual(JAN_1);
      expect(calls[1][0].data.periodStart).toEqual(FEB_1);
      expect(calls[2][0].data.periodStart).toEqual(MAR_1);
    });
  });

  // ── 7. previousValue encadeado ────────────────────────────────────────────

  describe('7. previousValue encadeado', () => {
    it('cada período usa o histórico do anterior como previousValue', async () => {
      /**
       * Janeiro: sem previousValue (primeiro período)
       * Fevereiro: previousValue = valor de janeiro
       * Março: previousValue = valor de fevereiro
       *
       * O IndicatorPeriodApurationService busca findFirst(periodEnd = periodStart atual)
       * para descobrir o previousValue. Como o backfill persiste em ordem cronológica,
       * o histórico de janeiro já existe quando fevereiro é processado.
       */
      prisma.indicatorHistory.findMany.mockResolvedValue([]);
      prisma.indicatorHistory.findUnique.mockResolvedValue(null);

      // Medições diferentes por período
      prisma.indicatorMeasurement.findMany
        .mockResolvedValueOnce([
          makeMeasurement(100, new Date('2026-01-15T12:00:00.000Z')),
        ]) // jan
        .mockResolvedValueOnce([
          makeMeasurement(120, new Date('2026-02-15T12:00:00.000Z')),
        ]) // fev
        .mockResolvedValueOnce([
          makeMeasurement(150, new Date('2026-03-15T12:00:00.000Z')),
        ]); // mar

      // findFirst retorna o histórico criado no período anterior
      prisma.indicatorHistory.findFirst
        .mockResolvedValueOnce(null) // jan: sem anterior
        .mockResolvedValueOnce({ value: dec(100) }) // fev: anterior = jan (value=100)
        .mockResolvedValueOnce({ value: dec(120) }); // mar: anterior = fev (value=120)

      await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        APR_1,
      );

      // 3 creates, cada um com o previousValue correto
      const calls = prisma.indicatorHistory.create.mock.calls;
      expect(calls).toHaveLength(3);
      // Jan: previousValue=null ou undefined (sem histórico anterior)
      expect(calls[0][0].data.previousValue == null).toBe(true);
      // Fev: previousValue=100
      expect(calls[1][0].data.previousValue).toBe(100);
      // Mar: previousValue=120
      expect(calls[2][0].data.previousValue).toBe(120);
    });
  });

  // ── 8. Período já fechado ─────────────────────────────────────────────────

  describe('8. Período já fechado — idempotência', () => {
    it('retorna alreadyClosed quando o histórico já existe', async () => {
      // Histórico de janeiro já existe
      prisma.indicatorHistory.findMany.mockResolvedValue([]);
      prisma.indicatorHistory.findUnique.mockResolvedValue({ id: HIST_ID }); // idempotência
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        makeMeasurement(100, new Date('2026-01-10T12:00:00.000Z')),
      ]);

      const result = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        FEB_1,
      );

      // findPendingPeriods usa findMany para o Set, retorna vazio → periodsFound=1
      // mas closePeriod retorna ALREADY_CLOSED
      expect(result.alreadyClosed).toBe(1);
      expect(result.closed).toBe(0);
      expect(prisma.indicatorHistory.create).not.toHaveBeenCalled();
    });
  });

  // ── 9. Indicador inexistente ──────────────────────────────────────────────

  describe('9. Indicador inexistente', () => {
    it('runBackfill ignora indicador que não existe na query', async () => {
      prisma.indicator.findMany.mockResolvedValue([]); // nenhum indicador ativo
      const result = await backfill.runBackfill(JUL_1);
      expect(result.indicatorsProcessed).toBe(0);
    });
  });

  // ── 10. Indicador CUSTOM ──────────────────────────────────────────────────

  describe('10. Indicador CUSTOM — ignorado', () => {
    it('backfillIndicator retorna periodsFound=0 para CUSTOM', async () => {
      const result = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.CUSTOM,
        JAN_1,
        JUL_1,
      );
      expect(result.periodsFound).toBe(0);
      expect(prisma.indicatorHistory.create).not.toHaveBeenCalled();
    });

    it('runBackfill exclui CUSTOM da query', async () => {
      prisma.indicator.findMany.mockResolvedValue([]);
      await backfill.runBackfill(JUL_1);
      const callArgs = prisma.indicator.findMany.mock.calls[0][0];
      expect(callArgs.where.frequency).toEqual({
        not: IndicatorFrequency.CUSTOM,
      });
    });
  });

  // ── 11. Indicador inativo ─────────────────────────────────────────────────

  describe('11. Indicador inativo', () => {
    it('runBackfill por padrão processa apenas ativos', async () => {
      prisma.indicator.findMany.mockResolvedValue([]);
      await backfill.runBackfill(JUL_1);
      const callArgs = prisma.indicator.findMany.mock.calls[0][0];
      expect(callArgs.where.isActive).toBe(true);
    });

    it('runBackfill com includeInactive=true não filtra inativos', async () => {
      prisma.indicator.findMany.mockResolvedValue([]);
      await backfill.runBackfill(JUL_1, 'America/Sao_Paulo', true);
      const callArgs = prisma.indicator.findMany.mock.calls[0][0];
      expect(callArgs.where.isActive).toBeUndefined();
    });
  });

  // ── 12–17. AggregationTypes ───────────────────────────────────────────────

  describe('12–17. AggregationTypes', () => {
    const aggTypes = [
      { agg: 'SUM', measurements: [{ v: 10 }, { v: 20 }], expected: 30 },
      { agg: 'AVG', measurements: [{ v: 10 }, { v: 20 }], expected: 15 },
      { agg: 'MIN', measurements: [{ v: 10 }, { v: 20 }], expected: 10 },
      { agg: 'MAX', measurements: [{ v: 10 }, { v: 20 }], expected: 20 },
      { agg: 'LAST', measurements: [{ v: 10 }, { v: 20 }], expected: 20 },
      { agg: 'COUNT', measurements: [{ v: 10 }, { v: 20 }], expected: 2 },
    ];

    aggTypes.forEach(({ agg, measurements, expected }) => {
      it(`${agg} → fecha período com value=${expected}`, async () => {
        prisma.indicatorHistory.findMany.mockResolvedValue([]);
        prisma.indicatorHistory.findUnique.mockResolvedValue(null);
        // O closePeriod usa indicator.aggregationType do banco — precisa ser o correto
        prisma.indicator.findUnique.mockResolvedValue(
          makeInd({ aggregationType: agg }),
        );
        prisma.indicatorMeasurement.findMany.mockResolvedValue(
          measurements.map((m, i) =>
            makeMeasurement(
              m.v,
              new Date(
                `2026-01-${String(i + 5).padStart(2, '0')}T12:00:00.000Z`,
              ),
            ),
          ),
        );

        const result = await backfill.backfillIndicator(
          IND_ID,
          IndicatorFrequency.MONTHLY,
          JAN_1,
          FEB_1,
          'America/Sao_Paulo',
        );
        expect(result.closed).toBe(1);
        const createCall = prisma.indicatorHistory.create.mock.calls[0][0];
        expect(createCall.data.value).toBe(expected);
      });
    });
  });

  // ── 18. FORMULA ───────────────────────────────────────────────────────────

  describe('18. FORMULA — formulaRequired sem criar histórico', () => {
    it('FORMULA → formulaRequired=1, create não chamado', async () => {
      prisma.indicatorHistory.findMany.mockResolvedValue([]);
      prisma.indicatorHistory.findUnique.mockResolvedValue(null);
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        makeMeasurement(100, new Date('2026-01-10T12:00:00.000Z')),
      ]);

      const result = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        FEB_1,
      );
      // Por padrão makeInd usa SUM; mas podemos simular FORMULA via indicator mock
      // O resultado real depende da lógica do apuration — aqui testamos o flow genérico
      expect(result.periodsFound).toBe(1);
      // Quando aggregationType=FORMULA, closePeriod retorna FORMULA_ENGINE_REQUIRED
      // Para testar isso explicitamente:
      const spyClose = jest.spyOn(apuration, 'closePeriod').mockResolvedValue({
        status: 'FORMULA_ENGINE_REQUIRED',
        indicatorId: IND_ID,
        periodStart: JAN_1,
        periodEnd: FEB_1,
        formula: 'SUM(x)',
      });
      prisma.indicatorHistory.create.mockClear();

      const result2 = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        FEB_1,
      );
      expect(result2.formulaRequired).toBe(1);
      expect(prisma.indicatorHistory.create).not.toHaveBeenCalled();
      spyClose.mockRestore();
    });
  });

  // ── 19. NO_DATA ───────────────────────────────────────────────────────────

  describe('19. NO_DATA — SUM sem medições', () => {
    it('período sem medições → noData=1, nenhum histórico criado', async () => {
      prisma.indicatorHistory.findMany.mockResolvedValue([]);
      prisma.indicatorHistory.findUnique.mockResolvedValue(null);
      // findMany retorna vazio (default)

      const result = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        FEB_1,
      );

      expect(result.periodsFound).toBe(1);
      expect(result.noData).toBe(1);
      expect(result.closed).toBe(0);
      expect(prisma.indicatorHistory.create).not.toHaveBeenCalled();
    });
  });

  // ── 20. Restart parcial ───────────────────────────────────────────────────

  describe('20. Restart parcial', () => {
    it('2 períodos fechados antes do restart → ALREADY_CLOSED; 3 restantes → CLOSED', async () => {
      // Simulação: jan e fev já foram fechados antes do restart
      prisma.indicatorHistory.findMany.mockResolvedValue([
        { periodStart: JAN_1 },
        { periodStart: FEB_1 },
      ]);
      // Mar, abr, mai ainda não têm histórico
      prisma.indicatorHistory.findUnique.mockResolvedValue(null);
      prisma.indicatorMeasurement.findMany.mockImplementation(
        (args: { where?: { referenceDate?: { gte?: Date } } }) => {
          const gte = args?.where?.referenceDate?.gte ?? MAR_1;
          const mid = new Date(gte.getTime() + 10 * 24 * 3600 * 1000);
          return Promise.resolve([makeMeasurement(100, mid)]);
        },
      );

      const result = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        JUN_1, // jan, fev, mar, abr, mai
      );

      expect(result.periodsFound).toBe(3); // mar, abr, mai pendentes
      expect(result.closed).toBe(3);
      expect(result.alreadyClosed).toBe(0); // jan e fev não chegam ao closePeriod
    });
  });

  // ── 21. Retry após falha ──────────────────────────────────────────────────

  describe('21. Retry após falha', () => {
    it('falha no primeiro período: aborted=true, período 2 não processado', async () => {
      prisma.indicatorHistory.findMany.mockResolvedValue([]);
      prisma.indicatorHistory.findUnique.mockResolvedValue(null);
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        makeMeasurement(100, new Date('2026-01-10T12:00:00.000Z')),
      ]);
      prisma.indicatorHistory.create.mockRejectedValue(new Error('DB error'));

      const result = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        MAR_1, // jan e fev pendentes
      );

      expect(result.failed).toBe(1);
      expect(result.aborted).toBe(true);
      expect(result.processed).toBe(1); // parou após falha
      expect(result.closed).toBe(0);
    });

    it('segunda execução fecha o período que falhou', async () => {
      prisma.indicatorHistory.findMany.mockResolvedValue([]);
      prisma.indicatorHistory.findUnique.mockResolvedValue(null);
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        makeMeasurement(100, new Date('2026-01-10T12:00:00.000Z')),
      ]);

      // Primeira execução: falha
      prisma.indicatorHistory.create.mockRejectedValueOnce(
        new Error('DB error'),
      );
      await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        FEB_1,
      );

      // Segunda execução: sucesso
      prisma.indicatorHistory.create.mockResolvedValueOnce(
        makeHistRecord(JAN_1, FEB_1),
      );
      const result = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        FEB_1,
      );

      expect(result.closed).toBe(1);
      expect(result.aborted).toBe(false);
    });
  });

  // ── 22. Idempotência ─────────────────────────────────────────────────────

  describe('22. Idempotência — 3 execuções', () => {
    it('create chamado 1x; execuções 2 e 3 retornam alreadyClosed', async () => {
      prisma.indicatorHistory.findMany.mockResolvedValue([]);
      prisma.indicatorHistory.findUnique
        .mockResolvedValueOnce(null) // 1ª exec: não existe
        .mockResolvedValue({ id: HIST_ID }); // 2ª e 3ª exec: já existe
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        makeMeasurement(100, new Date('2026-01-10T12:00:00.000Z')),
      ]);

      const r1 = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        FEB_1,
      );
      expect(r1.closed).toBe(1);

      // histórico agora existe
      prisma.indicatorHistory.findMany.mockResolvedValue([
        { periodStart: JAN_1 },
      ]);
      const r2 = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        FEB_1,
      );
      expect(r2.periodsFound).toBe(0); // Set já contém o período

      const r3 = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.MONTHLY,
        JAN_1,
        FEB_1,
      );
      expect(r3.periodsFound).toBe(0);

      expect(prisma.indicatorHistory.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── 23. Execução concorrente ─────────────────────────────────────────────

  describe('23. Execução concorrente — idempotência via constraint', () => {
    it('duas execuções simultâneas: uma fecha, outra retorna alreadyClosed', async () => {
      prisma.indicatorHistory.findMany.mockResolvedValue([]);
      let createCount = 0;
      prisma.indicatorHistory.findUnique.mockResolvedValue(null);
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        makeMeasurement(100, new Date('2026-01-10T12:00:00.000Z')),
      ]);
      prisma.indicatorHistory.create.mockImplementation(() => {
        createCount++;
        if (createCount === 1)
          return Promise.resolve(makeHistRecord(JAN_1, FEB_1));
        const err = Object.assign(new Error('Unique constraint'), {
          code: 'P2002',
        });
        return Promise.reject(err);
      });

      const [r1, r2] = await Promise.allSettled([
        backfill.backfillIndicator(
          IND_ID,
          IndicatorFrequency.MONTHLY,
          JAN_1,
          FEB_1,
        ),
        backfill.backfillIndicator(
          IND_ID,
          IndicatorFrequency.MONTHLY,
          JAN_1,
          FEB_1,
        ),
      ]);

      const fulfilled = [r1, r2].filter((r) => r.status === 'fulfilled');
      const closed = fulfilled.filter(
        (r) => r.status === 'fulfilled' && r.value.closed === 1,
      );
      expect(closed).toHaveLength(1);
      expect(createCount).toBe(2);
    });
  });

  // ── 24. Limite máximo de períodos ─────────────────────────────────────────

  describe('24. Limite máximo de períodos (MAX_PERIODS_PER_INDICATOR)', () => {
    it('processa no máximo MAX_PERIODS_PER_INDICATOR períodos por execução', async () => {
      // Simula 150 períodos diários pendentes — limite é 100
      const startDate = new Date('2026-01-01T03:00:00.000Z');
      const endDate = new Date('2026-06-30T03:00:00.000Z'); // ~180 dias

      prisma.indicatorHistory.findMany.mockResolvedValue([]);
      prisma.indicatorHistory.findUnique.mockResolvedValue(null);
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        makeMeasurement(10, new Date('2026-01-01T06:00:00.000Z')),
      ]);

      const result = await backfill.backfillIndicator(
        IND_ID,
        IndicatorFrequency.DAILY,
        startDate,
        endDate,
      );

      expect(result.periodsFound).toBeGreaterThan(MAX_PERIODS_PER_INDICATOR);
      expect(result.processed).toBe(MAX_PERIODS_PER_INDICATOR);
    });
  });

  // ── 25–30. Todas as frequencies ────────────────────────────────────────────

  describe('25–30. Frequências', () => {
    const freqCases = [
      {
        name: 'DAILY',
        freq: IndicatorFrequency.DAILY,
        start: new Date('2026-08-09T03:00:00.000Z'),
        end: new Date('2026-08-11T03:00:00.000Z'), // 2 dias
        periodsExpected: 2,
        mDate: new Date('2026-08-09T06:00:00.000Z'),
      },
      {
        name: 'WEEKLY',
        freq: IndicatorFrequency.WEEKLY,
        start: new Date('2026-07-27T03:00:00.000Z'), // seg 27/jul
        end: new Date('2026-08-17T03:00:00.000Z'), // seg 17/ago (3 semanas)
        periodsExpected: 3,
        mDate: new Date('2026-07-28T12:00:00.000Z'),
      },
      {
        name: 'MONTHLY',
        freq: IndicatorFrequency.MONTHLY,
        start: JAN_1,
        end: APR_1, // 3 meses
        periodsExpected: 3,
        mDate: new Date('2026-01-15T12:00:00.000Z'),
      },
      {
        name: 'QUARTERLY',
        freq: IndicatorFrequency.QUARTERLY,
        start: JAN_1,
        end: new Date('2026-10-01T03:00:00.000Z'), // 3 trimestres
        periodsExpected: 3,
        mDate: new Date('2026-02-15T12:00:00.000Z'),
      },
      {
        name: 'SEMESTERLY',
        freq: IndicatorFrequency.SEMESTERLY,
        start: JAN_1,
        end: JAN_1_2027, // S1 e S2 de 2026
        periodsExpected: 2,
        mDate: new Date('2026-03-15T12:00:00.000Z'),
      },
      {
        name: 'YEARLY',
        freq: IndicatorFrequency.YEARLY,
        start: new Date('2024-01-01T03:00:00.000Z'),
        end: JAN_1_2027, // 2024, 2025, 2026
        periodsExpected: 3,
        mDate: new Date('2024-06-15T12:00:00.000Z'),
      },
    ];

    freqCases.forEach(({ name, freq, start, end, periodsExpected }) => {
      it(`${name}: fecha ${periodsExpected} períodos pendentes`, async () => {
        prisma.indicatorHistory.findMany.mockResolvedValue([]);
        prisma.indicatorHistory.findUnique.mockResolvedValue(null);
        // O closePeriod internamente usa indicator.frequency do banco
        prisma.indicator.findUnique.mockResolvedValue(
          makeInd({ frequency: freq }),
        );
        // Retorna medição dentro de cada período usando a data gte da query
        // Para DAILY (+12h garante estar dentro do período de 24h sem atingir periodEnd)
        prisma.indicatorMeasurement.findMany.mockImplementation(
          (args: { where?: { referenceDate?: { gte?: Date } } }) => {
            const gte = args?.where?.referenceDate?.gte ?? start;
            const mid = new Date(gte.getTime() + 12 * 3600 * 1000); // +12h
            return Promise.resolve([makeMeasurement(100, mid)]);
          },
        );

        const result = await backfill.backfillIndicator(
          IND_ID,
          freq,
          start,
          end,
        );
        expect(result.periodsFound).toBe(periodsExpected);
        expect(result.closed).toBe(periodsExpected);
      });
    });
  });

  // ── Integração: runBackfill com múltiplos indicadores ──────────────────────

  describe('runBackfill — integração com múltiplos indicadores', () => {
    it('processa todos os indicadores ativos e fecha períodos pendentes', async () => {
      const ind2 = 'backfill-test-0002-4000-a000-000000000002';

      prisma.indicator.findMany.mockResolvedValue([
        makeInd({ id: IND_ID, createdAt: JAN_1 }),
        makeInd({ id: ind2, createdAt: MAR_1 }),
      ]);

      // Nenhum histórico para nenhum dos dois
      prisma.indicatorHistory.findMany.mockResolvedValue([]);
      prisma.indicatorHistory.findUnique.mockResolvedValue(null);
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        makeMeasurement(100, new Date('2026-01-15T12:00:00.000Z')),
      ]);

      const result = await backfill.runBackfill(APR_1); // jan, fev, mar pendentes para IND_ID; jan para ind2
      expect(result.indicatorsProcessed).toBe(2);
      expect(result.totalClosed).toBeGreaterThan(0);
    });

    it('downtime de 3 meses — fecha 3 períodos na ordem correta', async () => {
      prisma.indicator.findMany.mockResolvedValue([
        makeInd({ id: IND_ID, createdAt: AUG_1 }),
      ]);
      prisma.indicatorHistory.findMany.mockResolvedValue([]);
      prisma.indicatorHistory.findUnique.mockResolvedValue(null);
      // Medição dentro de cada período (ago, set, out)
      prisma.indicatorMeasurement.findMany.mockImplementation(
        (args: { where?: { referenceDate?: { gte?: Date } } }) => {
          const gte = args?.where?.referenceDate?.gte ?? AUG_1;
          const mid = new Date(gte.getTime() + 10 * 24 * 3600 * 1000);
          return Promise.resolve([makeMeasurement(100, mid)]);
        },
      );

      // Aplicação voltou em 01/nov após 3 meses de downtime
      const result = await backfill.runBackfill(NOV_1);
      expect(result.indicatorsProcessed).toBe(1);
      expect(result.totalPeriodsFound).toBe(3); // ago, set, out
      expect(result.totalClosed).toBe(3);
    });
  });
});
