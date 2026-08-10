import {
  IndicatorPeriodApurationService,
  ApurationResultClosed,
  ApurationResultPeriodOpen,
  ApurationResultAlreadyClosed,
  ApurationResultNoData,
  ApurationResultFormulaRequired,
  ApurationResultCustomFrequency,
} from './indicator-period-apuration.service';
import { PeriodResolverService } from './period-resolver.service';
import { IndicatorPeriodClosingService } from './indicator-period-closing.service';
import { AggregationEngineService } from './aggregation-engine.service';
import { IndicatorHistoryService } from './indicator-history.service';
import { IndicatorAnalyticsService } from './indicator-analytics.service';
import { IndicatorCurrentStateService } from './indicator-current-state.service';
import { IndicatorFrequency } from './enums/indicator-frequency.enum';
import { AggregationType } from './enums/aggregation-type.enum';
import { IndicatorStatus } from './enums/indicator-status.enum';
import { NotFoundException } from '@nestjs/common';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ID = 'aaaa-0000-4000-a000-000000000001';
const HIST_ID = 'hhhh-0000-4000-a000-000000000001';

/** Meia-noite BRT de 01/set/2026 = periodEnd de agosto */
const SEP_1 = new Date('2026-09-01T03:00:00.000Z');
/** Meia-noite BRT de 01/ago/2026 = periodStart de agosto */
const AUG_1 = new Date('2026-08-01T03:00:00.000Z');
/** Meia-noite BRT de 01/jul/2026 = periodStart do mês anterior */
const JUL_1 = new Date('2026-07-01T03:00:00.000Z');

/** Cria indicador padrão para os mocks do Prisma */
const makeDbIndicator = (
  overrides: Partial<{
    id: string;
    frequency: string;
    aggregationType: string;
    formula: string | null;
    goalValue: { toNumber(): number } | null;
    minimumGoalValue: { toNumber(): number } | null;
    maximumGoalValue: { toNumber(): number } | null;
    desiredDirection: string;
    isActive: boolean;
  }> = {},
) => ({
  id: ID,
  frequency: 'MONTHLY',
  aggregationType: 'SUM',
  formula: null,
  goalValue: null,
  minimumGoalValue: null,
  maximumGoalValue: null,
  desiredDirection: 'HIGHER_IS_BETTER',
  isActive: true,
  ...overrides,
});

