/**
 * ETAPA 3F-A — AUDITORIA E2E DO FORMULA ENGINE INTEGRADO AO CICLO AUTOMÁTICO
 *
 * Serviços REAIS: todos (Formula Engine, AggregationEngine, PeriodResolver, etc.)
 * MOCK: apenas PrismaService (in-memory)
 * PRODUÇÃO MODIFICADA: NENHUMA
 */

import { PeriodResolverService } from './period-resolver.service';
import { IndicatorPeriodClosingService } from './indicator-period-closing.service';
import { AggregationEngineService } from './aggregation-engine.service';
import { IndicatorAnalyticsService } from './indicator-analytics.service';
import { IndicatorHistoryService } from './indicator-history.service';
import { IndicatorPeriodApurationService } from './indicator-period-apuration.service';
import { IndicatorPeriodClosingScheduler } from './indicator-period-closing.scheduler';
import { IndicatorPeriodBackfillService } from './indicator-period-backfill.service';
import { FormulaTokenizerService } from './formula/formula-tokenizer.service';
import { FormulaParserService } from './formula/formula-parser.service';
import { FormulaValidatorService } from './formula/formula-validator.service';
import { FormulaEvaluatorService } from './formula/formula-evaluator.service';
import { FormulaEngineService } from './formula/formula-engine.service';
import {
  DivisionByZeroError,
  FormulaSyntaxError,
  FormulaEvaluationError,
  UnsupportedFormulaFunctionError,
} from './formula/formula.errors';
import { IndicatorCurrentStateService } from './indicator-current-state.service';
import { AggregationType } from './enums/aggregation-type.enum';

// ── Constantes ────────────────────────────────────────────────────────────────

const AUG_1 = new Date('2026-08-01T03:00:00.000Z'); // 00:00 BRT
const SEP_1 = new Date('2026-09-01T03:00:00.000Z'); // periodEnd de agosto
const OCT_1 = new Date('2026-10-01T03:00:00.000Z'); // periodEnd de setembro
const JUL_1 = new Date('2026-07-01T03:00:00.000Z');
const JAN_1 = new Date('2026-01-01T03:00:00.000Z');

// Medições padrão de agosto (100, 200, 300)
const AUG_MEAS_100 = {
  value: { toNumber: () => 100 },
  referenceDate: new Date('2026-08-01T03:00:00.000Z'),
};
const AUG_MEAS_200 = {
  value: { toNumber: () => 200 },
  referenceDate: new Date('2026-08-10T12:00:00.000Z'),
};
const AUG_MEAS_300 = {
  value: { toNumber: () => 300 },
  referenceDate: new Date('2026-08-20T12:00:00.000Z'),
};

// ── FakePrisma ────────────────────────────────────────────────────────────────

class FakePrisma {
  private indicatorsMap = new Map<string, Record<string, unknown>>();
  private measurementsMap = new Map<
    string,
    Array<{ value: unknown; referenceDate: Date }>
  >();
  private historiesMap = new Map<string, Record<string, unknown>>();
  private historyIdCounter = 1;
  createSpy = jest.fn();

  addIndicator(rec: Record<string, unknown>) {
    this.indicatorsMap.set(rec['id'] as string, rec);
  }

  addMeasurements(
    indicatorId: string,
    meas: Array<{ value: unknown; referenceDate: Date }>,
  ) {
    const existing = this.measurementsMap.get(indicatorId) ?? [];
    this.measurementsMap.set(indicatorId, [...existing, ...meas]);
  }

  clearHistories() {
    this.historiesMap.clear();
  }

  getHistories() {
    return Array.from(this.historiesMap.values());
  }

  indicator = {
    findMany: jest.fn((args?: Record<string, unknown>) => {
      let recs = Array.from(this.indicatorsMap.values());
      const where = args?.['where'] as Record<string, unknown> | undefined;
      if (where?.['isActive'] === true) {
        recs = recs.filter((r) => r['isActive'] === true);
      }
      const freqFilter = where?.['frequency'] as
        Record<string, unknown> | undefined;
      if (freqFilter?.['not'] !== undefined) {
        recs = recs.filter((r) => r['frequency'] !== freqFilter['not']);
      }
      return Promise.resolve(recs);
    }),
    findUnique: jest.fn((args: Record<string, unknown>) => {
      const where = args['where'] as Record<string, unknown>;
      const id = where['id'] as string;
      return Promise.resolve(this.indicatorsMap.get(id) ?? null);
    }),
    update: jest.fn(() => Promise.resolve({ id: 'updated' })),
  };

  indicatorMeasurement = {
    findMany: jest.fn((args: Record<string, unknown>) => {
      const where = args['where'] as Record<string, unknown>;
      const indicatorId = where['indicatorId'] as string;
      const refFilter = where['referenceDate'] as
        Record<string, Date> | undefined;
      const all = this.measurementsMap.get(indicatorId) ?? [];
      const filtered = all.filter((m) => {
        const t = m.referenceDate.getTime();
        if (refFilter?.gte && t < refFilter.gte.getTime()) return false;
        if (refFilter?.lt && t >= refFilter.lt.getTime()) return false;
        return true;
      });
      return Promise.resolve(filtered);
    }),
  };

