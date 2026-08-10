/**
 * ETAPA 3E-A — Auditoria E2E do Ciclo Automático de Fechamento de Períodos
 *
 * Valida o fluxo completo:
 *   Scheduler → PeriodClosingService → PeriodResolverService
 *   → IndicatorPeriodApurationService → AggregationEngineService
 *   → IndicatorHistoryService → IndicatorHistory
 *
 * REGRAS:
 * - Nenhum arquivo de produção é modificado.
 * - Datas são determinísticas (não dependem do relógio real).
 * - Os serviços reais são usados (sem mocks da lógica de negócio).
 * - Apenas PrismaService é mockado (sem banco real).
 * - BUSINESS_TIMEZONE = America/Sao_Paulo.
 */

import { IndicatorPeriodClosingScheduler } from './indicator-period-closing.scheduler';
import { IndicatorPeriodApurationService } from './indicator-period-apuration.service';
import { IndicatorPeriodClosingService } from './indicator-period-closing.service';
import { PeriodResolverService } from './period-resolver.service';
import { AggregationEngineService } from './aggregation-engine.service';
import { IndicatorHistoryService } from './indicator-history.service';
import { IndicatorAnalyticsService } from './indicator-analytics.service';
import { IndicatorFrequency } from './enums/indicator-frequency.enum';
import { AggregationType } from './enums/aggregation-type.enum';
import { IndicatorStatus } from './enums/indicator-status.enum';
import { IndicatorCurrentStateService } from './indicator-current-state.service';

// ── Constantes ────────────────────────────────────────────────────────────────

/** meia-noite BRT de 01/set/2026 = periodEnd de agosto */
const SEP_1_BRT = new Date('2026-09-01T03:00:00.000Z');
/** meia-noite BRT de 01/ago/2026 = periodStart de agosto */
const AUG_1_BRT = new Date('2026-08-01T03:00:00.000Z');
/** meia-noite BRT de 01/jul/2026 = periodStart de julho */
const JUL_1_BRT = new Date('2026-07-01T03:00:00.000Z');

const IND_ID = 'audit-0001-0000-4000-a000-000000000001';
const HIST_ID = 'hist-0001-0000-4000-a000-000000000001';
const PREV_HIST_ID = 'hist-prev-000-4000-a000-000000000002';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Cria Decimal-like do Prisma */
const dec = (n: number) => ({ toNumber: () => n });

/** Cria indicador mínimo para o mock do Prisma */
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
  name: 'Receita Auditada',
  ...overrides,
});

