/**
 * indicator-current-state.integration.spec.ts
 *
 * ETAPA 3G — Testes de integração: IndicatorCurrentStateService no ciclo automático.
 *
 * Valida que após um IndicatorHistory ser criado com sucesso:
 *   IndicatorHistory.value  → Indicator.currentValue
 *   IndicatorHistory.status → Indicator.status
 *
 * Serviços REAIS: todos
 * MOCK: PrismaService (in-memory)
 */

import { PeriodResolverService } from './period-resolver.service';
import { IndicatorPeriodClosingService } from './indicator-period-closing.service';
import { AggregationEngineService } from './aggregation-engine.service';
import { IndicatorAnalyticsService } from './indicator-analytics.service';
import { IndicatorHistoryService } from './indicator-history.service';
import { IndicatorCurrentStateService } from './indicator-current-state.service';
import { IndicatorPeriodApurationService } from './indicator-period-apuration.service';
import { IndicatorPeriodBackfillService } from './indicator-period-backfill.service';
import { FormulaTokenizerService } from './formula/formula-tokenizer.service';
import { FormulaParserService } from './formula/formula-parser.service';
import { FormulaValidatorService } from './formula/formula-validator.service';
import { FormulaEvaluatorService } from './formula/formula-evaluator.service';
import { FormulaEngineService } from './formula/formula-engine.service';
import { IndicatorStatus } from './enums/indicator-status.enum';
import { AggregationType } from './enums/aggregation-type.enum';

// ── Constantes ────────────────────────────────────────────────────────────────

const AUG_1 = new Date('2026-08-01T03:00:00.000Z');
const SEP_1 = new Date('2026-09-01T03:00:00.000Z');
const OCT_1 = new Date('2026-10-01T03:00:00.000Z');
const JAN_1 = new Date('2026-01-01T03:00:00.000Z');

// ── FakePrisma com rastreamento de indicator.update ──────────────────────────

class FakePrisma {
  private indicatorsMap = new Map<string, Record<string, unknown>>();
  private measurementsMap = new Map<
    string,
    Array<{ value: unknown; referenceDate: Date }>
  >();
  private historiesMap = new Map<string, Record<string, unknown>>();
  private historyCounter = 1;

  updateCalls: Array<{ id: string; data: Record<string, unknown> }> = [];

  addIndicator(rec: Record<string, unknown>) {
    this.indicatorsMap.set(rec['id'] as string, { ...rec });
  }

  addMeasurements(
    indicatorId: string,
    meas: Array<{ value: unknown; referenceDate: Date }>,
  ) {
    const existing = this.measurementsMap.get(indicatorId) ?? [];
    this.measurementsMap.set(indicatorId, [...existing, ...meas]);
  }

  getIndicator(id: string) {
    return this.indicatorsMap.get(id) ?? null;
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
    update: jest.fn((args: Record<string, unknown>) => {
      const where = args['where'] as Record<string, unknown>;
      const data = args['data'] as Record<string, unknown>;
      const id = where['id'] as string;
      this.updateCalls.push({ id, data });
      // Aplica o update ao mapa
      const existing = this.indicatorsMap.get(id);
      if (existing) {
        this.indicatorsMap.set(id, { ...existing, ...data });
      }
      return Promise.resolve({ id, ...data });
    }),
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
      return Promise.resolve(
        Array.from(this.historiesMap.values()).filter(
          (h) => h['indicatorId'] === indicatorId,
        ),
      );
    }),
    create: jest.fn((args: Record<string, unknown>) => {
      const data = args['data'] as Record<string, unknown>;
      const id = `hist-${String(this.historyCounter++).padStart(4, '0')}`;
      const rec = {
        ...data,
        id,
        calculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: data['notes'] ?? null,
      };
      const key = `${String(data['indicatorId'])}|${(data['periodStart'] as Date).toISOString()}|${(data['periodEnd'] as Date).toISOString()}`;
      if (this.historiesMap.has(key)) {
        throw Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      }
      this.historiesMap.set(key, rec);
      return Promise.resolve(rec);
    }),
  };
}

function buildServices(prisma: FakePrisma) {
  const formulaEngine = new FormulaEngineService(
    new FormulaParserService(new FormulaTokenizerService()),
    new FormulaValidatorService(),
    new FormulaEvaluatorService(),
  );
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
  return { apuration, backfill, currentStateService };
}