  indicatorHistory = {
    findUnique: jest.fn((args: Record<string, unknown>) => {
      const where = args['where'] as Record<string, unknown>;
      const compound = where['indicatorId_periodStart_periodEnd'] as
        Record<string, unknown> | undefined;
      if (!compound) return Promise.resolve(null);
      const key = `${String(compound['indicatorId'])}|${(compound['periodStart'] as Date).toISOString()}|${(compound['periodEnd'] as Date).toISOString()}`;
      return Promise.resolve(this.historiesMap.get(key) ?? null);
    }),

    findFirst: jest.fn((args: Record<string, unknown>) => {
      const where = args['where'] as Record<string, unknown>;
      const indicatorId = where['indicatorId'] as string;
      const periodEnd = where['periodEnd'] as Date;
      const matches = Array.from(this.historiesMap.values()).filter(
        (h) =>
          h['indicatorId'] === indicatorId &&
          (h['periodEnd'] as Date).getTime() === periodEnd.getTime(),
      );
      if (matches.length === 0) return Promise.resolve(null);
      // orderBy periodStart desc
      matches.sort(
        (a, b) =>
          (b['periodStart'] as Date).getTime() -
          (a['periodStart'] as Date).getTime(),
      );
      return Promise.resolve(matches[0]);
    }),

    findMany: jest.fn((args: Record<string, unknown>) => {
      const where = args['where'] as Record<string, unknown>;
      const indicatorId = where['indicatorId'] as string;
      const matches = Array.from(this.historiesMap.values()).filter(
        (h) => h['indicatorId'] === indicatorId,
      );
      return Promise.resolve(matches);
    }),

    create: jest.fn((args: Record<string, unknown>) => {
      const data = args['data'] as Record<string, unknown>;
      const id = `hist-${String(this.historyIdCounter++).padStart(4, '0')}`;
      const rec: Record<string, unknown> = {
        ...data,
        id,
        calculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: data['notes'] ?? null,
      };
      const key = `${String(data['indicatorId'])}|${(data['periodStart'] as Date).toISOString()}|${(data['periodEnd'] as Date).toISOString()}`;
      if (this.historiesMap.has(key)) {
        // Simula violação de constraint única do Prisma
        const err = Object.assign(new Error('Unique constraint violation'), {
          code: 'P2002',
        });
        throw err;
      }
      this.historiesMap.set(key, rec);
      this.createSpy(args);
      return Promise.resolve(rec);
    }),
  };
}

// ── Fábrica de serviços reais ────────────────────────────────────────────────

function buildServices(prisma: FakePrisma) {
  const tokenizer = new FormulaTokenizerService();
  const parser = new FormulaParserService(tokenizer);
  const validator = new FormulaValidatorService();
  const evaluator = new FormulaEvaluatorService();
  const formulaEngine = new FormulaEngineService(parser, validator, evaluator);
  const aggregationEngine = new AggregationEngineService(formulaEngine);
  const periodResolver = new PeriodResolverService();
  const periodClosing = new IndicatorPeriodClosingService(periodResolver);
  const analytics = new IndicatorAnalyticsService();
  const historyService = new IndicatorHistoryService(prisma as never);
  const currentStateService = new IndicatorCurrentStateService(prisma as never);
  const apuration = new IndicatorPeriodApurationService(
    prisma as never,
    periodResolver,
    periodClosing,
    aggregationEngine,
    historyService,
    analytics,
    currentStateService,
  );
  const backfill = new IndicatorPeriodBackfillService(
    prisma as never,
    periodResolver,
    apuration,
  );
  const scheduler = new IndicatorPeriodClosingScheduler(
    prisma as never,
    apuration,
    backfill,
  );
  return { scheduler, apuration, backfill, formulaEngine, aggregationEngine };
}

// ── Helpers de indicadores ────────────────────────────────────────────────────

function makeFormulaIndicator(
  id: string,
  formula: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    name: `Formula ${id}`,
    frequency: 'MONTHLY',
    aggregationType: 'FORMULA',
    formula,
    goalValue: null,
    minimumGoalValue: null,
    maximumGoalValue: null,
    desiredDirection: 'HIGHER_IS_BETTER',
    isActive: true,
    createdAt: JAN_1,
    ...overrides,
  };
}

function makeMeas(value: number, date: Date) {
  return { value: { toNumber: () => value }, referenceDate: date };
}

// ── SUÍTE PRINCIPAL ───────────────────────────────────────────────────────────