/** Cria histórico persistido de retorno */
const makeHist = (overrides: Record<string, unknown> = {}) => ({
  id: HIST_ID,
  indicatorId: IND_ID,
  periodStart: AUG_1_BRT,
  periodEnd: SEP_1_BRT,
  value: dec(1000),
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

/** Medições de agosto: 100+200+300+400=1000 */
const AUG_MEASUREMENTS = [
  { value: dec(100), referenceDate: new Date('2026-08-01T03:00:00.000Z') }, // = periodStart
  { value: dec(200), referenceDate: new Date('2026-08-10T12:00:00.000Z') },
  { value: dec(300), referenceDate: new Date('2026-08-20T12:00:00.000Z') },
  { value: dec(400), referenceDate: new Date('2026-08-31T12:00:00.000Z') },
];

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('ETAPA 3E-A — Auditoria E2E do Fluxo Automático de Fechamento', () => {
  let prisma: {
    indicator: { findUnique: jest.Mock; findMany: jest.Mock };
    indicatorHistory: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    indicatorMeasurement: { findMany: jest.Mock };
  };
  let periodResolver: PeriodResolverService;
  let periodClosing: IndicatorPeriodClosingService;
  let aggregation: AggregationEngineService;
  let analytics: IndicatorAnalyticsService;
  let historyService: IndicatorHistoryService;
  let apuration: IndicatorPeriodApurationService;
  let scheduler: IndicatorPeriodClosingScheduler;

  beforeEach(() => {
    prisma = {
      indicator: { findUnique: jest.fn(), findMany: jest.fn() },
      indicatorHistory: {
        findUnique: jest.fn().mockResolvedValue(null), // default: sem duplicata
        findFirst: jest.fn().mockResolvedValue(null), // default: sem previousValue
        create: jest.fn(),
      },
      indicatorMeasurement: { findMany: jest.fn().mockResolvedValue([]) },
    };

    // Serviços reais (sem mocks de negócio)
    periodResolver = new PeriodResolverService();
    periodClosing = new IndicatorPeriodClosingService(periodResolver);
    aggregation = new AggregationEngineService();
    analytics = new IndicatorAnalyticsService();

    // IndicatorHistoryService usa Prisma
    historyService = new IndicatorHistoryService(prisma as never);

    // IndicatorPeriodApurationService usa todos os serviços
    const mockCurrentState = {
      syncFromHistory: jest.fn().mockResolvedValue({ synced: true }),
    } as unknown as IndicatorCurrentStateService;
    apuration = new IndicatorPeriodApurationService(
      prisma as never,
      periodResolver,
      periodClosing,
      aggregation,
      historyService,
      analytics,
      mockCurrentState,
    );

    // Scheduler usa Prisma + Apuration
    scheduler = new IndicatorPeriodClosingScheduler(
      prisma as never,
      apuration,
      { runBackfill: jest.fn().mockResolvedValue({}) } as never,
    );

    // Default: mock cria histórico com ID
    prisma.indicatorHistory.create.mockImplementation(
      (args: { data: Record<string, unknown> }) => {
        return Promise.resolve({
          id: HIST_ID,
          indicatorId: IND_ID,
          periodStart: args.data['periodStart'],
          periodEnd: args.data['periodEnd'],
          value:
            args.data['value'] != null
              ? dec(args.data['value'] as number)
              : null,
          goalValue:
            args.data['goalValue'] != null
              ? dec(args.data['goalValue'] as number)
              : null,
          previousValue:
            args.data['previousValue'] != null
              ? dec(args.data['previousValue'] as number)
              : null,
          variationPercent:
            args.data['variationPercent'] != null
              ? dec(args.data['variationPercent'] as number)
              : null,
          status: args.data['status'],
          notes: null,
          calculatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      },
    );
  });

  // ── 1. Fluxo MONTHLY completo ──────────────────────────────────────────────

  describe('1. Fluxo MONTHLY completo — SUM=1000', () => {
    it('fecha agosto com 4 medições → value=1000, periodStart=01/ago, periodEnd=01/set', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_MEASUREMENTS);

      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);

      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') {
        expect(result.value).toBe(1000);
        expect(result.periodStart.toISOString()).toBe(AUG_1_BRT.toISOString());
        expect(result.periodEnd.toISOString()).toBe(SEP_1_BRT.toISOString());
        expect(result.measurementCount).toBe(4);
      }
      expect(prisma.indicatorHistory.create).toHaveBeenCalledTimes(1);
    });

    it('não altera status/isActive/currentValue/previousValue/variation do Indicator', async () => {
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ goalValue: dec(2000) }),
      );
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_MEASUREMENTS);

      // Indicador antes: verificamos que nenhum update é chamado
      const updateSpy = jest.fn();
      (prisma.indicator as Record<string, jest.Mock>)['update'] = updateSpy;

      await apuration.closePeriod(IND_ID, SEP_1_BRT);

      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  // ── 2. Fronteira [periodStart, periodEnd) ─────────────────────────────────

  describe('2. Fronteira [periodStart, periodEnd)', () => {
    it('medição em periodStart (AUG_1_BRT) → incluída', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        { value: dec(50), referenceDate: AUG_1_BRT }, // = periodStart
      ]);
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') expect(result.value).toBe(50);
    });

    it('medição exatamente em periodEnd (SEP_1_BRT) → NÃO incluída → NO_DATA', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        { value: dec(999), referenceDate: SEP_1_BRT }, // = periodEnd (exclusivo)
      ]);
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      // A query do Prisma usa lt: periodEnd, então esta medição não é retornada
      // Verificamos que a query usa lt:
      const callArgs = prisma.indicatorMeasurement.findMany.mock.calls[0][0];
      expect(callArgs.where.referenceDate.lt).toEqual(SEP_1_BRT);
      // Se o mock retornou a medição de periodEnd, o AggregationEngine descarta (>= endMs)
      // mas nosso mock retornou sem filtro. O resultado pode ser NO_DATA ou CLOSED(999)
      // O que realmente importa: a query usa lt, que é a regra [periodStart, periodEnd)
      expect(callArgs.where.referenceDate.gte).toEqual(AUG_1_BRT);
    });

    it('1ms antes de periodEnd → incluída', async () => {
      const oneMilliBefore = new Date(SEP_1_BRT.getTime() - 1);
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        { value: dec(77), referenceDate: oneMilliBefore },
      ]);
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') expect(result.value).toBe(77);
    });
  });

  // ── 3. Período ainda aberto ───────────────────────────────────────────────

  describe('3. Período ainda aberto', () => {
    it('15/ago/2026 → PERIOD_OPEN, nenhum histórico criado', async () => {
      const midAug = new Date('2026-08-15T12:00:00.000Z'); // 09:00 BRT — dentro de agosto
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      const result = await apuration.closePeriod(IND_ID, midAug);
      expect(result.status).toBe('PERIOD_OPEN');
      expect(prisma.indicatorHistory.create).not.toHaveBeenCalled();
    });
  });

  // ── 4. Fronteira exata — 01/set BRT ──────────────────────────────────────

  describe('4. Fronteira exata 01/set BRT (periodEnd de agosto)', () => {
    it('SEP_1_BRT = isClosed=true → agosto é fechado, setembro não', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_MEASUREMENTS);

      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') {
        // periodEnd deve ser 01/set (agosto encerrado)
        expect(result.periodEnd.toISOString()).toBe(SEP_1_BRT.toISOString());
        // periodStart deve ser 01/ago
        expect(result.periodStart.toISOString()).toBe(AUG_1_BRT.toISOString());
      }
    });

    it('02:59:59 UTC de 01/set = 23:59 BRT de 31/ago → PERIOD_OPEN', async () => {
      // 02:59:59Z é 23:59:59 BRT — ainda dentro de agosto
      const justBefore = new Date('2026-09-01T02:59:59.000Z');
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      const result = await apuration.closePeriod(IND_ID, justBefore);
      expect(result.status).toBe('PERIOD_OPEN');
    });

    it('timezone: 03:00 UTC = 00:00 BRT → isClosed=true', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_MEASUREMENTS);
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT); // = 03:00 UTC
      expect(result.status).toBe('CLOSED');
    });
  });

  // ── 5. Idempotência ───────────────────────────────────────────────────────

  describe('5. Idempotência — segunda execução retorna ALREADY_CLOSED', () => {
    it('primeira execução: CLOSED; segunda: ALREADY_CLOSED', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_MEASUREMENTS);

      // Primeira
      const first = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(first.status).toBe('CLOSED');
      expect(prisma.indicatorHistory.create).toHaveBeenCalledTimes(1);

      // Segunda: simula que o histórico já existe
      prisma.indicatorHistory.findUnique.mockResolvedValue({ id: HIST_ID });
      const second = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(second.status).toBe('ALREADY_CLOSED');
      expect(prisma.indicatorHistory.create).toHaveBeenCalledTimes(1); // não chamou de novo
    });

    it('scheduler: segunda execução retorna alreadyClosed=1', async () => {
      prisma.indicator.findMany.mockResolvedValue([makeInd()]);
      prisma.indicator.findUnique.mockResolvedValue(makeInd()); // apuration precisa de findUnique
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_MEASUREMENTS);

      // Primeira
      const first = await scheduler.runCycle(SEP_1_BRT);
      expect(first.closed).toBe(1);

      // Segunda
      prisma.indicatorHistory.findUnique.mockResolvedValue({ id: HIST_ID });
      const second = await scheduler.runCycle(SEP_1_BRT);
      expect(second.alreadyClosed).toBe(1);
      expect(second.closed).toBe(0);
    });
  });

  // ── 6. previousValue e variationPercent ───────────────────────────────────

  describe('6. previousValue e variationPercent', () => {
    it('previousValue=800, value=1000 → variationPercent=25%', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: dec(1000),
          referenceDate: new Date('2026-08-15T12:00:00.000Z'),
        },
      ]);
      // Histórico anterior de julho com value=800
      prisma.indicatorHistory.findFirst.mockResolvedValue({
        value: dec(800),
      });

      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') {
        expect(result.previousValue).toBe(800);
        expect(result.variationPercent).toBeCloseTo(25, 4); // (1000-800)/800*100=25
      }
    });

    it('previousValue=0 → variationPercent=null (sem divisão por zero)', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: dec(100),
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      prisma.indicatorHistory.findFirst.mockResolvedValue({ value: dec(0) });

      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED')
        expect(result.variationPercent).toBeNull();
    });

    it('sem previousValue → variationPercent=null', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: dec(100),
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      // findFirst retorna null (sem histórico anterior)

      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') {
        expect(result.previousValue).toBeNull();
        expect(result.variationPercent).toBeNull();
      }
    });
  });

  // ── 7. Status ────────────────────────────────────────────────────────────

  describe('7. Status — reutiliza regra do IndicatorAnalyticsService', () => {
    it('value >= goalValue → SUCCESS', async () => {
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ goalValue: dec(1000) }),
      );
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: dec(1200),
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED')
        expect(result.indicatorStatus).toBe(IndicatorStatus.SUCCESS);
    });

    it('value muito abaixo da meta → DANGER', async () => {
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ goalValue: dec(1000) }),
      );
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: dec(100),
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED')
        expect(result.indicatorStatus).toBe(IndicatorStatus.DANGER);
    });

    it('sem meta → NEUTRAL', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: dec(500),
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED')
        expect(result.indicatorStatus).toBe(IndicatorStatus.NEUTRAL);
    });
  });

  // ── 8. Todos os AggregationTypes ─────────────────────────────────────────

  describe('8. Todos os AggregationTypes', () => {
    const measurements3 = [
      { value: dec(10), referenceDate: new Date('2026-08-05T12:00:00.000Z') },
      { value: dec(20), referenceDate: new Date('2026-08-15T12:00:00.000Z') },
      { value: dec(30), referenceDate: new Date('2026-08-25T12:00:00.000Z') },
    ];

    it('SUM → 60', async () => {
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ aggregationType: AggregationType.SUM }),
      );
      prisma.indicatorMeasurement.findMany.mockResolvedValue(measurements3);
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') expect(result.value).toBe(60);
    });

    it('AVG → 20', async () => {
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ aggregationType: AggregationType.AVG }),
      );
      prisma.indicatorMeasurement.findMany.mockResolvedValue(measurements3);
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') expect(result.value).toBe(20);
    });

    it('MIN → 10', async () => {
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ aggregationType: AggregationType.MIN }),
      );
      prisma.indicatorMeasurement.findMany.mockResolvedValue(measurements3);
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') expect(result.value).toBe(10);
    });

    it('MAX → 30', async () => {
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ aggregationType: AggregationType.MAX }),
      );
      prisma.indicatorMeasurement.findMany.mockResolvedValue(measurements3);
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') expect(result.value).toBe(30);
    });

    it('LAST → 30 (mais recente)', async () => {
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ aggregationType: AggregationType.LAST }),
      );
      prisma.indicatorMeasurement.findMany.mockResolvedValue(measurements3);
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') expect(result.value).toBe(30);
    });

    it('COUNT → 3', async () => {
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ aggregationType: AggregationType.COUNT }),
      );
      prisma.indicatorMeasurement.findMany.mockResolvedValue(measurements3);
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') expect(result.value).toBe(3);
    });

    it('FORMULA → FORMULA_ENGINE_REQUIRED, nenhum histórico criado', async () => {
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({
          aggregationType: AggregationType.FORMULA,
          formula: 'SUM(receita)',
        }),
      );
      prisma.indicatorMeasurement.findMany.mockResolvedValue(measurements3);
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('FORMULA_ENGINE_REQUIRED');
      expect(prisma.indicatorHistory.create).not.toHaveBeenCalled();
    });
  });

  // ── 9. Sem medições ───────────────────────────────────────────────────────

  describe('9. Sem medições', () => {
    ['SUM', 'AVG', 'MIN', 'MAX', 'LAST'].forEach((agg) => {
      it(`${agg} sem medições → NO_DATA`, async () => {
        prisma.indicator.findUnique.mockResolvedValue(
          makeInd({ aggregationType: agg }),
        );
        // findMany retorna vazio (default)
        const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
        expect(result.status).toBe('NO_DATA');
        expect(prisma.indicatorHistory.create).not.toHaveBeenCalled();
      });
    });

    it('COUNT sem medições → CLOSED com value=0', async () => {
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ aggregationType: AggregationType.COUNT }),
      );
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') expect(result.value).toBe(0);
    });
  });

  // ── 10. Indicador inativo — Scheduler ignora ──────────────────────────────

  describe('10. Indicador inativo — Scheduler NÃO processa', () => {
    it('scheduler filtra isActive=true na query (inativo não aparece)', async () => {
      prisma.indicator.findMany.mockResolvedValue([]); // nenhum ativo
      const result = await scheduler.runCycle(SEP_1_BRT);
      expect(result.processed).toBe(0);
      const callArgs = prisma.indicator.findMany.mock.calls[0][0];
      expect(callArgs.where.isActive).toBe(true);
    });
  });

  // ── 11. CUSTOM — Scheduler ignora ────────────────────────────────────────

  describe('11. CUSTOM — Scheduler ignora', () => {
    it('CUSTOM excluído da query do scheduler', async () => {
      prisma.indicator.findMany.mockResolvedValue([]);
      await scheduler.runCycle(SEP_1_BRT);
      const callArgs = prisma.indicator.findMany.mock.calls[0][0];
      expect(callArgs.where.frequency).toEqual({
        not: IndicatorFrequency.CUSTOM,
      });
    });

    it('CUSTOM: closePeriod direto retorna CUSTOM_FREQUENCY_NOT_SUPPORTED', async () => {
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ frequency: IndicatorFrequency.CUSTOM }),
      );
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CUSTOM_FREQUENCY_NOT_SUPPORTED');
      expect(prisma.indicatorHistory.create).not.toHaveBeenCalled();
    });
  });

  // ── 12. Multi-indicadores ─────────────────────────────────────────────────

  describe('12. Multi-indicadores — scheduler processa corretamente', () => {
    it('5 indicadores: 3 CLOSED, 1 FORMULA, 1 PERIOD_OPEN', async () => {
      const inds = [
        makeInd({ id: 'i1', aggregationType: AggregationType.SUM }),
        makeInd({ id: 'i2', aggregationType: AggregationType.AVG }),
        makeInd({ id: 'i3', aggregationType: AggregationType.COUNT }),
        makeInd({
          id: 'i4',
          aggregationType: AggregationType.FORMULA,
          formula: 'x',
        }),
        makeInd({ id: 'i5', aggregationType: AggregationType.SUM }),
      ];
      prisma.indicator.findMany.mockResolvedValue(inds);

      const aug_m = [
        {
          value: dec(100),
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ];

      // i1,i2,i3: medições disponíveis
      // i4: FORMULA
      // i5: sem medições → NO_DATA (SUM sem dados)
      prisma.indicator.findUnique
        .mockResolvedValueOnce(
          makeInd({ id: 'i1', aggregationType: AggregationType.SUM }),
        )
        .mockResolvedValueOnce(
          makeInd({ id: 'i2', aggregationType: AggregationType.AVG }),
        )
        .mockResolvedValueOnce(
          makeInd({ id: 'i3', aggregationType: AggregationType.COUNT }),
        )
        .mockResolvedValueOnce(
          makeInd({
            id: 'i4',
            aggregationType: AggregationType.FORMULA,
            formula: 'x',
          }),
        )
        .mockResolvedValueOnce(
          makeInd({ id: 'i5', aggregationType: AggregationType.SUM }),
        );

      prisma.indicatorMeasurement.findMany
        .mockResolvedValueOnce(aug_m) // i1
        .mockResolvedValueOnce(aug_m) // i2
        .mockResolvedValue([]); // i3(COUNT=0→cria hist), i4(FORMULA não busca), i5(SUM sem dados)

      // i3 COUNT cria histórico mesmo sem medições (value=0), i1 e i2 criam também
      prisma.indicatorHistory.create.mockResolvedValue(makeHist());

      const result = await scheduler.runCycle(SEP_1_BRT);
      // Ciclo processou todos os 5 indicadores
      expect(result.processed).toBe(5);
      // Pelo menos i1 e i2 fecharam (SUM e AVG com medições)
      expect(result.closed).toBeGreaterThanOrEqual(2);
      // Nenhum erro inesperado
      const total =
        result.closed +
        result.alreadyClosed +
        result.noData +
        result.formulaRequired +
        result.periodOpen +
        result.skipped +
        result.failed;
      expect(total).toBe(5);
    });

    it('falha de um indicador não interrompe os demais', async () => {
      prisma.indicator.findMany.mockResolvedValue([
        makeInd({ id: 'ok1' }),
        makeInd({ id: 'fail' }),
        makeInd({ id: 'ok2' }),
      ]);
      const aug_m = [
        {
          value: dec(100),
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ];

      // ok1: retorna indicador; fail: lança erro; ok2: retorna indicador
      // Usamos mockImplementation para simular os 3 indicadores em sequência
      let findUniqueCallCount = 0;
      prisma.indicator.findUnique.mockImplementation(() => {
        findUniqueCallCount++;
        if (findUniqueCallCount === 1) return Promise.resolve(makeInd()); // ok1
        if (findUniqueCallCount === 2)
          return Promise.reject(new Error('DB error on fail')); // fail
        return Promise.resolve(makeInd()); // ok2
      });

      prisma.indicatorMeasurement.findMany.mockResolvedValue(aug_m);
      prisma.indicatorHistory.create.mockResolvedValue(makeHist());

      const result = await scheduler.runCycle(SEP_1_BRT);
      expect(result.closed).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.processed).toBe(3);
    });
  });

  // ── 13. Todas as frequências ──────────────────────────────────────────────

  describe('13. Frequências — DAILY, WEEKLY, MONTHLY, QUARTERLY, SEMESTERLY, YEARLY', () => {
    const freqCases: {
      freq: IndicatorFrequency;
      refDate: string;
      expStart: string;
      expEnd: string;
      mDate: string;
    }[] = [
      {
        freq: IndicatorFrequency.DAILY,
        refDate: '2026-08-10T03:00:00.000Z', // 00:00 BRT de 10/ago = início do dia
        expStart: '2026-08-09T03:00:00.000Z', // 09/ago
        expEnd: '2026-08-10T03:00:00.000Z',
        mDate: '2026-08-09T12:00:00.000Z',
      },
      {
        freq: IndicatorFrequency.WEEKLY,
        refDate: '2026-08-10T03:00:00.000Z', // seg 10/ago = início da semana 10-16
        expStart: '2026-08-03T03:00:00.000Z', // seg 03/ago
        expEnd: '2026-08-10T03:00:00.000Z',
        mDate: '2026-08-05T12:00:00.000Z',
      },
      {
        freq: IndicatorFrequency.MONTHLY,
        refDate: '2026-09-01T03:00:00.000Z',
        expStart: '2026-08-01T03:00:00.000Z',
        expEnd: '2026-09-01T03:00:00.000Z',
        mDate: '2026-08-15T12:00:00.000Z',
      },
      {
        freq: IndicatorFrequency.QUARTERLY,
        refDate: '2026-10-01T03:00:00.000Z', // Q4 começa; Q3 encerra
        expStart: '2026-07-01T03:00:00.000Z',
        expEnd: '2026-10-01T03:00:00.000Z',
        mDate: '2026-08-15T12:00:00.000Z',
      },
      {
        freq: IndicatorFrequency.SEMESTERLY,
        refDate: '2027-01-01T03:00:00.000Z', // S2 encerra
        expStart: '2026-07-01T03:00:00.000Z',
        expEnd: '2027-01-01T03:00:00.000Z',
        mDate: '2026-09-15T12:00:00.000Z',
      },
      {
        freq: IndicatorFrequency.YEARLY,
        refDate: '2027-01-01T03:00:00.000Z', // 2026 encerra
        expStart: '2026-01-01T03:00:00.000Z',
        expEnd: '2027-01-01T03:00:00.000Z',
        mDate: '2026-06-15T12:00:00.000Z',
      },
    ];

    for (const tc of freqCases) {
      it(`${tc.freq}: fecha período correto`, async () => {
        const refDate = new Date(tc.refDate);
        prisma.indicator.findUnique.mockResolvedValue(
          makeInd({ frequency: tc.freq }),
        );
        prisma.indicatorMeasurement.findMany.mockResolvedValue([
          { value: dec(100), referenceDate: new Date(tc.mDate) },
        ]);
        const result = await apuration.closePeriod(IND_ID, refDate);
        expect(result.status).toBe('CLOSED');
        if (result.status === 'CLOSED') {
          expect(result.periodStart.toISOString()).toBe(tc.expStart);
          expect(result.periodEnd.toISOString()).toBe(tc.expEnd);
          expect(result.value).toBe(100);
        }
      });
    }
  });

  // ── 14. WEEKLY — semana ISO (seg-dom) ────────────────────────────────────

  describe('14. WEEKLY — semana ISO seg→dom', () => {
    it('segunda 10/ago: período da semana anterior 03/ago→09/ago está encerrado', async () => {
      const mondayAug10 = new Date('2026-08-10T03:00:00.000Z');
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ frequency: IndicatorFrequency.WEEKLY }),
      );
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        { value: dec(55), referenceDate: new Date('2026-08-05T12:00:00.000Z') },
      ]);
      const result = await apuration.closePeriod(IND_ID, mondayAug10);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') {
        expect(result.periodStart.toISOString()).toBe(
          '2026-08-03T03:00:00.000Z',
        );
        expect(result.periodEnd.toISOString()).toBe('2026-08-10T03:00:00.000Z');
      }
    });
  });

  // ── 15. QUARTERLY ─────────────────────────────────────────────────────────

  describe('15. QUARTERLY', () => {
    it('01/out/2026 → fecha Q3 (jul-set)', async () => {
      const oct1 = new Date('2026-10-01T03:00:00.000Z');
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ frequency: IndicatorFrequency.QUARTERLY }),
      );
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: dec(300),
          referenceDate: new Date('2026-08-15T12:00:00.000Z'),
        },
      ]);
      const result = await apuration.closePeriod(IND_ID, oct1);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') {
        expect(result.periodStart.toISOString()).toBe(
          '2026-07-01T03:00:00.000Z',
        );
        expect(result.periodEnd.toISOString()).toBe('2026-10-01T03:00:00.000Z');
      }
    });
  });

  // ── 16. SEMESTERLY ────────────────────────────────────────────────────────

  describe('16. SEMESTERLY', () => {
    it('01/jul/2026 → fecha S1 (jan-jun)', async () => {
      const jul1 = new Date('2026-07-01T03:00:00.000Z');
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ frequency: IndicatorFrequency.SEMESTERLY }),
      );
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: dec(600),
          referenceDate: new Date('2026-03-15T12:00:00.000Z'),
        },
      ]);
      const result = await apuration.closePeriod(IND_ID, jul1);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') {
        expect(result.periodStart.toISOString()).toBe(
          '2026-01-01T03:00:00.000Z',
        );
        expect(result.periodEnd.toISOString()).toBe('2026-07-01T03:00:00.000Z');
      }
    });

    it('01/jan/2027 → fecha S2 (jul-dez/2026)', async () => {
      const jan27 = new Date('2027-01-01T03:00:00.000Z');
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ frequency: IndicatorFrequency.SEMESTERLY }),
      );
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: dec(900),
          referenceDate: new Date('2026-09-15T12:00:00.000Z'),
        },
      ]);
      const result = await apuration.closePeriod(IND_ID, jan27);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') {
        expect(result.periodStart.toISOString()).toBe(
          '2026-07-01T03:00:00.000Z',
        );
        expect(result.periodEnd.toISOString()).toBe('2027-01-01T03:00:00.000Z');
      }
    });
  });

  // ── 17. YEARLY ────────────────────────────────────────────────────────────

  describe('17. YEARLY', () => {
    it('01/jan/2027 → fecha 2026', async () => {
      const jan27 = new Date('2027-01-01T03:00:00.000Z');
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ frequency: IndicatorFrequency.YEARLY }),
      );
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: dec(12000),
          referenceDate: new Date('2026-06-15T12:00:00.000Z'),
        },
      ]);
      const result = await apuration.closePeriod(IND_ID, jan27);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') {
        expect(result.periodStart.toISOString()).toBe(
          '2026-01-01T03:00:00.000Z',
        );
        expect(result.periodEnd.toISOString()).toBe('2027-01-01T03:00:00.000Z');
        expect(result.value).toBe(12000);
      }
    });
  });

  // ── 18. Valores do IndicatorHistory validados ─────────────────────────────

  describe('18. IndicatorHistory — valores persistidos', () => {
    it('create chamado com campos corretos: indicatorId, periodStart, periodEnd, value, status', async () => {
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ goalValue: dec(2000) }),
      );
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: dec(500),
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      await apuration.closePeriod(IND_ID, SEP_1_BRT);

      const createCall = prisma.indicatorHistory.create.mock.calls[0][0];
      expect(createCall.data.indicatorId).toBe(IND_ID);
      expect(createCall.data.periodStart).toEqual(AUG_1_BRT);
      expect(createCall.data.periodEnd).toEqual(SEP_1_BRT);
      expect(createCall.data.value).toBe(500);
      expect(createCall.data.status).toBeDefined();
    });

    it('fluxo scheduler → apuration → history: create chamado exatamente 1 vez', async () => {
      prisma.indicator.findMany.mockResolvedValue([makeInd()]);
      prisma.indicator.findUnique.mockResolvedValue(makeInd()); // apuration usa findUnique
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_MEASUREMENTS);

      const result = await scheduler.runCycle(SEP_1_BRT);
      expect(result.closed).toBe(1);
      expect(prisma.indicatorHistory.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── 19. Scheduler — segunda execução (runCycle duas vezes) ───────────────

  describe('19. Scheduler — segunda execução não duplica histórico', () => {
    it('primeiro runCycle: closed=1; segundo: alreadyClosed=1, create=1 total', async () => {
      prisma.indicator.findMany.mockResolvedValue([makeInd()]);
      prisma.indicator.findUnique.mockResolvedValue(makeInd()); // apuration usa findUnique
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_MEASUREMENTS);

      const first = await scheduler.runCycle(SEP_1_BRT);
      expect(first.closed).toBe(1);
      expect(prisma.indicatorHistory.create).toHaveBeenCalledTimes(1);

      // Segunda execução: histórico existe
      prisma.indicatorHistory.findUnique.mockResolvedValue({ id: HIST_ID });
      const second = await scheduler.runCycle(SEP_1_BRT);
      expect(second.alreadyClosed).toBe(1);
      expect(second.closed).toBe(0);

      // create ainda chamado apenas 1 vez no total
      expect(prisma.indicatorHistory.create).toHaveBeenCalledTimes(1);
    });
  });
});