function makeIndicator(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: `Ind ${id}`,
    frequency: 'MONTHLY',
    aggregationType: 'SUM',
    formula: null,
    goalValue: null,
    minimumGoalValue: null,
    maximumGoalValue: null,
    desiredDirection: 'HIGHER_IS_BETTER',
    isActive: true,
    createdAt: JAN_1,
    currentValue: null,
    previousValue: null,
    variation: null,
    status: 'NEUTRAL',
    ...overrides,
  };
}

function m(value: number, date: Date) {
  return { value: { toNumber: () => value }, referenceDate: date };
}

// ── SUÍTE ─────────────────────────────────────────────────────────────────────

describe('ETAPA 3G — Integração: IndicatorCurrentStateService no ciclo', () => {
  let prisma: FakePrisma;
  let services: ReturnType<typeof buildServices>;

  beforeEach(() => {
    prisma = new FakePrisma();
    services = buildServices(prisma);
  });

  it('3G-1. SUM: currentValue = value do período fechado', async () => {
    const id = 'g1-sum';
    prisma.addIndicator(makeIndicator(id));
    prisma.addMeasurements(id, [
      m(100, new Date('2026-08-05T12:00:00Z')),
      m(200, new Date('2026-08-15T12:00:00Z')),
    ]);
    await services.apuration.closePeriod(id, SEP_1);
    const ind = prisma.getIndicator(id);
    expect(ind?.['currentValue']).toBe(300); // SUM = 100+200
  });

  it('3G-2. status do Indicator = status do IndicatorHistory', async () => {
    const id = 'g2-status';
    prisma.addIndicator(
      makeIndicator(id, {
        goalValue: { toNumber: () => 100 },
        desiredDirection: 'HIGHER_IS_BETTER',
      }),
    );
    prisma.addMeasurements(id, [m(200, new Date('2026-08-10T12:00:00Z'))]);
    await services.apuration.closePeriod(id, SEP_1);
    const ind = prisma.getIndicator(id);
    expect(ind?.['status']).toBe(IndicatorStatus.SUCCESS);
  });

  it('3G-3. FORMULA: currentValue = resultado da fórmula', async () => {
    const id = 'g3-formula';
    prisma.addIndicator(
      makeIndicator(id, {
        aggregationType: 'FORMULA',
        formula: 'SUM() / COUNT()',
      }),
    );
    prisma.addMeasurements(id, [
      m(100, new Date('2026-08-05T12:00:00Z')),
      m(200, new Date('2026-08-15T12:00:00Z')),
      m(300, new Date('2026-08-25T12:00:00Z')),
    ]);
    await services.apuration.closePeriod(id, SEP_1);
    const ind = prisma.getIndicator(id);
    expect(ind?.['currentValue']).toBe(200); // SUM=600, COUNT=3 → 200
  });

  it('3G-4. COUNT sem medições: currentValue = 0', async () => {
    const id = 'g4-count-zero';
    prisma.addIndicator(makeIndicator(id, { aggregationType: 'COUNT' }));
    await services.apuration.closePeriod(id, SEP_1);
    const ind = prisma.getIndicator(id);
    expect(ind?.['currentValue']).toBe(0);
  });

  it('3G-5. DANGER quando abaixo da meta', async () => {
    const id = 'g5-danger';
    prisma.addIndicator(
      makeIndicator(id, {
        goalValue: { toNumber: () => 1000 },
        desiredDirection: 'HIGHER_IS_BETTER',
      }),
    );
    prisma.addMeasurements(id, [m(50, new Date('2026-08-10T12:00:00Z'))]);
    await services.apuration.closePeriod(id, SEP_1);
    const ind = prisma.getIndicator(id);
    expect(ind?.['status']).toBe(IndicatorStatus.DANGER);
    expect(ind?.['currentValue']).toBe(50);
  });

  it('3G-6. Idempotência: segunda execução não atualiza currentValue novamente', async () => {
    const id = 'g6-idem';
    prisma.addIndicator(makeIndicator(id));
    prisma.addMeasurements(id, [m(100, new Date('2026-08-10T12:00:00Z'))]);
    await services.apuration.closePeriod(id, SEP_1); // 1st
    await services.apuration.closePeriod(id, SEP_1); // 2nd (ALREADY_CLOSED)
    // update chamado apenas 1x
    expect(prisma.updateCalls.filter((c) => c.id === id)).toHaveLength(1);
  });

  it('3G-7. update payload contém SOMENTE currentValue e status', async () => {
    const id = 'g7-payload';
    prisma.addIndicator(makeIndicator(id));
    prisma.addMeasurements(id, [m(250, new Date('2026-08-10T12:00:00Z'))]);
    await services.apuration.closePeriod(id, SEP_1);
    const updateCall = prisma.updateCalls.find((c) => c.id === id);
    expect(updateCall).toBeDefined();
    const keys = Object.keys(updateCall!.data);
    expect(keys).toHaveLength(2);
    expect(keys).toContain('currentValue');
    expect(keys).toContain('status');
    // Campos proibidos ausentes
    expect(keys).not.toContain('previousValue');
    expect(keys).not.toContain('variation');
    expect(keys).not.toContain('isActive');
    expect(keys).not.toContain('goalValue');
  });

  it('3G-8. currentValue = null quando SUM sem medições não cria history (NO_DATA)', async () => {
    const id = 'g8-no-data';
    prisma.addIndicator(makeIndicator(id)); // SUM, sem medições
    const r = await services.apuration.closePeriod(id, SEP_1);
    expect(r.status).toBe('NO_DATA');
    // Indicator.currentValue NÃO atualizado (IndicatorHistory não foi criado)
    const ind = prisma.getIndicator(id);
    expect(ind?.['currentValue']).toBeNull();
    expect(prisma.updateCalls.filter((c) => c.id === id)).toHaveLength(0);
  });

  it('3G-9. Backfill: currentValue = value do período mais recente', async () => {
    const id = 'g9-backfill';
    prisma.addIndicator(
      makeIndicator(id, {
        createdAt: new Date('2026-07-01T03:00:00.000Z'),
      }),
    );
    prisma.addMeasurements(id, [
      m(100, new Date('2026-07-15T12:00:00Z')),
      m(200, new Date('2026-08-15T12:00:00Z')),
    ]);
    await services.backfill.runBackfill(SEP_1);
    const ind = prisma.getIndicator(id);
    // O período mais recente (agosto) tem value=200
    expect(ind?.['currentValue']).toBe(200);
  });

  it('3G-10. Anti-hardcoding: currentValue reflete o valor real calculado', async () => {
    // Dois indicadores com valores diferentes
    const id1 = 'g10-a';
    const id2 = 'g10-b';
    prisma.addIndicator(makeIndicator(id1));
    prisma.addIndicator(makeIndicator(id2));
    prisma.addMeasurements(id1, [m(500, new Date('2026-08-10T12:00:00Z'))]);
    prisma.addMeasurements(id2, [m(1000, new Date('2026-08-10T12:00:00Z'))]);
    await services.apuration.closePeriod(id1, SEP_1);
    await services.apuration.closePeriod(id2, SEP_1);
    const ind1 = prisma.getIndicator(id1);
    const ind2 = prisma.getIndicator(id2);
    expect(ind1?.['currentValue']).toBe(500);
    expect(ind2?.['currentValue']).toBe(1000);
    expect(ind1?.['currentValue']).not.toBe(ind2?.['currentValue']);
  });

  it('3G-11. previousValue e variation NÃO são alterados (outros campos intactos)', async () => {
    const id = 'g11-immutable';
    prisma.addIndicator(
      makeIndicator(id, { previousValue: 999, variation: 55 }),
    );
    prisma.addMeasurements(id, [m(100, new Date('2026-08-10T12:00:00Z'))]);
    await services.apuration.closePeriod(id, SEP_1);
    const ind = prisma.getIndicator(id);
    // previousValue e variation NÃO alterados pelo syncFromHistory
    expect(ind?.['previousValue']).toBe(999);
    expect(ind?.['variation']).toBe(55);
  });

  it('3G-12. AVG: currentValue = AVG das medições', async () => {
    const id = 'g12-avg';
    prisma.addIndicator(makeIndicator(id, { aggregationType: 'AVG' }));
    prisma.addMeasurements(id, [
      m(100, new Date('2026-08-05T12:00:00Z')),
      m(200, new Date('2026-08-15T12:00:00Z')),
      m(300, new Date('2026-08-25T12:00:00Z')),
    ]);
    await services.apuration.closePeriod(id, SEP_1);
    const ind = prisma.getIndicator(id);
    expect(ind?.['currentValue']).toBe(200); // AVG = 200
  });
});