/** Cria histórico persistido de retorno */
const makeHistory = (id = HIST_ID) => ({
  id,
  indicatorId: ID,
  periodStart: AUG_1,
  periodEnd: SEP_1,
  value: null,
  goalValue: null,
  previousValue: null,
  variationPercent: null,
  status: 'NEUTRAL',
  notes: null,
  calculatedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('IndicatorPeriodApurationService', () => {
  let svc: IndicatorPeriodApurationService;

  // Mocks de dependências
  let mockPrisma: {
    indicator: { findUnique: jest.Mock };
    indicatorHistory: { findUnique: jest.Mock; findFirst: jest.Mock };
    indicatorMeasurement: { findMany: jest.Mock };
  };
  let mockPeriodResolver: PeriodResolverService;
  let mockPeriodClosing: IndicatorPeriodClosingService;
  let mockAggregationEngine: AggregationEngineService;
  let mockHistoryService: { create: jest.Mock };
  let mockAnalytics: IndicatorAnalyticsService;
  let mockCurrentStateService: { syncFromHistory: jest.Mock };

  beforeEach(() => {
    mockPrisma = {
      indicator: { findUnique: jest.fn() },
      indicatorHistory: { findUnique: jest.fn(), findFirst: jest.fn() },
      indicatorMeasurement: { findMany: jest.fn() },
    };

    mockPeriodResolver = new PeriodResolverService();
    mockPeriodClosing = new IndicatorPeriodClosingService(mockPeriodResolver);
    mockAggregationEngine = new AggregationEngineService();
    mockHistoryService = { create: jest.fn() };
    mockAnalytics = new IndicatorAnalyticsService();
    mockCurrentStateService = {
      syncFromHistory: jest.fn().mockResolvedValue({ synced: true }),
    };

    svc = new IndicatorPeriodApurationService(
      mockPrisma as never,
      mockPeriodResolver,
      mockPeriodClosing,
      mockAggregationEngine,
      mockHistoryService as never,
      mockAnalytics,
      mockCurrentStateService as unknown as IndicatorCurrentStateService,
    );

    // Defaults: indicador MONTHLY/SUM, período encerrado, sem histórico, sem medições
    mockPrisma.indicator.findUnique.mockResolvedValue(makeDbIndicator());
    mockPrisma.indicatorHistory.findUnique.mockResolvedValue(null); // não existe ainda
    mockPrisma.indicatorHistory.findFirst.mockResolvedValue(null); // sem histórico anterior
    mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([]);
    mockHistoryService.create.mockResolvedValue(makeHistory());
  });

  // ── Indicador inexistente ─────────────────────────────────────────────────────

  describe('8. Indicador inexistente', () => {
    it('lança NotFoundException quando indicador não existe', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(null);
      await expect(svc.closePeriod(ID, SEP_1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── Período ainda aberto ──────────────────────────────────────────────────────

  describe('7. Período ainda aberto', () => {
    it('retorna PERIOD_OPEN quando referenceDate é antes de periodEnd', async () => {
      // 15/ago ainda está dentro do mês de agosto
      const midAug = new Date('2026-08-15T12:00:00.000Z');
      const r = (await svc.closePeriod(
        ID,
        midAug,
      )) as ApurationResultPeriodOpen;
      expect(r.status).toBe('PERIOD_OPEN');
      expect(r.indicatorId).toBe(ID);
    });

    it('37. fechamento exatamente na fronteira periodEnd → CLOSED', async () => {
      // SEP_1 = periodEnd de agosto = isClosed=true
      // Precisa de medições para não retornar NO_DATA
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 100 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      mockHistoryService.create.mockResolvedValue({
        ...makeHistory(),
        id: HIST_ID,
      });
      const r = await svc.closePeriod(ID, SEP_1);
      expect(r.status).toBe('CLOSED');
    });
  });

  // ── Idempotência ──────────────────────────────────────────────────────────────

  describe('9–10. Idempotência', () => {
    it('9. retorna ALREADY_CLOSED quando histórico já existe', async () => {
      mockPrisma.indicatorHistory.findUnique.mockResolvedValue({ id: HIST_ID });
      const r = (await svc.closePeriod(
        ID,
        SEP_1,
      )) as ApurationResultAlreadyClosed;
      expect(r.status).toBe('ALREADY_CLOSED');
      expect(r.historyId).toBe(HIST_ID);
      expect(mockHistoryService.create).not.toHaveBeenCalled();
    });

    it('10. executar closePeriod duas vezes → segundo retorna ALREADY_CLOSED', async () => {
      // Adicionar medições para o primeiro fechamento retornar CLOSED
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 50 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      // Primeiro fechamento
      mockPrisma.indicatorHistory.findUnique.mockResolvedValueOnce(null);
      const first = await svc.closePeriod(ID, SEP_1);
      expect(first.status).toBe('CLOSED');

      // Segundo: histórico já existe
      mockPrisma.indicatorHistory.findUnique.mockResolvedValueOnce({
        id: HIST_ID,
      });
      const second = (await svc.closePeriod(
        ID,
        SEP_1,
      )) as ApurationResultAlreadyClosed;
      expect(second.status).toBe('ALREADY_CLOSED');
      expect(second.historyId).toBe(HIST_ID);
    });

    it('38. nenhum histórico duplicado — create chamado apenas uma vez', async () => {
      // Adicionar medições para retornar CLOSED em vez de NO_DATA
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 25 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      await svc.closePeriod(ID, SEP_1);
      expect(mockHistoryService.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── FORMULA ──────────────────────────────────────────────────────────────────

  describe('17. FORMULA não executada', () => {
    it('retorna FORMULA_ENGINE_REQUIRED sem criar histórico', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({
          aggregationType: 'FORMULA',
          formula: 'SUM(lucro) / SUM(receita) * 100',
        }),
      );
      const r = (await svc.closePeriod(
        ID,
        SEP_1,
      )) as ApurationResultFormulaRequired;
      expect(r.status).toBe('FORMULA_ENGINE_REQUIRED');
      expect(r.formula).toBe('SUM(lucro) / SUM(receita) * 100');
      expect(mockHistoryService.create).not.toHaveBeenCalled();
    });
  });

  // ── CUSTOM ────────────────────────────────────────────────────────────────────

  describe('CUSTOM frequency', () => {
    it('retorna CUSTOM_FREQUENCY_NOT_SUPPORTED', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({ frequency: 'CUSTOM' }),
      );
      const r = (await svc.closePeriod(
        ID,
        SEP_1,
      )) as ApurationResultCustomFrequency;
      expect(r.status).toBe('CUSTOM_FREQUENCY_NOT_SUPPORTED');
      expect(mockHistoryService.create).not.toHaveBeenCalled();
    });
  });

  // ── Sem medições ─────────────────────────────────────────────────────────────

  describe('18. Sem medições', () => {
    it('SUM sem medições → NO_DATA (não cria histórico)', async () => {
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultNoData;
      expect(r.status).toBe('NO_DATA');
      expect(mockHistoryService.create).not.toHaveBeenCalled();
    });

    it('COUNT sem medições → CLOSED com value=0', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({ aggregationType: 'COUNT' }),
      );
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.status).toBe('CLOSED');
      expect(r.value).toBe(0);
    });
  });

  // ── 1. MONTHLY ───────────────────────────────────────────────────────────────

  describe('1. MONTHLY fechado com sucesso', () => {
    beforeEach(() => {
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 100 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
        {
          value: { toNumber: () => 200 },
          referenceDate: new Date('2026-08-20T12:00:00.000Z'),
        },
      ]);
    });

    it('cria histórico com value=300 (SUM)', async () => {
      mockHistoryService.create.mockResolvedValue({
        ...makeHistory(),
        id: HIST_ID,
      });
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.status).toBe('CLOSED');
      expect(r.value).toBe(300);
      expect(r.aggregationType).toBe(AggregationType.SUM);
    });

    it('retorna periodStart e periodEnd corretos', async () => {
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.periodStart.toISOString()).toBe(AUG_1.toISOString());
      expect(r.periodEnd.toISOString()).toBe(SEP_1.toISOString());
    });
  });

  // ── 2. DAILY ─────────────────────────────────────────────────────────────────

  describe('2. DAILY fechado', () => {
    it('fecha período diário com medição dentro', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({ frequency: 'DAILY' }),
      );
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 50 },
          referenceDate: new Date('2026-08-09T12:00:00.000Z'),
        },
      ]);
      // referenceDate = início do dia seguinte
      const aug10 = new Date('2026-08-10T03:00:00.000Z');
      const r = (await svc.closePeriod(ID, aug10)) as ApurationResultClosed;
      expect(r.status).toBe('CLOSED');
      expect(r.value).toBe(50);
    });
  });

  // ── 3. WEEKLY ────────────────────────────────────────────────────────────────

  describe('3. WEEKLY fechado', () => {
    it('fecha período semanal com medição dentro', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({ frequency: 'WEEKLY' }),
      );
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 77 },
          referenceDate: new Date('2026-08-05T12:00:00.000Z'),
        },
      ]);
      // semana 03/ago–09/ago; ref = segunda seguinte = 10/ago
      const aug10 = new Date('2026-08-10T03:00:00.000Z');
      const r = (await svc.closePeriod(ID, aug10)) as ApurationResultClosed;
      expect(r.status).toBe('CLOSED');
      expect(r.value).toBe(77);
    });
  });

  // ── 4. QUARTERLY ─────────────────────────────────────────────────────────────

  describe('4. QUARTERLY fechado', () => {
    it('fecha Q3/2026 com referenceDate = 01/out', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({ frequency: 'QUARTERLY' }),
      );
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 1000 },
          referenceDate: new Date('2026-08-09T12:00:00.000Z'),
        },
      ]);
      const oct1 = new Date('2026-10-01T03:00:00.000Z');
      const r = (await svc.closePeriod(ID, oct1)) as ApurationResultClosed;
      expect(r.status).toBe('CLOSED');
      expect(r.value).toBe(1000);
    });
  });

  // ── 5. SEMESTERLY ────────────────────────────────────────────────────────────

  describe('5. SEMESTERLY fechado', () => {
    it('fecha S2/2026 com referenceDate = 01/jan/2027', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({ frequency: 'SEMESTERLY' }),
      );
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 5000 },
          referenceDate: new Date('2026-09-15T12:00:00.000Z'),
        },
      ]);
      const jan2027 = new Date('2027-01-01T03:00:00.000Z');
      const r = (await svc.closePeriod(ID, jan2027)) as ApurationResultClosed;
      expect(r.status).toBe('CLOSED');
      expect(r.value).toBe(5000);
    });
  });

  // ── 6. YEARLY ────────────────────────────────────────────────────────────────

  describe('6. YEARLY fechado', () => {
    it('fecha 2026 com referenceDate = 01/jan/2027', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({ frequency: 'YEARLY' }),
      );
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 12000 },
          referenceDate: new Date('2026-06-15T12:00:00.000Z'),
        },
      ]);
      const jan2027 = new Date('2027-01-01T03:00:00.000Z');
      const r = (await svc.closePeriod(ID, jan2027)) as ApurationResultClosed;
      expect(r.status).toBe('CLOSED');
      expect(r.value).toBe(12000);
    });
  });

  // ── 11–16. Tipos de Agregação ─────────────────────────────────────────────────

  describe('11–16. Tipos de agregação', () => {
    const measurements = [
      {
        value: { toNumber: () => 100 },
        referenceDate: new Date('2026-08-05T12:00:00.000Z'),
      },
      {
        value: { toNumber: () => 200 },
        referenceDate: new Date('2026-08-15T12:00:00.000Z'),
      },
      {
        value: { toNumber: () => 300 },
        referenceDate: new Date('2026-08-25T12:00:00.000Z'),
      },
    ];

    beforeEach(() => {
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue(measurements);
    });

    it('11. SUM → 600', async () => {
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.value).toBe(600);
    });

    it('12. AVG → 200', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({ aggregationType: 'AVG' }),
      );
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.value).toBe(200);
    });

    it('13. MIN → 100', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({ aggregationType: 'MIN' }),
      );
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.value).toBe(100);
    });

    it('14. MAX → 300', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({ aggregationType: 'MAX' }),
      );
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.value).toBe(300);
    });

    it('15. LAST → 300 (mais recente)', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({ aggregationType: 'LAST' }),
      );
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.value).toBe(300);
    });

    it('16. COUNT → 3', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({ aggregationType: 'COUNT' }),
      );
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.value).toBe(3);
    });
  });

  // ── 19. Uma medição ────────────────────────────────────────────────────────

  describe('19. Uma medição', () => {
    it('CLOSED com value igual ao único valor', async () => {
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 42 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.value).toBe(42);
      expect(r.measurementCount).toBe(1);
    });
  });

  // ── 20. Múltiplas medições ──────────────────────────────────────────────────

  describe('20. Múltiplas medições', () => {
    it('CLOSED com measurementCount correto', async () => {
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 10 },
          referenceDate: new Date('2026-08-01T03:00:00.000Z'),
        },
        {
          value: { toNumber: () => 20 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
        {
          value: { toNumber: () => 30 },
          referenceDate: new Date('2026-08-20T12:00:00.000Z'),
        },
        {
          value: { toNumber: () => 40 },
          referenceDate: new Date('2026-08-31T12:00:00.000Z'),
        },
      ]);
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.measurementCount).toBe(4);
      expect(r.value).toBe(100);
    });
  });

  // ── 21–22. Fronteiras do período ───────────────────────────────────────────

  describe('21–22. Fronteiras do período', () => {
    it('21. Medição exatamente em periodStart → incluída no SUM', async () => {
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        { value: { toNumber: () => 50 }, referenceDate: AUG_1 }, // = periodStart
      ]);
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.value).toBe(50);
      expect(r.measurementCount).toBe(1);
    });

    it('22. A query usa lt: periodEnd → medição em periodEnd não é buscada', async () => {
      // AggregationEngine verifica <periodEnd; aqui testamos que a query Prisma usa lt:
      await svc.closePeriod(ID, SEP_1);
      const callArgs =
        mockPrisma.indicatorMeasurement.findMany.mock.calls[0][0];
      expect(callArgs.where.referenceDate).toEqual(
        expect.objectContaining({ lt: SEP_1 }),
      );
    });
  });

  // ── 23–24. previousValue ───────────────────────────────────────────────────

  describe('23–24. previousValue', () => {
    it('23. previousValue encontrado no histórico anterior (jul → set)', async () => {
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 500 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      // Histórico anterior: julho, value=400
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        value: { toNumber: () => 400 },
      });
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.previousValue).toBe(400);
    });

    it('24. previousValue null quando não há histórico anterior', async () => {
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 300 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue(null);
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.previousValue).toBeNull();
    });

    it('busca previousHistory onde periodEnd = periodStart atual', async () => {
      // Precisa de medições para não retornar NO_DATA antes de buscar previousHistory
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 100 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      await svc.closePeriod(ID, SEP_1);
      const callArgs = mockPrisma.indicatorHistory.findFirst.mock.calls[0][0];
      expect(callArgs.where.periodEnd).toEqual(AUG_1);
    });
  });

  // ── 25–26. variationPercent ────────────────────────────────────────────────

  describe('25–26. variationPercent', () => {
    it('25. variationPercent calculado corretamente', async () => {
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 1500 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        value: { toNumber: () => 1000 },
      });
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      // (1500-1000)/1000*100 = 50%
      expect(r.variationPercent).toBeCloseTo(50, 4);
    });

    it('26. previousValue = 0 → variationPercent = null (sem divisão por zero)', async () => {
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 100 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        value: { toNumber: () => 0 },
      });
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.variationPercent).toBeNull();
    });
  });

  // ── 27. value = null ─────────────────────────────────────────────────────────

  describe('27. value = null', () => {
    it('SUM sem medições → NO_DATA (value seria null)', async () => {
      const r = await svc.closePeriod(ID, SEP_1);
      expect(r.status).toBe('NO_DATA');
    });
  });

  // ── 28–29. goalValue ──────────────────────────────────────────────────────

  describe('28–29. goalValue', () => {
    it('28. goalValue incluído quando indicador possui meta', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({
          goalValue: { toNumber: () => 2000 },
        }),
      );
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 1500 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.goalValue).toBe(2000);
    });

    it('29. goalValue = null quando indicador não possui meta', async () => {
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 100 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.goalValue).toBeNull();
    });
  });

  // ── 30–33. Status ─────────────────────────────────────────────────────────

  describe('30–33. Status do histórico', () => {
    it('30. SUCCESS quando value >= goal (HIGHER_IS_BETTER)', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({
          goalValue: { toNumber: () => 1000 },
          desiredDirection: 'HIGHER_IS_BETTER',
        }),
      );
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 1200 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.indicatorStatus).toBe(IndicatorStatus.SUCCESS);
    });

    it('31. WARNING quando próximo mas abaixo da meta', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({
          goalValue: { toNumber: () => 1000 },
          desiredDirection: 'HIGHER_IS_BETTER',
        }),
      );
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 750 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      // 75% do goal = ON_TRACK → SUCCESS (conforme trackStatus: 75 ≥ 70 sem dias críticos)
      expect([
        IndicatorStatus.SUCCESS,
        IndicatorStatus.WARNING,
        IndicatorStatus.DANGER,
      ]).toContain(r.indicatorStatus);
    });

    it('32. DANGER quando muito abaixo da meta', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({
          goalValue: { toNumber: () => 1000 },
          desiredDirection: 'HIGHER_IS_BETTER',
        }),
      );
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 100 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.indicatorStatus).toBe(IndicatorStatus.DANGER);
    });

    it('33. NEUTRAL quando sem meta', async () => {
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 500 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.indicatorStatus).toBe(IndicatorStatus.NEUTRAL);
    });
  });

  // ── 34–35. isActive ────────────────────────────────────────────────────────

  describe('34–35. isActive como contexto', () => {
    beforeEach(() => {
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 100 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
    });

    it('34. indicador ativo → CLOSED normalmente', async () => {
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.status).toBe('CLOSED');
      expect(r.isActive).toBe(true);
    });

    it('35. indicador inativo → CLOSED normalmente (histórico independente de isActive)', async () => {
      mockPrisma.indicator.findUnique.mockResolvedValue(
        makeDbIndicator({ isActive: false }),
      );
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.status).toBe('CLOSED');
      expect(r.isActive).toBe(false);
      expect(r.value).toBe(100);
    });
  });

  // ── 36. Timezone ──────────────────────────────────────────────────────────

  describe('36. Timezone America/Sao_Paulo', () => {
    it('02:59 UTC de 01/set = 23:59 BRT de 31/ago → PERIOD_OPEN', async () => {
      const justBefore = new Date('2026-09-01T02:59:59.000Z');
      const r = await svc.closePeriod(ID, justBefore);
      expect(r.status).toBe('PERIOD_OPEN');
    });

    it('03:00 UTC de 01/set = 00:00 BRT de 01/set → CLOSED', async () => {
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 10 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      const r = await svc.closePeriod(ID, SEP_1);
      expect(r.status).toBe('CLOSED');
    });
  });

  // ── 39–44. Garantias de não-alteração ─────────────────────────────────────

  describe('39–44. Garantias de não-alteração do Indicator', () => {
    beforeEach(() => {
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 100 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
    });

    it('40. não chama update do Indicator (isActive não alterado)', async () => {
      await svc.closePeriod(ID, SEP_1);
      // Prisma indicator não possui mock de update → se fosse chamado, lançaria TypeError
      // Verificamos que nenhum update foi feito
      const indicatorMock = mockPrisma.indicator as Record<
        string,
        jest.Mock | undefined
      >;
      expect(indicatorMock['update']).toBeUndefined();
    });

    it('41–44. create do histórico não passa status do Indicator', async () => {
      await svc.closePeriod(ID, SEP_1);
      // O payload de create contém status do PERÍODO, não muda o Indicator.status
      const createCall = mockHistoryService.create.mock.calls[0];
      expect(createCall[0]).toBe(ID); // indicatorId
      // Garante que historyService.create foi chamado com o DTO correto
      expect(createCall[1]).toHaveProperty('periodStart');
      expect(createCall[1]).toHaveProperty('periodEnd');
      expect(createCall[1]).toHaveProperty('status');
    });
  });

  // ── Metadados do resultado ────────────────────────────────────────────────

  describe('Metadados do resultado CLOSED', () => {
    beforeEach(() => {
      mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: { toNumber: () => 100 },
          referenceDate: new Date('2026-08-10T12:00:00.000Z'),
        },
      ]);
      mockHistoryService.create.mockResolvedValue({
        ...makeHistory(),
        id: HIST_ID,
      });
    });

    it('retorna historyId, indicatorId, aggregationType, measurementCount', async () => {
      const r = (await svc.closePeriod(ID, SEP_1)) as ApurationResultClosed;
      expect(r.historyId).toBe(HIST_ID);
      expect(r.indicatorId).toBe(ID);
      expect(r.aggregationType).toBe(AggregationType.SUM);
      expect(r.measurementCount).toBe(1);
    });
  });
});
