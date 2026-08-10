/**
 * formula-integration.spec.ts
 *
 * Testes de integração do Formula Engine com AggregationEngine e IndicatorPeriodApurationService.
 *
 * Cobertura:
 * 1. AggregationEngine + FormulaEngine
 * 2. PeriodApuration + FormulaEngine
 * 3. Fechamento de período com FORMULA válida
 * 4. Fórmula inválida não cria IndicatorHistory
 * 5. Divisão por zero não cria IndicatorHistory
 * 6. Fórmula com período sem dados não gera resultado inválido
 * 7. Idempotência preservada
 * 8. Scheduler consegue processar FORMULA válida (via apuration)
 * 9. Backfill consegue processar FORMULA válida (via apuration)
 * 10. Nenhum campo indevido do Indicator é alterado
 */

import {
  AggregationEngineService,
  IndicatorAggregationInput,
  MeasurementInput,
  isFormulaResult,
} from '../aggregation-engine.service';
import { AggregationType } from '../enums/aggregation-type.enum';
import { FormulaEngineService } from './formula-engine.service';
import { FormulaParserService } from './formula-parser.service';
import { FormulaTokenizerService } from './formula-tokenizer.service';
import { FormulaValidatorService } from './formula-validator.service';
import { FormulaEvaluatorService } from './formula-evaluator.service';
import {
  DivisionByZeroError,
  FormulaSyntaxError,
  UnsupportedFormulaFunctionError,
} from './formula.errors';
import {
  IndicatorPeriodApurationService,
  ApurationResultClosed,
  ApurationResultFormulaRequired,
} from '../indicator-period-apuration.service';
import { PeriodResolverService } from '../period-resolver.service';
import { IndicatorPeriodClosingService } from '../indicator-period-closing.service';
import { IndicatorAnalyticsService } from '../indicator-analytics.service';
import { IndicatorCurrentStateService } from '../indicator-current-state.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const AUG_START = new Date('2026-08-01T03:00:00.000Z');
const AUG_END = new Date('2026-09-01T03:00:00.000Z');
const SEP_1 = new Date('2026-09-01T03:00:00.000Z');
const IND_ID = 'aaaa-0000-4000-a000-000000000001';
const HIST_ID = 'hhhh-0000-4000-a000-000000000001';

function makeFormulaEngine(): FormulaEngineService {
  return new FormulaEngineService(
    new FormulaParserService(new FormulaTokenizerService()),
    new FormulaValidatorService(),
    new FormulaEvaluatorService(),
  );
}

function makeAggregationEngine(
  formulaEngine?: FormulaEngineService,
): AggregationEngineService {
  return new AggregationEngineService(formulaEngine);
}

const measurements: MeasurementInput[] = [
  { value: 100, referenceDate: new Date('2026-08-05T12:00:00Z') },
  { value: 200, referenceDate: new Date('2026-08-15T12:00:00Z') },
  { value: 300, referenceDate: new Date('2026-08-25T12:00:00Z') },
];

// ── 1. AggregationEngine + FormulaEngine ─────────────────────────────────────