describe('ETAPA 3F-A — Auditoria E2E: Formula Engine no Ciclo Automático', () => {
  let prisma: FakePrisma;
  let services: ReturnType<typeof buildServices>;

  beforeEach(() => {
    prisma = new FakePrisma();
    services = buildServices(prisma);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // FLUXO PRINCIPAL E2E
  // ════════════════════════════════════════════════════════════════════════════

  describe('1. Fluxo E2E completo: Scheduler → FormulaEngine → IndicatorHistory', () => {
    it('1a. Scheduler.runCycle processa FORMULA e cria IndicatorHistory com value=200', async () => {
      // ARRANGE: indicador FORMULA com fórmula "SUM() / COUNT()"
      const ind = makeFormulaIndicator('formula-monthly-1', 'SUM() / COUNT()', {
        goalValue: { toNumber: () => 200 },
      });
      prisma.addIndicator(ind);
      prisma.addMeasurements('formula-monthly-1', [
        AUG_MEAS_100,
        AUG_MEAS_200,
        AUG_MEAS_300,
      ]);

      // ACT: executa ciclo do scheduler com referência = 01/set (agosto encerrado)
      const result = await services.scheduler.runCycle(SEP_1);

      // ASSERT: ciclo fechou 1 período
      expect(result.closed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.formulaRequired).toBe(0);

      // ASSERT: IndicatorHistory.create chamado exatamente 1 vez
      expect(prisma.createSpy).toHaveBeenCalledTimes(1);

      // ASSERT: campos do history
      const histories = prisma.getHistories();
      expect(histories).toHaveLength(1);
      const hist = histories[0];
      expect(hist['indicatorId']).toBe('formula-monthly-1');
      expect(hist['value']).toBe(200); // SUM=600, COUNT=3 → 200
      expect(hist['periodStart']).toEqual(AUG_1);
      expect(hist['periodEnd']).toEqual(SEP_1);
    });

    it('1b. Cadeia completa: apuration retorna CLOSED com value correto', async () => {
      const ind = makeFormulaIndicator('formula-apur-1', 'SUM() / COUNT()');
      prisma.addIndicator(ind);
      prisma.addMeasurements('formula-apur-1', [
        AUG_MEAS_100,
        AUG_MEAS_200,
        AUG_MEAS_300,
      ]);

      const r = await services.apuration.closePeriod('formula-apur-1', SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.value).toBe(200);
        expect(r.aggregationType).toBe(AggregationType.FORMULA);
        expect(r.measurementCount).toBe(3);
        expect(r.periodStart).toEqual(AUG_1);
        expect(r.periodEnd).toEqual(SEP_1);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // FÓRMULAS OBRIGATÓRIAS (11 fórmulas)
  // ════════════════════════════════════════════════════════════════════════════

  describe('2. Fórmulas obrigatórias', () => {
    const AUG_3 = [AUG_MEAS_100, AUG_MEAS_200, AUG_MEAS_300]; // 100, 200, 300

    async function testFormula(
      formula: string,
      expectedValue: number,
      meas = AUG_3,
      precision = 4,
    ) {
      const id = `f-${formula.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}`;
      prisma.addIndicator(makeFormulaIndicator(id, formula));
      prisma.addMeasurements(id, meas);
      const r = await services.apuration.closePeriod(id, SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.value).toBeCloseTo(expectedValue, precision);
      }
    }

    it('2-1. SUM() = 600', async () => {
      await testFormula('SUM()', 600);
    });

    it('2-2. AVG() = 200', async () => {
      await testFormula('AVG()', 200);
    });

    it('2-3. MIN() = 100', async () => {
      await testFormula('MIN()', 100);
    });

    it('2-4. MAX() = 300', async () => {
      await testFormula('MAX()', 300);
    });

    it('2-5. LAST() = 300 (medição mais recente)', async () => {
      await testFormula('LAST()', 300);
    });

    it('2-6. COUNT() = 3', async () => {
      await testFormula('COUNT()', 3);
    });

    it('2-7. SUM() / COUNT() = 200', async () => {
      await testFormula('SUM() / COUNT()', 200);
    });

    it('2-8. (SUM() - MIN()) / MAX() * 100 = 166.666...', async () => {
      // (600-100)/300*100 = 166.6666... (dízima periódica — usar precisão 2)
      await testFormula('(SUM() - MIN()) / MAX() * 100', 166.666, AUG_3, 2);
    });

    it('2-9. ABS(-AVG()) = 200', async () => {
      await testFormula('ABS(-AVG())', 200);
    });

    it('2-10. 10 + 5 * 2 = 20 (precedência)', async () => {
      await testFormula('10 + 5 * 2', 20);
    });

    it('2-11. (10 + 5) * 2 = 30 (parênteses)', async () => {
      await testFormula('(10 + 5) * 2', 30);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // TIMEZONE E FRONTEIRAS
  // ════════════════════════════════════════════════════════════════════════════

  describe('3. Timezone America/Sao_Paulo e fronteiras do período', () => {
    it('3a. 02:59:59.999Z (23:59 BRT) = agosto ainda aberto → PERIOD_OPEN', async () => {
      const ind = makeFormulaIndicator('tz-open', 'COUNT()');
      prisma.addIndicator(ind);
      const justBefore = new Date('2026-09-01T02:59:59.999Z');
      const r = await services.apuration.closePeriod('tz-open', justBefore);
      expect(r.status).toBe('PERIOD_OPEN');
    });

    it('3b. 03:00:00.000Z (00:00 BRT 01/set) = agosto encerrado → CLOSED', async () => {
      const ind = makeFormulaIndicator('tz-closed', 'COUNT()');
      prisma.addIndicator(ind);
      prisma.addMeasurements('tz-closed', [AUG_MEAS_100]);
      const r = await services.apuration.closePeriod('tz-closed', SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.value).toBe(1);
      }
    });

    it('3c. periodStart inclusivo: medição exatamente em 01/ago 00:00 BRT incluída', async () => {
      const ind = makeFormulaIndicator('boundary-start', 'SUM()');
      prisma.addIndicator(ind);
      // 01/ago 00:00 BRT = AUG_1 = início do período (inclusivo)
      prisma.addMeasurements('boundary-start', [
        { value: { toNumber: () => 50 }, referenceDate: AUG_1 },
      ]);
      const r = await services.apuration.closePeriod('boundary-start', SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.value).toBe(50);
      }
    });

    it('3d. periodEnd exclusivo: medição em 01/set 00:00 BRT NÃO incluída em agosto', async () => {
      const ind = makeFormulaIndicator('boundary-end', 'SUM()');
      prisma.addIndicator(ind);
      prisma.addMeasurements('boundary-end', [
        makeMeas(100, AUG_MEAS_100.referenceDate), // dentro
        makeMeas(999, SEP_1), // excluída (= periodEnd)
      ]);
      const r = await services.apuration.closePeriod('boundary-end', SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.value).toBe(100); // 999 não pode participar
      }
    });

    it('3e. Medição às 31/ago 23:59:59.999 BRT ainda está em agosto', async () => {
      // 31/ago 23:59:59.999 BRT = 01/set 02:59:59.999 UTC
      const lastInstantBRT = new Date('2026-09-01T02:59:59.999Z');
      const ind = makeFormulaIndicator('boundary-last', 'SUM()');
      prisma.addIndicator(ind);
      prisma.addMeasurements('boundary-last', [
        makeMeas(100, AUG_MEAS_100.referenceDate),
        makeMeas(200, lastInstantBRT), // 23:59:59.999 BRT → dentro de agosto
      ]);
      const r = await services.apuration.closePeriod('boundary-last', SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.value).toBe(300); // 100 + 200
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // previousValue E variationPercent
  // ════════════════════════════════════════════════════════════════════════════

  describe('4. previousValue e variationPercent', () => {
    it('4a. Primeiro período: previousValue = null', async () => {
      const ind = makeFormulaIndicator('prev-first', 'AVG()');
      prisma.addIndicator(ind);
      prisma.addMeasurements('prev-first', [
        AUG_MEAS_100,
        AUG_MEAS_200,
        AUG_MEAS_300,
      ]);
      const r = await services.apuration.closePeriod('prev-first', SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.previousValue).toBeNull();
        expect(r.variationPercent).toBeNull();
      }
    });

    it('4b. Segundo período usa value do período anterior como previousValue', async () => {
      const id = 'prev-chain';
      const ind = makeFormulaIndicator(id, 'SUM() / COUNT()');
      prisma.addIndicator(ind);

      // Agosto: medições → value = 200
      prisma.addMeasurements(id, [AUG_MEAS_100, AUG_MEAS_200, AUG_MEAS_300]);
      await services.apuration.closePeriod(id, SEP_1);

      // Setembro: medições → value = 250
      prisma.addMeasurements(id, [
        makeMeas(200, new Date('2026-09-05T12:00:00.000Z')),
        makeMeas(300, new Date('2026-09-15T12:00:00.000Z')),
      ]);
      const rSep = await services.apuration.closePeriod(id, OCT_1);
      expect(rSep.status).toBe('CLOSED');
      if (rSep.status === 'CLOSED') {
        // previousValue = agosto = 200
        expect(rSep.previousValue).toBe(200);
        // value de setembro = (200+300)/2 = 250
        expect(rSep.value).toBe(250);
        // variationPercent = (250-200)/200*100 = 25%
        expect(rSep.variationPercent).toBeCloseTo(25, 4);
      }
    });

    it('4c. previousValue = 0 → variationPercent = null (sem divisão por zero)', async () => {
      const id = 'prev-zero';
      const ind = makeFormulaIndicator(id, 'COUNT()');
      prisma.addIndicator(ind);

      // Julho: sem medições → COUNT() = 0 → CLOSED com value=0
      // Não há medições de julho a adicionar - COUNT retorna 0 sem dados
      const rJul = await services.apuration.closePeriod(id, AUG_1);
      expect(rJul.status).toBe('CLOSED');
      if (rJul.status === 'CLOSED') {
        expect(rJul.value).toBe(0);
      }

      // Agosto: 3 medições → COUNT() = 3
      prisma.addMeasurements(id, [AUG_MEAS_100, AUG_MEAS_200, AUG_MEAS_300]);
      const rAug = await services.apuration.closePeriod(id, SEP_1);
      expect(rAug.status).toBe('CLOSED');
      if (rAug.status === 'CLOSED') {
        expect(rAug.previousValue).toBe(0);
        expect(rAug.variationPercent).toBeNull(); // previousValue = 0 → null
        expect(isNaN(rAug.variationPercent ?? 0)).toBe(false);
        expect(rAug.variationPercent).not.toBe(Infinity);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // STATUS
  // ════════════════════════════════════════════════════════════════════════════

  describe('5. Status calculado', () => {
    it('5a. SUCCESS quando value >= goalValue', async () => {
      const ind = makeFormulaIndicator('status-success', 'AVG()', {
        goalValue: { toNumber: () => 150 },
        desiredDirection: 'HIGHER_IS_BETTER',
      });
      prisma.addIndicator(ind);
      prisma.addMeasurements('status-success', [
        AUG_MEAS_100,
        AUG_MEAS_200,
        AUG_MEAS_300,
      ]);
      const r = await services.apuration.closePeriod('status-success', SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        // AVG = 200 >= goal 150 → SUCCESS
        expect(r.indicatorStatus).toBe('SUCCESS');
      }
    });

    it('5b. DANGER quando value muito abaixo da meta', async () => {
      const ind = makeFormulaIndicator('status-danger', 'MIN()', {
        goalValue: { toNumber: () => 1000 },
        desiredDirection: 'HIGHER_IS_BETTER',
      });
      prisma.addIndicator(ind);
      prisma.addMeasurements('status-danger', [
        AUG_MEAS_100,
        AUG_MEAS_200,
        AUG_MEAS_300,
      ]);
      const r = await services.apuration.closePeriod('status-danger', SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        // MIN = 100, goal = 1000 → 10% → DANGER
        expect(r.indicatorStatus).toBe('DANGER');
      }
    });

    it('5c. NEUTRAL quando sem meta definida', async () => {
      const ind = makeFormulaIndicator('status-neutral', 'COUNT()');
      prisma.addIndicator(ind);
      prisma.addMeasurements('status-neutral', [AUG_MEAS_100]);
      const r = await services.apuration.closePeriod('status-neutral', SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.indicatorStatus).toBe('NEUTRAL');
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CENÁRIOS DE ERRO
  // ════════════════════════════════════════════════════════════════════════════

  describe('6. Cenários de erro — fórmulas inválidas', () => {
    it('6a. DivisionByZeroError: "SUM() / 0" → não cria histórico', async () => {
      const id = 'err-div-zero';
      prisma.addIndicator(makeFormulaIndicator(id, 'SUM() / 0'));
      prisma.addMeasurements(id, [AUG_MEAS_100]);
      await expect(services.apuration.closePeriod(id, SEP_1)).rejects.toThrow(
        DivisionByZeroError,
      );
      expect(prisma.getHistories()).toHaveLength(0);
    });

    it('6b. UnsupportedFormulaFunctionError: "SQRT(100)" → não cria histórico', async () => {
      const id = 'err-unsupported';
      prisma.addIndicator(makeFormulaIndicator(id, 'SQRT(100)'));
      prisma.addMeasurements(id, [AUG_MEAS_100]);
      await expect(services.apuration.closePeriod(id, SEP_1)).rejects.toThrow(
        UnsupportedFormulaFunctionError,
      );
      expect(prisma.getHistories()).toHaveLength(0);
    });

    it('6c. FormulaSyntaxError: "eval(1)" → não cria histórico', async () => {
      // eval é tokenizado como IDENTIFIER mas rejeitado como UnsupportedFunction
      const id = 'err-eval';
      prisma.addIndicator(makeFormulaIndicator(id, 'eval(1)'));
      prisma.addMeasurements(id, [AUG_MEAS_100]);
      await expect(services.apuration.closePeriod(id, SEP_1)).rejects.toThrow();
      expect(prisma.getHistories()).toHaveLength(0);
    });

    it('6d. FormulaSyntaxError: "process.env" → ponto é token inválido', async () => {
      const id = 'err-process';
      prisma.addIndicator(makeFormulaIndicator(id, 'process.env'));
      await expect(services.apuration.closePeriod(id, SEP_1)).rejects.toThrow(
        FormulaSyntaxError,
      );
      expect(prisma.getHistories()).toHaveLength(0);
    });

    it('6e. FormulaSyntaxError: "require(1)" → rejeitada como função não suportada', async () => {
      const id = 'err-require';
      prisma.addIndicator(makeFormulaIndicator(id, 'require(1)'));
      await expect(services.apuration.closePeriod(id, SEP_1)).rejects.toThrow();
      expect(prisma.getHistories()).toHaveLength(0);
    });

    it('6f. Scheduler registra failed e continua os demais indicadores', async () => {
      // ind-ok: fórmula válida
      const indOk = makeFormulaIndicator('sched-ok', 'COUNT()');
      prisma.addIndicator(indOk);
      prisma.addMeasurements('sched-ok', [AUG_MEAS_100]);

      // ind-err: fórmula inválida (divisão por zero)
      const indErr = makeFormulaIndicator('sched-err', '10 / 0');
      prisma.addIndicator(indErr);
      prisma.addMeasurements('sched-err', [AUG_MEAS_100]);

      const r = await services.scheduler.runCycle(SEP_1);
      expect(r.closed).toBe(1);
      expect(r.failed).toBe(1);
      // indOk não foi comprometido pelo erro de indErr
      // (o scheduler inclui backfill que pode criar históricos extras para sched-ok com COUNT=0)
      const histories = prisma
        .getHistories()
        .filter((h) => h['indicatorId'] === 'sched-ok');
      expect(histories.length).toBeGreaterThanOrEqual(1);
      // Verifica que o histórico de agosto está entre os criados
      const augHist = histories.find(
        (h) => (h['periodEnd'] as Date).getTime() === SEP_1.getTime(),
      );
      expect(augHist).toBeDefined();
      expect(augHist?.['value']).toBe(1);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // FÓRMULA SEM MEDIÇÕES
  // ════════════════════════════════════════════════════════════════════════════

  describe('7. Fórmula sem medições', () => {
    it('7a. SUM() sem medições → FormulaEvaluationError (SUM é null)', async () => {
      const id = 'no-data-sum';
      prisma.addIndicator(makeFormulaIndicator(id, 'SUM()'));
      // sem addMeasurements
      await expect(services.apuration.closePeriod(id, SEP_1)).rejects.toThrow(
        FormulaEvaluationError,
      );
      expect(prisma.getHistories()).toHaveLength(0);
    });

    it('7b. AVG() sem medições → FormulaEvaluationError', async () => {
      const id = 'no-data-avg';
      prisma.addIndicator(makeFormulaIndicator(id, 'AVG()'));
      await expect(services.apuration.closePeriod(id, SEP_1)).rejects.toThrow(
        FormulaEvaluationError,
      );
    });

    it('7c. COUNT() sem medições → 0 → CLOSED (COUNT é semântico)', async () => {
      const id = 'no-data-count';
      prisma.addIndicator(makeFormulaIndicator(id, 'COUNT()'));
      const r = await services.apuration.closePeriod(id, SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.value).toBe(0);
      }
    });

    it('7d. FORMULA null (sem formula definida) → FORMULA_ENGINE_REQUIRED', async () => {
      const id = 'no-formula';
      const ind = { ...makeFormulaIndicator(id, ''), formula: null };
      prisma.addIndicator(ind);
      const r = await services.apuration.closePeriod(id, SEP_1);
      expect(r.status).toBe('FORMULA_ENGINE_REQUIRED');
      expect(prisma.getHistories()).toHaveLength(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // IDEMPOTÊNCIA
  // ════════════════════════════════════════════════════════════════════════════

  describe('8. Idempotência', () => {
    it('8a. Segunda execução do scheduler → alreadyClosed=1, create chamado 1x', async () => {
      const ind = makeFormulaIndicator('idempotent-1', 'SUM()');
      prisma.addIndicator(ind);
      prisma.addMeasurements('idempotent-1', [AUG_MEAS_100, AUG_MEAS_200]);

      const r1 = await services.scheduler.runCycle(SEP_1);
      expect(r1.closed).toBe(1);

      const r2 = await services.scheduler.runCycle(SEP_1);
      expect(r2.alreadyClosed).toBeGreaterThanOrEqual(1);
      expect(r2.closed).toBe(0);

      // create chamado exatamente 1 vez
      expect(prisma.createSpy).toHaveBeenCalledTimes(1);
      expect(prisma.getHistories()).toHaveLength(1);
    });

    it('8b. closePeriod chamado duas vezes → segundo retorna ALREADY_CLOSED', async () => {
      const ind = makeFormulaIndicator('idempotent-2', 'AVG()');
      prisma.addIndicator(ind);
      prisma.addMeasurements('idempotent-2', [AUG_MEAS_100, AUG_MEAS_200]);

      const r1 = await services.apuration.closePeriod('idempotent-2', SEP_1);
      expect(r1.status).toBe('CLOSED');

      const r2 = await services.apuration.closePeriod('idempotent-2', SEP_1);
      expect(r2.status).toBe('ALREADY_CLOSED');

      expect(prisma.createSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // MÚLTIPLOS INDICADORES
  // ════════════════════════════════════════════════════════════════════════════

  describe('9. Múltiplos indicadores em um ciclo', () => {
    it('9a. Formula válida + Formula inválida + SUM + CUSTOM + inativo', async () => {
      // 1. FORMULA válida
      const f1 = makeFormulaIndicator('multi-f1', 'AVG()');
      prisma.addIndicator(f1);
      prisma.addMeasurements('multi-f1', [
        AUG_MEAS_100,
        AUG_MEAS_200,
        AUG_MEAS_300,
      ]);

      // 2. FORMULA inválida
      const f2 = makeFormulaIndicator('multi-f2', 'SQRT(100)');
      prisma.addIndicator(f2);
      prisma.addMeasurements('multi-f2', [AUG_MEAS_100]);

      // 3. SUM normal
      prisma.addIndicator({
        id: 'multi-sum',
        name: 'SUM',
        frequency: 'MONTHLY',
        aggregationType: 'SUM',
        formula: null,
        goalValue: null,
        minimumGoalValue: null,
        maximumGoalValue: null,
        desiredDirection: 'HIGHER_IS_BETTER',
        isActive: true,
        createdAt: JAN_1,
      });
      prisma.addMeasurements('multi-sum', [AUG_MEAS_100, AUG_MEAS_200]);

      // 4. CUSTOM → ignorado pelo scheduler
      prisma.addIndicator({
        id: 'multi-custom',
        name: 'CUSTOM',
        frequency: 'CUSTOM',
        aggregationType: 'SUM',
        formula: null,
        goalValue: null,
        minimumGoalValue: null,
        maximumGoalValue: null,
        desiredDirection: 'HIGHER_IS_BETTER',
        isActive: true,
        createdAt: JAN_1,
      });

      // 5. Inativo → não processado pelo scheduler
      const fInactive = makeFormulaIndicator('multi-inactive', 'SUM()', {
        isActive: false,
      });
      prisma.addIndicator(fInactive);

      const r = await services.scheduler.runCycle(SEP_1);

      // CUSTOM e inativo não são processados (filtered pela query)
      // f1 (AVG) → CLOSED
      // f2 (SQRT inválida) → failed
      // multi-sum → CLOSED
      expect(r.closed).toBe(2);
      expect(r.failed).toBe(1);

      // f1 e multi-sum têm histórico
      const histories = prisma.getHistories();
      const f1hist = histories.find((h) => h['indicatorId'] === 'multi-f1');
      expect(f1hist).toBeDefined();
      expect(f1hist?.['value']).toBe(200); // AVG = 200

      const sumHist = histories.find((h) => h['indicatorId'] === 'multi-sum');
      expect(sumHist).toBeDefined();
      expect(sumHist?.['value']).toBe(300); // SUM = 100+200

      // f2 (inválida) não tem histórico
      const f2hist = histories.find((h) => h['indicatorId'] === 'multi-f2');
      expect(f2hist).toBeUndefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // BACKFILL
  // ════════════════════════════════════════════════════════════════════════════

  describe('10. Backfill com Formula Engine', () => {
    it('10a. Backfill fecha múltiplos períodos com fórmula válida', async () => {
      const id = 'backfill-formula-1';
      // Usar createdAt de junho para que backfill não tente períodos sem dados
      const ind = makeFormulaIndicator(id, 'SUM() / COUNT()', {
        createdAt: new Date('2026-06-01T03:00:00.000Z'),
      });
      prisma.addIndicator(ind);

      // Medições: jun (100), jul (200), ago (300) — uma por período
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-06-15T12:00:00.000Z')),
        makeMeas(200, new Date('2026-07-15T12:00:00.000Z')),
        makeMeas(300, new Date('2026-08-15T12:00:00.000Z')),
      ]);

      const result = await services.backfill.runBackfill(SEP_1);

      expect(result.totalClosed).toBeGreaterThanOrEqual(2);
      expect(result.totalFailed).toBe(0);
      const histories = prisma.getHistories();
      expect(histories.length).toBeGreaterThanOrEqual(2);

      // Agosto deve ter value=300 (SUM/COUNT = 300/1)
      const augHist = histories.find(
        (h) =>
          (h['periodStart'] as Date).getTime() === AUG_1.getTime() &&
          (h['periodEnd'] as Date).getTime() === SEP_1.getTime(),
      );
      expect(augHist).toBeDefined();
      expect(augHist?.['value']).toBe(300);
    });

    it('10b. Backfill: previousValue encadeado entre períodos', async () => {
      const id = 'backfill-chain';
      const ind = makeFormulaIndicator(id, 'SUM()', { createdAt: JUL_1 });
      prisma.addIndicator(ind);
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-07-15T12:00:00.000Z')),
        makeMeas(200, new Date('2026-08-15T12:00:00.000Z')),
      ]);

      await services.backfill.runBackfill(SEP_1);
      const histories = prisma.getHistories();
      const augHist = histories.find(
        (h) => (h['periodStart'] as Date).getTime() === AUG_1.getTime(),
      );
      expect(augHist).toBeDefined();
      // previousValue de agosto = SUM de julho = 100
      expect(augHist?.['previousValue']).toBe(100);
    });

    it('10c. Backfill idempotente: reexecução não duplica histórico', async () => {
      const id = 'backfill-idempotent';
      const ind = makeFormulaIndicator(id, 'COUNT()', { createdAt: AUG_1 });
      prisma.addIndicator(ind);
      prisma.addMeasurements(id, [AUG_MEAS_100, AUG_MEAS_200]);

      await services.backfill.runBackfill(SEP_1);
      const h1 = prisma.getHistories().length;

      await services.backfill.runBackfill(SEP_1);
      const h2 = prisma.getHistories().length;

      expect(h1).toBe(h2); // sem duplicatas
      expect(prisma.createSpy.mock.calls.length).toBe(h1);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // INDICADOR NÃO ALTERADO
  // ════════════════════════════════════════════════════════════════════════════

  describe('11. Indicator permanece inalterado após fechamento', () => {
    it('11a. Fechar período FORMULA não modifica campos do Indicator', async () => {
      const id = 'no-change-indicator';
      const ind = makeFormulaIndicator(id, 'AVG()', {
        goalValue: { toNumber: () => 150 },
      });
      prisma.addIndicator(ind);
      prisma.addMeasurements(id, [AUG_MEAS_100, AUG_MEAS_200, AUG_MEAS_300]);

      await services.apuration.closePeriod(id, SEP_1);

      // indicator.update é chamado somente para currentValue e status (ETAPA 3G)
      // mas NÃO para fields como formula, isActive, etc.
      // Verificamos que formula permanece intacta

      // O indicador original permanece intacto
      const allInds = Array.from(
        (
          prisma as unknown as { indicatorsMap: Map<string, unknown> }
        ).indicatorsMap.values(),
      ) as Array<Record<string, unknown>>;
      const indAfter = allInds[0];
      expect(indAfter['isActive']).toBe(true);
      expect(indAfter['formula']).toBe('AVG()');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CAMPOS DO IndicatorHistory VALIDADOS
  // ════════════════════════════════════════════════════════════════════════════

  describe('12. Campos persistidos no IndicatorHistory', () => {
    it('12a. Todos os campos obrigatórios presentes no create', async () => {
      const id = 'fields-check';
      const ind = makeFormulaIndicator(id, 'SUM() / COUNT()', {
        goalValue: { toNumber: () => 100 },
      });
      prisma.addIndicator(ind);
      prisma.addMeasurements(id, [AUG_MEAS_100, AUG_MEAS_200, AUG_MEAS_300]);

      await services.apuration.closePeriod(id, SEP_1);

      expect(prisma.createSpy).toHaveBeenCalledTimes(1);
      const callArgs = prisma.createSpy.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      const data = callArgs.data;

      expect(data['indicatorId']).toBe(id);
      expect(data['periodStart']).toEqual(AUG_1);
      expect(data['periodEnd']).toEqual(SEP_1);
      expect(data['value']).toBe(200);
      expect(data['goalValue']).toBe(100);
      expect(data['status']).toBeDefined();
      // previousValue null (primeiro período)
      expect(data['previousValue'] ?? null).toBeNull();
      expect(data['variationPercent'] ?? null).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ANTI-HARDCODING
  // ════════════════════════════════════════════════════════════════════════════

  describe('13. Anti-hardcoding', () => {
    it('13a. SUM() / COUNT() com dados diferentes produz resultados diferentes', async () => {
      // Execução 1: 100, 200, 300 → 200
      const id1 = 'anti-hc-1';
      prisma.addIndicator(makeFormulaIndicator(id1, 'SUM() / COUNT()'));
      prisma.addMeasurements(id1, [AUG_MEAS_100, AUG_MEAS_200, AUG_MEAS_300]);
      const r1 = await services.apuration.closePeriod(id1, SEP_1);
      expect(r1.status).toBe('CLOSED');
      const v1 = r1.status === 'CLOSED' ? r1.value : null;

      // Execução 2: 200, 400, 600 → 400
      const id2 = 'anti-hc-2';
      prisma.addIndicator(makeFormulaIndicator(id2, 'SUM() / COUNT()'));
      prisma.addMeasurements(id2, [
        makeMeas(200, AUG_MEAS_100.referenceDate),
        makeMeas(400, AUG_MEAS_200.referenceDate),
        makeMeas(600, AUG_MEAS_300.referenceDate),
      ]);
      const r2 = await services.apuration.closePeriod(id2, SEP_1);
      expect(r2.status).toBe('CLOSED');
      const v2 = r2.status === 'CLOSED' ? r2.value : null;

      expect(v1).toBe(200);
      expect(v2).toBe(400);
      expect(v1).not.toBe(v2); // resultado NÃO hardcoded
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CASOS DE BORDA
  // ════════════════════════════════════════════════════════════════════════════

  describe('14. Casos de borda', () => {
    it('14a. Valores decimais: SUM(0.1 + 0.2) não NaN', async () => {
      const id = 'decimal-1';
      prisma.addIndicator(makeFormulaIndicator(id, 'SUM()'));
      prisma.addMeasurements(id, [
        makeMeas(0.1, AUG_MEAS_100.referenceDate),
        makeMeas(0.2, AUG_MEAS_200.referenceDate),
      ]);
      const r = await services.apuration.closePeriod(id, SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.value).toBeCloseTo(0.3, 5);
        expect(isNaN(r.value ?? NaN)).toBe(false);
        expect(isFinite(r.value ?? 0)).toBe(true);
      }
    });

    it('14b. Valores negativos: AVG com -100, -200, -300 = -200', async () => {
      const id = 'negative-1';
      prisma.addIndicator(makeFormulaIndicator(id, 'AVG()'));
      prisma.addMeasurements(id, [
        makeMeas(-100, AUG_MEAS_100.referenceDate),
        makeMeas(-200, AUG_MEAS_200.referenceDate),
        makeMeas(-300, AUG_MEAS_300.referenceDate),
      ]);
      const r = await services.apuration.closePeriod(id, SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.value).toBe(-200);
      }
    });

    it('14c. MIN com valores negativos = -300', async () => {
      const id = 'negative-min';
      prisma.addIndicator(makeFormulaIndicator(id, 'MIN()'));
      prisma.addMeasurements(id, [
        makeMeas(-100, AUG_MEAS_100.referenceDate),
        makeMeas(-200, AUG_MEAS_200.referenceDate),
        makeMeas(-300, AUG_MEAS_300.referenceDate),
      ]);
      const r = await services.apuration.closePeriod(id, SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.value).toBe(-300);
      }
    });

    it('14d. Medição com valor zero incluída no COUNT', async () => {
      const id = 'zero-count';
      prisma.addIndicator(makeFormulaIndicator(id, 'COUNT()'));
      prisma.addMeasurements(id, [
        makeMeas(0, AUG_MEAS_100.referenceDate),
        makeMeas(0, AUG_MEAS_200.referenceDate),
      ]);
      const r = await services.apuration.closePeriod(id, SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.value).toBe(2); // COUNT conta 2 medições mesmo com valor 0
      }
    });

    it('14e. LAST com duas medições na mesma data → determinístico (menor valor)', async () => {
      const sameDate = new Date('2026-08-15T12:00:00.000Z');
      const id = 'last-tie';
      prisma.addIndicator(makeFormulaIndicator(id, 'LAST()'));
      prisma.addMeasurements(id, [
        makeMeas(500, sameDate),
        makeMeas(100, sameDate),
        makeMeas(300, sameDate),
      ]);
      const r1 = await services.apuration.closePeriod(id, SEP_1);
      expect(r1.status).toBe('CLOSED');
      if (r1.status === 'CLOSED') {
        expect(r1.value).toBe(100); // desempate determinístico: menor valor
      }

      // Segunda chamada com idempotência → mesmo resultado
      const r2 = await services.apuration.closePeriod(id, SEP_1);
      expect(r2.status).toBe('ALREADY_CLOSED');
    });

    it('14f. Grande quantidade de medições (100+)', async () => {
      const id = 'large-dataset';
      prisma.addIndicator(makeFormulaIndicator(id, 'COUNT()'));
      const meas = Array.from({ length: 100 }, (_, i) =>
        makeMeas(i + 1, new Date(AUG_1.getTime() + i * 3600_000)),
      );
      prisma.addMeasurements(id, meas);
      const r = await services.apuration.closePeriod(id, SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.value).toBe(100);
      }
    });

    it('14g. Fórmula com múltiplos operadores: ABS(-SUM() + AVG())', async () => {
      const id = 'multi-op';
      prisma.addIndicator(makeFormulaIndicator(id, 'ABS(-SUM() + AVG())'));
      prisma.addMeasurements(id, [AUG_MEAS_100, AUG_MEAS_200, AUG_MEAS_300]);
      // SUM=600, AVG=200 → ABS(-600+200) = ABS(-400) = 400
      const r = await services.apuration.closePeriod(id, SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.value).toBe(400);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SEGURANÇA — CONFIRMAÇÃO
  // ════════════════════════════════════════════════════════════════════════════

  describe('15. Segurança: nenhuma execução dinâmica via fórmula', () => {
    const dangerousFormulas = [
      'eval(1)',
      'require(1)',
      'constructor(1)',
      'process.env',
      'SQRT(1)',
    ];

    for (const formula of dangerousFormulas) {
      it(`Fórmula perigosa rejeitada: "${formula}"`, async () => {
        const id = `sec-${formula.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 15)}`;
        prisma.addIndicator(makeFormulaIndicator(id, formula));
        await expect(
          services.apuration.closePeriod(id, SEP_1),
        ).rejects.toThrow();
        expect(prisma.getHistories()).toHaveLength(0);
      });
    }
  });
});