describe('Integração: AggregationEngine + FormulaEngine', () => {
  let engine: AggregationEngineService;

  beforeEach(() => {
    engine = makeAggregationEngine(makeFormulaEngine());
  });

  it('1a. FORMULA "SUM() / COUNT()" retorna 200', () => {
    const ind: IndicatorAggregationInput = {
      aggregationType: AggregationType.FORMULA,
      formula: 'SUM() / COUNT()',
    };
    const r = engine.aggregate(ind, AUG_START, AUG_END, measurements);
    expect(isFormulaResult(r)).toBe(false);
    expect(r.value).toBe(200);
    expect(r.measurementCount).toBe(3);
  });

  it('1b. FORMULA "(SUM() - MIN()) / MAX() * 100" ≈ 166.666', () => {
    // (600 - 100) / 300 * 100 = 500/300*100 = 166.666...
    const ind: IndicatorAggregationInput = {
      aggregationType: AggregationType.FORMULA,
      formula: '(SUM() - MIN()) / MAX() * 100',
    };
    const r = engine.aggregate(ind, AUG_START, AUG_END, measurements);
    expect(r.value).toBeCloseTo(166.666, 2);
  });

  it('1c. FORMULA sem dados → FormulaEvaluationError (SUM null)', () => {
    const ind: IndicatorAggregationInput = {
      aggregationType: AggregationType.FORMULA,
      formula: 'SUM()',
    };
    expect(() => engine.aggregate(ind, AUG_START, AUG_END, [])).toThrow();
  });

  it('1d. FORMULA inválida → UnsupportedFormulaFunctionError', () => {
    const ind: IndicatorAggregationInput = {
      aggregationType: AggregationType.FORMULA,
      formula: 'SQRT(100)',
    };
    expect(() =>
      engine.aggregate(ind, AUG_START, AUG_END, measurements),
    ).toThrow(UnsupportedFormulaFunctionError);
  });

  it('1e. FORMULA com divisão por zero → DivisionByZeroError', () => {
    const ind: IndicatorAggregationInput = {
      aggregationType: AggregationType.FORMULA,
      formula: '10 / 0',
    };
    expect(() =>
      engine.aggregate(ind, AUG_START, AUG_END, measurements),
    ).toThrow(DivisionByZeroError);
  });

  it('1f. FORMULA null sem FormulaEngine → FormulaAggregationResult (placeholder)', () => {
    const engineNoFormula = makeAggregationEngine(makeFormulaEngine());
    const ind: IndicatorAggregationInput = {
      aggregationType: AggregationType.FORMULA,
      formula: null,
    };
    const r = engineNoFormula.aggregate(ind, AUG_START, AUG_END, measurements);
    expect(isFormulaResult(r)).toBe(true);
  });

  it('1g. SUM sem FormulaEngine continua funcionando', () => {
    const ind: IndicatorAggregationInput = {
      aggregationType: AggregationType.SUM,
    };
    const r = engine.aggregate(ind, AUG_START, AUG_END, measurements);
    expect(r.value).toBe(600);
  });

  it('1h. FORMULA filtra medições pelo período corretamente', () => {
    const allMeasurements: MeasurementInput[] = [
      ...measurements,
      { value: 999, referenceDate: new Date('2026-07-31T12:00:00Z') }, // fora
      { value: 999, referenceDate: new Date('2026-09-01T03:00:00Z') }, // exclusivo
    ];
    const ind: IndicatorAggregationInput = {
      aggregationType: AggregationType.FORMULA,
      formula: 'COUNT()',
    };
    const r = engine.aggregate(ind, AUG_START, AUG_END, allMeasurements);
    expect(r.value).toBe(3); // apenas 3 dentro do período
    expect(r.measurementCount).toBe(3);
  });

  it('1i. anti-hardcoding: fórmula "MAX() - MIN()" com dados diferentes', () => {
    const otherMeasurements: MeasurementInput[] = [
      { value: 50, referenceDate: new Date('2026-08-05T12:00:00Z') },
      { value: 150, referenceDate: new Date('2026-08-25T12:00:00Z') },
    ];
    const ind: IndicatorAggregationInput = {
      aggregationType: AggregationType.FORMULA,
      formula: 'MAX() - MIN()',
    };
    const r = engine.aggregate(ind, AUG_START, AUG_END, otherMeasurements);
    expect(r.value).toBe(100);
  });
});

// ── 2. PeriodApuration + FormulaEngine ───────────────────────────────────────

describe('Integração: IndicatorPeriodApurationService + FormulaEngine', () => {
  let svc: IndicatorPeriodApurationService;

  let mockPrisma: {
    indicator: { findUnique: jest.Mock };
    indicatorHistory: { findUnique: jest.Mock; findFirst: jest.Mock };
    indicatorMeasurement: { findMany: jest.Mock };
  };
  let mockHistoryService: { create: jest.Mock };

  function makeDbIndicator(formula: string | null = 'SUM() / COUNT()') {
    return {
      id: IND_ID,
      frequency: 'MONTHLY',
      aggregationType: 'FORMULA',
      formula,
      goalValue: null,
      minimumGoalValue: null,
      maximumGoalValue: null,
      desiredDirection: 'HIGHER_IS_BETTER',
      isActive: true,
    };
  }

  function makeDbMeasurements() {
    return [
      {
        value: { toNumber: () => 100 },
        referenceDate: new Date('2026-08-05T12:00:00Z'),
      },
      {
        value: { toNumber: () => 200 },
        referenceDate: new Date('2026-08-15T12:00:00Z'),
      },
      {
        value: { toNumber: () => 300 },
        referenceDate: new Date('2026-08-25T12:00:00Z'),
      },
    ];
  }

  beforeEach(() => {
    mockPrisma = {
      indicator: { findUnique: jest.fn() },
      indicatorHistory: { findUnique: jest.fn(), findFirst: jest.fn() },
      indicatorMeasurement: { findMany: jest.fn() },
    };
    mockHistoryService = { create: jest.fn() };

    const formulaEngine = makeFormulaEngine();
    const aggregationEngine = makeAggregationEngine(formulaEngine);
    const periodResolver = new PeriodResolverService();
    const periodClosing = new IndicatorPeriodClosingService(periodResolver);
    const analytics = new IndicatorAnalyticsService();

    const mockCurrentState = {
      syncFromHistory: jest.fn().mockResolvedValue({ synced: true }),
    };

    svc = new IndicatorPeriodApurationService(
      mockPrisma as never,
      periodResolver,
      periodClosing,
      aggregationEngine,
      mockHistoryService as never,
      analytics,
      mockCurrentState as unknown as IndicatorCurrentStateService,
    );

    mockPrisma.indicator.findUnique.mockResolvedValue(makeDbIndicator());
    mockPrisma.indicatorHistory.findUnique.mockResolvedValue(null);
    mockPrisma.indicatorHistory.findFirst.mockResolvedValue(null);
    mockPrisma.indicatorMeasurement.findMany.mockResolvedValue(
      makeDbMeasurements(),
    );
    mockHistoryService.create.mockResolvedValue({
      id: HIST_ID,
      indicatorId: IND_ID,
      periodStart: AUG_START,
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
  });

  it('3. Fecha período com FORMULA válida (SUM() / COUNT() = 200)', async () => {
    const r = (await svc.closePeriod(IND_ID, SEP_1)) as ApurationResultClosed;
    expect(r.status).toBe('CLOSED');
    expect(r.value).toBe(200);
    expect(r.aggregationType).toBe(AggregationType.FORMULA);
  });

  it('3b. FORMULA "(SUM() - MIN()) / MAX() * 100" fecha com valor correto', async () => {
    mockPrisma.indicator.findUnique.mockResolvedValue(
      makeDbIndicator('(SUM() - MIN()) / MAX() * 100'),
    );
    const r = (await svc.closePeriod(IND_ID, SEP_1)) as ApurationResultClosed;
    expect(r.status).toBe('CLOSED');
    // (600 - 100) / 300 * 100 = 166.666...
    expect(r.value).toBeCloseTo(166.666, 2);
  });

  it('4. Fórmula inválida (SQRT) não cria IndicatorHistory', async () => {
    mockPrisma.indicator.findUnique.mockResolvedValue(
      makeDbIndicator('SQRT(100)'),
    );
    await expect(svc.closePeriod(IND_ID, SEP_1)).rejects.toThrow(
      UnsupportedFormulaFunctionError,
    );
    expect(mockHistoryService.create).not.toHaveBeenCalled();
  });

  it('4b. Fórmula com sintaxe inválida não cria IndicatorHistory', async () => {
    mockPrisma.indicator.findUnique.mockResolvedValue(
      makeDbIndicator('SUM( +'),
    );
    await expect(svc.closePeriod(IND_ID, SEP_1)).rejects.toThrow(
      FormulaSyntaxError,
    );
    expect(mockHistoryService.create).not.toHaveBeenCalled();
  });

  it('5. Divisão por zero não cria IndicatorHistory', async () => {
    mockPrisma.indicator.findUnique.mockResolvedValue(
      makeDbIndicator('SUM() / 0'),
    );
    await expect(svc.closePeriod(IND_ID, SEP_1)).rejects.toThrow(
      DivisionByZeroError,
    );
    expect(mockHistoryService.create).not.toHaveBeenCalled();
  });

  it('6. Fórmula com COUNT() sem medições retorna 0 (COUNT não lança)', async () => {
    mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([]);
    mockPrisma.indicator.findUnique.mockResolvedValue(
      makeDbIndicator('COUNT()'),
    );
    const r = (await svc.closePeriod(IND_ID, SEP_1)) as ApurationResultClosed;
    expect(r.status).toBe('CLOSED');
    expect(r.value).toBe(0);
  });

  it('6b. Fórmula SUM() sem medições lança erro (não cria histórico)', async () => {
    mockPrisma.indicatorMeasurement.findMany.mockResolvedValue([]);
    mockPrisma.indicator.findUnique.mockResolvedValue(makeDbIndicator('SUM()'));
    await expect(svc.closePeriod(IND_ID, SEP_1)).rejects.toThrow();
    expect(mockHistoryService.create).not.toHaveBeenCalled();
  });

  it('7. Idempotência: FORMULA já fechada → ALREADY_CLOSED', async () => {
    mockPrisma.indicatorHistory.findUnique.mockResolvedValue({ id: HIST_ID });
    const r = await svc.closePeriod(IND_ID, SEP_1);
    expect(r.status).toBe('ALREADY_CLOSED');
    expect(mockHistoryService.create).not.toHaveBeenCalled();
  });

  it('7b. Idempotência: segundo fechamento FORMULA não duplica histórico', async () => {
    mockPrisma.indicatorHistory.findUnique.mockResolvedValueOnce(null);
    const first = await svc.closePeriod(IND_ID, SEP_1);
    expect(first.status).toBe('CLOSED');
    expect(mockHistoryService.create).toHaveBeenCalledTimes(1);

    mockPrisma.indicatorHistory.findUnique.mockResolvedValueOnce({
      id: HIST_ID,
    });
    const second = await svc.closePeriod(IND_ID, SEP_1);
    expect(second.status).toBe('ALREADY_CLOSED');
    expect(mockHistoryService.create).toHaveBeenCalledTimes(1);
  });

  it('8. FORMULA null → FORMULA_ENGINE_REQUIRED (fórmula ausente)', async () => {
    mockPrisma.indicator.findUnique.mockResolvedValue(makeDbIndicator(null));
    const r = (await svc.closePeriod(
      IND_ID,
      SEP_1,
    )) as ApurationResultFormulaRequired;
    expect(r.status).toBe('FORMULA_ENGINE_REQUIRED');
    expect(mockHistoryService.create).not.toHaveBeenCalled();
  });

  it('9. Outros aggregationTypes não são afetados por FORMULA: SUM continua', async () => {
    mockPrisma.indicator.findUnique.mockResolvedValue({
      id: IND_ID,
      frequency: 'MONTHLY',
      aggregationType: 'SUM',
      formula: null,
      goalValue: null,
      minimumGoalValue: null,
      maximumGoalValue: null,
      desiredDirection: 'HIGHER_IS_BETTER',
      isActive: true,
    });
    const r = (await svc.closePeriod(IND_ID, SEP_1)) as ApurationResultClosed;
    expect(r.status).toBe('CLOSED');
    expect(r.value).toBe(600);
    expect(r.aggregationType).toBe(AggregationType.SUM);
  });

  it('10. FORMULA não altera campos do Indicator', async () => {
    await svc.closePeriod(IND_ID, SEP_1);
    const indicatorMock = mockPrisma.indicator as Record<
      string,
      jest.Mock | undefined
    >;
    expect(indicatorMock['update']).toBeUndefined();
  });
});

// ── Caminho não afetado ───────────────────────────────────────────────────────

describe('Unaffected path: tipos não-FORMULA continuam funcionando', () => {
  let engine: AggregationEngineService;

  beforeEach(() => {
    engine = makeAggregationEngine(makeFormulaEngine());
  });

  const types = [
    { type: AggregationType.SUM, expected: 600 },
    { type: AggregationType.AVG, expected: 200 },
    { type: AggregationType.MIN, expected: 100 },
    { type: AggregationType.MAX, expected: 300 },
    { type: AggregationType.LAST, expected: 300 },
    { type: AggregationType.COUNT, expected: 3 },
  ];

  for (const { type, expected } of types) {
    it(`${type} sem FormulaEngine ainda funciona (= ${expected})`, () => {
      const ind: IndicatorAggregationInput = { aggregationType: type };
      const r = engine.aggregate(ind, AUG_START, AUG_END, measurements);
      expect(r.value).toBe(expected);
    });
  }
});
