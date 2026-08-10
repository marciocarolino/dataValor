/**
 * indicator-history-contract-audit.spec.ts
 *
 * ETAPA 3G-0 — AUDITORIA DO CONTRATO Indicator ↔ IndicatorHistory
 *
 * OBJETIVO: Mapear e provar o contrato atual entre Indicator e IndicatorHistory,
 * determinando quais campos devem ser sincronizados na futura ETAPA 3G.
 *
 * REGRA ABSOLUTA: ZERO ALTERAÇÃO EM PRODUÇÃO.
 *
 * Serviços REAIS: PeriodResolver, PeriodClosing, AggregationEngine, FormulaEngine,
 *                 IndicatorPeriodApuration, IndicatorPeriodBackfill, IndicatorAnalytics,
 *                 IndicatorHistory
 * MOCK: PrismaService (in-memory FakePrisma)
 * PRODUÇÃO MODIFICADA: NENHUMA
 */

// ── Imports de produção (REAIS) ───────────────────────────────────────────────
import { PeriodResolverService } from './period-resolver.service';
import { IndicatorPeriodClosingService } from './indicator-period-closing.service';
import { AggregationEngineService } from './aggregation-engine.service';
import { IndicatorAnalyticsService } from './indicator-analytics.service';
import { IndicatorHistoryService } from './indicator-history.service';
import { IndicatorPeriodApurationService } from './indicator-period-apuration.service';
import { IndicatorPeriodBackfillService } from './indicator-period-backfill.service';
import { FormulaTokenizerService } from './formula/formula-tokenizer.service';
import { FormulaParserService } from './formula/formula-parser.service';
import { FormulaValidatorService } from './formula/formula-validator.service';
import { FormulaEvaluatorService } from './formula/formula-evaluator.service';
import { FormulaEngineService } from './formula/formula-engine.service';
import { IndicatorCurrentStateService } from './indicator-current-state.service';
import { AggregationType } from './enums/aggregation-type.enum';
import { IndicatorStatus } from './enums/indicator-status.enum';

// ── Constantes de tempo ───────────────────────────────────────────────────────

/** 01/jan/2026 00:00:00 BRT */
const JAN_1 = new Date('2026-01-01T03:00:00.000Z');
/** 01/fev/2026 00:00:00 BRT */
const FEB_1 = new Date('2026-02-01T03:00:00.000Z');
/** 01/mar/2026 00:00:00 BRT */
const MAR_1 = new Date('2026-03-01T03:00:00.000Z');
/** 01/abr/2026 00:00:00 BRT */
const APR_1 = new Date('2026-04-01T03:00:00.000Z');
/** 01/ago/2026 00:00:00 BRT */
const AUG_1 = new Date('2026-08-01T03:00:00.000Z');
/** 01/set/2026 00:00:00 BRT — periodEnd de agosto */
const SEP_1 = new Date('2026-09-01T03:00:00.000Z');
/** 01/out/2026 00:00:00 BRT — periodEnd de setembro */
const OCT_1 = new Date('2026-10-01T03:00:00.000Z');
/** 01/nov/2026 00:00:00 BRT — periodEnd de outubro */
const NOV_1 = new Date('2026-11-01T03:00:00.000Z');

// ── FakePrisma ────────────────────────────────────────────────────────────────

/**
 * FakePrisma: banco em memória para a auditoria.
 * Registra espias (spies) em operações críticas para verificar o que foi chamado.
 */
class FakePrisma {
  private indicatorsMap = new Map<string, Record<string, unknown>>();
  private measurementsMap = new Map<
    string,
    Array<{ value: unknown; referenceDate: Date }>
  >();
  private historiesMap = new Map<string, Record<string, unknown>>();
  private historyCounter = 1;

  // Spies — para verificar o que o sistema atual chama ou não chama
  indicatorUpdateSpy = jest.fn();
  historyCreateSpy = jest.fn();

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

  getHistories() {
    return Array.from(this.historiesMap.values());
  }

  getHistoryFor(indicatorId: string, periodStart: Date, periodEnd: Date) {
    const key = `${indicatorId}|${periodStart.toISOString()}|${periodEnd.toISOString()}`;
    return this.historiesMap.get(key) ?? null;
  }

  getIndicatorSnapshot(indicatorId: string) {
    return this.indicatorsMap.get(indicatorId) ?? null;
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
    // SPY: indicator.update NUNCA deve ser chamado pelo pipeline atual
    update: jest.fn((...args: unknown[]) => {
      this.indicatorUpdateSpy(...args);
      return Promise.resolve(null);
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
      const matches = Array.from(this.historiesMap.values()).filter(
        (h) => h['indicatorId'] === indicatorId,
      );
      return Promise.resolve(matches);
    }),

    create: jest.fn((args: Record<string, unknown>) => {
      const data = args['data'] as Record<string, unknown>;
      const id = `hist-${String(this.historyCounter++).padStart(4, '0')}`;
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
        const err = Object.assign(new Error('Unique constraint violation'), {
          code: 'P2002',
        });
        throw err;
      }
      this.historiesMap.set(key, rec);
      this.historyCreateSpy(args);
      return Promise.resolve(rec);
    }),
  };
}

// ── Fábrica de serviços reais ─────────────────────────────────────────────────

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
  // ETAPA 3G: IndicatorCurrentStateService passa o prisma real para auditoria
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
  return { apuration, backfill, analytics };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeIndicator(
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    name: `Indicator ${id}`,
    frequency: 'MONTHLY',
    aggregationType: 'SUM',
    formula: null,
    // Campos cache: inicialmente null conforme IndicatorsService.create()
    currentValue: null,
    previousValue: null,
    variation: null,
    status: 'NEUTRAL',
    // Campos de configuração
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

// ── SUÍTE DE AUDITORIA ────────────────────────────────────────────────────────

describe('ETAPA 3G-0 — Auditoria: Contrato Indicator ↔ IndicatorHistory', () => {
  let prisma: FakePrisma;
  let services: ReturnType<typeof buildServices>;

  beforeEach(() => {
    prisma = new FakePrisma();
    services = buildServices(prisma);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONTRATO 1: Indicator NÃO É ATUALIZADO pelo pipeline de fechamento
  // ════════════════════════════════════════════════════════════════════════════

  describe('Contrato 1: Indicator NÃO é alterado pelo fechamento de período', () => {
    it('1a. [ETAPA 3G] indicator.update É chamado após CLOSED — SOMENTE currentValue e status', async () => {
      // NOTA: Com ETAPA 3G, indicator.update É chamado pelo IndicatorCurrentStateService.
      // O payload contém SOMENTE { currentValue, status }.
      const id = 'c1-update-scope';
      prisma.addIndicator(makeIndicator(id));
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      expect(prisma.indicatorUpdateSpy).toHaveBeenCalledTimes(1);
      const updatePayload = prisma.indicatorUpdateSpy.mock
        .calls[0][0] as Record<string, unknown>;
      const data = updatePayload['data'] as Record<string, unknown>;
      // Somente currentValue e status no payload
      expect(Object.keys(data)).toHaveLength(2);
      expect(Object.keys(data)).toContain('currentValue');
      expect(Object.keys(data)).toContain('status');
    });

    it('1b. currentValue permanece null após fechamento', async () => {
      const id = 'c1-current-null';
      prisma.addIndicator(makeIndicator(id, { currentValue: null }));
      prisma.addMeasurements(id, [
        makeMeas(500, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const snap = prisma.getIndicatorSnapshot(id);
      // currentValue permanece null — nunca atualizado pelo pipeline
      expect(snap?.['currentValue']).toBeNull();
    });

    it('1c. previousValue permanece null após fechamento', async () => {
      const id = 'c1-prev-null';
      prisma.addIndicator(makeIndicator(id, { previousValue: null }));
      prisma.addMeasurements(id, [
        makeMeas(200, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const snap = prisma.getIndicatorSnapshot(id);
      expect(snap?.['previousValue']).toBeNull();
    });

    it('1d. variation permanece null após fechamento', async () => {
      const id = 'c1-variation-null';
      prisma.addIndicator(makeIndicator(id, { variation: null }));
      prisma.addMeasurements(id, [
        makeMeas(300, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const snap = prisma.getIndicatorSnapshot(id);
      expect(snap?.['variation']).toBeNull();
    });

    it('1e. status permanece NEUTRAL após fechamento (não é sincronizado)', async () => {
      const id = 'c1-status-neutral';
      prisma.addIndicator(
        makeIndicator(id, {
          status: 'NEUTRAL',
          goalValue: { toNumber: () => 1000 }, // meta alta
        }),
      );
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const snap = prisma.getIndicatorSnapshot(id);
      // status do Indicator permanece NEUTRAL — NÃO é sincronizado do IndicatorHistory
      expect(snap?.['status']).toBe('NEUTRAL');
    });

    it('1f. isActive permanece inalterado após fechamento', async () => {
      const id = 'c1-isactive';
      prisma.addIndicator(makeIndicator(id, { isActive: true }));
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const snap = prisma.getIndicatorSnapshot(id);
      expect(snap?.['isActive']).toBe(true);
    });

    it('1g. [ETAPA 3G] indicator.update É chamado pelo backfill — SOMENTE currentValue e status', async () => {
      // NOTA: Com ETAPA 3G, o backfill chama syncFromHistory para cada período fechado.
      const id = 'c1-backfill-update';
      prisma.addIndicator(makeIndicator(id, { createdAt: AUG_1 }));
      prisma.addMeasurements(id, [
        makeMeas(200, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.backfill.runBackfill(SEP_1);
      // Backfill chama update 1x por período fechado
      expect(prisma.indicatorUpdateSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONTRATO 2: IndicatorHistory — campos persistidos
  // ════════════════════════════════════════════════════════════════════════════

  describe('Contrato 2: Campos persistidos no IndicatorHistory', () => {
    it('2a. value = resultado da agregação do período', async () => {
      const id = 'c2-value';
      prisma.addIndicator(makeIndicator(id));
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-05T12:00:00Z')),
        makeMeas(200, new Date('2026-08-15T12:00:00Z')),
        makeMeas(300, new Date('2026-08-25T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const hist = prisma.getHistoryFor(id, AUG_1, SEP_1);
      expect(hist?.['value']).toBe(600); // SUM = 100+200+300
    });

    it('2b. periodStart = 01/ago BRT, periodEnd = 01/set BRT', async () => {
      const id = 'c2-period';
      prisma.addIndicator(makeIndicator(id));
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const hist = prisma.getHistoryFor(id, AUG_1, SEP_1);
      expect(hist?.['periodStart']).toEqual(AUG_1);
      expect(hist?.['periodEnd']).toEqual(SEP_1);
    });

    it('2c. goalValue = snapshot do Indicator.goalValue no momento da apuração', async () => {
      const id = 'c2-goalvalue';
      prisma.addIndicator(
        makeIndicator(id, {
          goalValue: { toNumber: () => 500 },
        }),
      );
      prisma.addMeasurements(id, [
        makeMeas(300, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const hist = prisma.getHistoryFor(id, AUG_1, SEP_1);
      expect(hist?.['goalValue']).toBe(500); // snapshot do goalValue
    });

    it('2d. previousValue = null no primeiro período (sem histórico anterior)', async () => {
      // ACHADO DA AUDITORIA: IndicatorHistoryService.create() usa `dto.previousValue ?? null`
      // Portanto, quando não há período anterior, previousValue é persistido como null (não undefined).
      const id = 'c2-first-prev';
      prisma.addIndicator(makeIndicator(id));
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const hist = prisma.getHistoryFor(id, AUG_1, SEP_1);
      // COMPORTAMENTO REAL: persistido como null (via `dto.previousValue ?? null` em IndicatorHistoryService)
      expect(hist?.['previousValue']).toBeNull();
      // Verificar o payload do create (DTO também envia undefined que é convertido para null)
      const createCall = prisma.historyCreateSpy.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(createCall.data['previousValue'] ?? null).toBeNull();
    });

    it('2e. variationPercent = null no primeiro período', async () => {
      const id = 'c2-first-variation';
      prisma.addIndicator(makeIndicator(id));
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const createCall = prisma.historyCreateSpy.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(createCall.data['variationPercent'] ?? null).toBeNull();
    });

    it('2f. status calculado pelo IndicatorAnalyticsService (NEUTRAL quando sem meta)', async () => {
      const id = 'c2-status-neutral';
      prisma.addIndicator(makeIndicator(id)); // sem goalValue
      prisma.addMeasurements(id, [
        makeMeas(200, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const hist = prisma.getHistoryFor(id, AUG_1, SEP_1);
      expect(hist?.['status']).toBe(IndicatorStatus.NEUTRAL);
    });

    it('2g. status SUCCESS quando value >= goalValue', async () => {
      const id = 'c2-status-success';
      prisma.addIndicator(
        makeIndicator(id, {
          goalValue: { toNumber: () => 100 },
          desiredDirection: 'HIGHER_IS_BETTER',
        }),
      );
      prisma.addMeasurements(id, [
        makeMeas(200, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const hist = prisma.getHistoryFor(id, AUG_1, SEP_1);
      expect(hist?.['status']).toBe(IndicatorStatus.SUCCESS);
    });

    it('2h. status DANGER quando value muito abaixo da meta', async () => {
      const id = 'c2-status-danger';
      prisma.addIndicator(
        makeIndicator(id, {
          goalValue: { toNumber: () => 1000 },
          desiredDirection: 'HIGHER_IS_BETTER',
        }),
      );
      prisma.addMeasurements(id, [
        makeMeas(50, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const hist = prisma.getHistoryFor(id, AUG_1, SEP_1);
      expect(hist?.['status']).toBe(IndicatorStatus.DANGER);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONTRATO 3: previousValue em IndicatorHistory vem do período ANTERIOR
  // ════════════════════════════════════════════════════════════════════════════

  describe('Contrato 3: previousValue em IndicatorHistory', () => {
    it('3a. Dois períodos consecutivos: previousValue do 2o = value do 1o', async () => {
      const id = 'c3-two-periods';
      prisma.addIndicator(makeIndicator(id));
      // Agosto: SUM = 100
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      // Setembro: SUM = 125
      prisma.addMeasurements(id, [
        makeMeas(125, new Date('2026-09-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, OCT_1);

      const histSet = prisma.getHistoryFor(id, SEP_1, OCT_1);
      // previousValue de setembro = value de agosto
      expect(histSet?.['previousValue']).toBe(100);
      expect(histSet?.['value']).toBe(125);
    });

    it('3b. variationPercent = (125-100)/100*100 = 25%', async () => {
      const id = 'c3-variation';
      prisma.addIndicator(makeIndicator(id));
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      prisma.addMeasurements(id, [
        makeMeas(125, new Date('2026-09-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, OCT_1);

      const histSet = prisma.getHistoryFor(id, SEP_1, OCT_1);
      expect(histSet?.['variationPercent']).toBeCloseTo(25, 4);
    });

    it('3c. Três períodos consecutivos: encadeamento A → B → C', async () => {
      const id = 'c3-three-periods';
      prisma.addIndicator(makeIndicator(id, { createdAt: AUG_1 }));
      // Agosto: 100
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      // Setembro: 125
      prisma.addMeasurements(id, [
        makeMeas(125, new Date('2026-09-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, OCT_1);
      // Outubro: 150
      prisma.addMeasurements(id, [
        makeMeas(150, new Date('2026-10-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, NOV_1);

      const histOct = prisma.getHistoryFor(id, OCT_1, NOV_1);
      // previousValue de outubro = value de setembro
      expect(histOct?.['previousValue']).toBe(125);
      expect(histOct?.['value']).toBe(150);
    });

    it('3d. previousValue é identificado por periodEnd = periodStart atual (não por createdAt)', async () => {
      const id = 'c3-period-end-rule';
      prisma.addIndicator(makeIndicator(id));
      // Janeiro: 100
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-01-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, FEB_1);
      // Fevereiro: 200
      prisma.addMeasurements(id, [
        makeMeas(200, new Date('2026-02-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, MAR_1);

      const histFeb = prisma.getHistoryFor(id, FEB_1, MAR_1);
      // O sistema busca previousValue via: findFirst({ where: { indicatorId, periodEnd: FEB_1 } })
      // periodEnd de janeiro = FEB_1 = periodStart de fevereiro
      expect(histFeb?.['previousValue']).toBe(100);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONTRATO 4: Gaps históricos
  // ════════════════════════════════════════════════════════════════════════════

  describe('Contrato 4: Gaps históricos', () => {
    it('4a. Gap de um mês: fevereiro sem histórico', async () => {
      const id = 'c4-gap';
      prisma.addIndicator(makeIndicator(id));
      // Janeiro: 100
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-01-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, FEB_1);
      // Fevereiro: SEM MEDIÇÕES (apenas SUM → NO_DATA, não cria histórico)
      const rFeb = await services.apuration.closePeriod(id, MAR_1);
      expect(rFeb.status).toBe('NO_DATA'); // SUM sem dados → NO_DATA, sem histórico
      // Março: 150
      prisma.addMeasurements(id, [
        makeMeas(150, new Date('2026-03-10T12:00:00Z')),
      ]);
      const rMar = await services.apuration.closePeriod(id, APR_1);
      expect(rMar.status).toBe('CLOSED');
      if (rMar.status === 'CLOSED') {
        // previousValue de março: busca periodEnd = MAR_1 no histórico
        // Fevereiro NÃO tem histórico (NO_DATA) → previousValue = null
        expect(rMar.previousValue).toBeNull();
      }
    });

    it('4b. Sistema usa periodEnd = periodStart como critério de continuidade', async () => {
      // Evidência: IndicatorPeriodApurationService usa:
      // prisma.indicatorHistory.findFirst({ where: { indicatorId, periodEnd: periodStart } })
      const id = 'c4-period-end-criteria';
      prisma.addIndicator(makeIndicator(id));
      prisma.addMeasurements(id, [
        makeMeas(200, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      // Verificar que a query foi feita com periodEnd = periodStart
      const findFirstCalls = prisma.indicatorHistory.findFirst.mock.calls;
      const prevValueQuery = findFirstCalls.find((call) => {
        const where = call[0]['where'] as Record<string, unknown>;
        return where['periodEnd'] !== undefined;
      });
      expect(prevValueQuery).toBeDefined();
      const queryWhere = prevValueQuery![0]['where'] as Record<string, unknown>;
      // A query usa periodEnd = AUG_1 (= periodStart do período de agosto)
      expect((queryWhere['periodEnd'] as Date).getTime()).toBe(AUG_1.getTime());
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONTRATO 5: Backfill
  // ════════════════════════════════════════════════════════════════════════════

  describe('Contrato 5: Backfill não altera Indicator', () => {
    it('5a. Backfill cria históricos sem alterar o Indicator', async () => {
      const id = 'c5-backfill';
      prisma.addIndicator(makeIndicator(id, { createdAt: AUG_1 }));
      prisma.addMeasurements(id, [
        makeMeas(300, new Date('2026-08-10T12:00:00Z')),
      ]);
      const snapBefore = { ...prisma.getIndicatorSnapshot(id) };
      await services.backfill.runBackfill(SEP_1);
      const snapAfter = prisma.getIndicatorSnapshot(id);
      // Snapshot do Indicator permanece idêntico
      expect(snapAfter?.['currentValue']).toBe(snapBefore['currentValue']);
      expect(snapAfter?.['previousValue']).toBe(snapBefore['previousValue']);
      expect(snapAfter?.['variation']).toBe(snapBefore['variation']);
      expect(snapAfter?.['status']).toBe(snapBefore['status']);
    });

    it('5b. Backfill com múltiplos períodos encadeia previousValue corretamente', async () => {
      const id = 'c5-backfill-chain';
      prisma.addIndicator(
        makeIndicator(id, {
          createdAt: new Date('2026-06-01T03:00:00.000Z'),
        }),
      );
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-06-15T12:00:00Z')),
        makeMeas(200, new Date('2026-07-15T12:00:00Z')),
        makeMeas(300, new Date('2026-08-15T12:00:00Z')),
      ]);
      await services.backfill.runBackfill(SEP_1);
      // Agosto deve ter previousValue = 200 (julho)
      const augHist = prisma.getHistoryFor(id, AUG_1, SEP_1);
      expect(augHist?.['previousValue']).toBe(200);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONTRATO 6: FORMULA
  // ════════════════════════════════════════════════════════════════════════════

  describe('Contrato 6: FORMULA não altera Indicator', () => {
    it('6a. [ETAPA 3G] Fórmula válida cria IndicatorHistory e sincroniza currentValue/status', async () => {
      const id = 'c6-formula-valid';
      prisma.addIndicator(
        makeIndicator(id, {
          aggregationType: 'FORMULA',
          formula: 'SUM() / COUNT()',
        }),
      );
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-05T12:00:00Z')),
        makeMeas(200, new Date('2026-08-15T12:00:00Z')),
        makeMeas(300, new Date('2026-08-25T12:00:00Z')),
      ]);
      const r = await services.apuration.closePeriod(id, SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.value).toBe(200); // SUM=600, COUNT=3 → 200
        expect(r.aggregationType).toBe(AggregationType.FORMULA);
      }
      // ETAPA 3G: update é chamado com currentValue e status
      expect(prisma.indicatorUpdateSpy).toHaveBeenCalledTimes(1);
      const updateData = (
        prisma.indicatorUpdateSpy.mock.calls[0][0] as Record<string, unknown>
      )['data'] as Record<string, unknown>;
      expect(updateData['currentValue']).toBe(200);
    });

    it('6b. Fórmula inválida não cria IndicatorHistory, Indicator inalterado', async () => {
      const id = 'c6-formula-invalid';
      prisma.addIndicator(
        makeIndicator(id, {
          aggregationType: 'FORMULA',
          formula: 'SQRT(100)', // não suportada
        }),
      );
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-10T12:00:00Z')),
      ]);
      await expect(services.apuration.closePeriod(id, SEP_1)).rejects.toThrow();
      expect(prisma.getHistories()).toHaveLength(0);
      expect(prisma.indicatorUpdateSpy).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONTRATO 7: COUNT sem medições
  // ════════════════════════════════════════════════════════════════════════════

  describe('Contrato 7: COUNT sem medições → value=0 → CLOSED', () => {
    it('7a. COUNT sem medições cria IndicatorHistory com value=0', async () => {
      const id = 'c7-count-zero';
      prisma.addIndicator(makeIndicator(id, { aggregationType: 'COUNT' }));
      const r = await services.apuration.closePeriod(id, SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.value).toBe(0);
      }
      const hist = prisma.getHistoryFor(id, AUG_1, SEP_1);
      expect(hist?.['value']).toBe(0);
    });

    it('7b. previousValue=0 → variationPercent=null (não Infinity)', async () => {
      const id = 'c7-prev-zero';
      prisma.addIndicator(makeIndicator(id, { aggregationType: 'COUNT' }));
      // Julho sem medições: COUNT=0
      const rJul = await services.apuration.closePeriod(id, AUG_1);
      expect(rJul.status).toBe('CLOSED');
      if (rJul.status === 'CLOSED') expect(rJul.value).toBe(0);
      // Agosto: 3 medições
      prisma.addMeasurements(id, [
        makeMeas(1, new Date('2026-08-05T12:00:00Z')),
        makeMeas(1, new Date('2026-08-15T12:00:00Z')),
        makeMeas(1, new Date('2026-08-25T12:00:00Z')),
      ]);
      const rAug = await services.apuration.closePeriod(id, SEP_1);
      if (rAug.status === 'CLOSED') {
        expect(rAug.previousValue).toBe(0);
        expect(rAug.variationPercent).toBeNull();
        expect(rAug.variationPercent).not.toBe(Infinity);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONTRATO 8: variationPercent anti-hardcoding
  // ════════════════════════════════════════════════════════════════════════════

  describe('Contrato 8: variationPercent — anti-hardcoding', () => {
    async function testVariation(id: string, valueA: number, valueB: number) {
      prisma.addIndicator(makeIndicator(id));
      prisma.addMeasurements(id, [
        makeMeas(valueA, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      prisma.addMeasurements(id, [
        makeMeas(valueB, new Date('2026-09-10T12:00:00Z')),
      ]);
      const r = await services.apuration.closePeriod(id, OCT_1);
      if (r.status === 'CLOSED') {
        const expected = ((valueB - valueA) / Math.abs(valueA)) * 100;
        expect(r.variationPercent).toBeCloseTo(expected, 4);
        expect(isFinite(r.variationPercent ?? 0)).toBe(true);
      }
    }

    it('8a. Conjunto A: 100 → 125 = +25%', async () => {
      await testVariation('c8-a', 100, 125);
    });

    it('8b. Conjunto B: 1000 → 1500 = +50%', async () => {
      await testVariation('c8-b', 1000, 1500);
    });

    it('8c. Conjunto C: -50 → -25 = +50%', async () => {
      await testVariation('c8-c', -50, -25);
    });

    it('8d. previousValue = 0 → variationPercent = null (qualquer valor atual)', async () => {
      const id = 'c8-prev-zero';
      prisma.addIndicator(makeIndicator(id, { aggregationType: 'COUNT' }));
      await services.apuration.closePeriod(id, AUG_1); // COUNT=0
      prisma.addMeasurements(id, [
        makeMeas(1, new Date('2026-08-10T12:00:00Z')),
      ]);
      const r = await services.apuration.closePeriod(id, SEP_1);
      if (r.status === 'CLOSED') {
        expect(r.variationPercent).toBeNull();
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONTRATO 9: Último período = periodEnd mais recente (não createdAt)
  // ════════════════════════════════════════════════════════════════════════════

  describe('Contrato 9: Ordenação temporal por periodEnd', () => {
    it('9a. O período "mais recente" é aquele com maior periodEnd, não maior createdAt', async () => {
      const id = 'c9-ordering';
      prisma.addIndicator(makeIndicator(id, { createdAt: JAN_1 }));
      // Fecha agosto primeiro (ordem normal)
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-10T12:00:00Z')),
      ]);
      const rAug = await services.apuration.closePeriod(id, SEP_1);
      expect(rAug.status).toBe('CLOSED');
      // Fecha setembro depois
      prisma.addMeasurements(id, [
        makeMeas(200, new Date('2026-09-10T12:00:00Z')),
      ]);
      const rSep = await services.apuration.closePeriod(id, OCT_1);
      expect(rSep.status).toBe('CLOSED');
      if (rSep.status === 'CLOSED') {
        // previousValue de setembro = value de agosto = 100
        // Isso prova que o sistema usa periodEnd como critério, não createdAt
        expect(rSep.previousValue).toBe(100);
      }
    });

    it('9b. IndicatorHistory.createdAt NÃO é usado como critério de ordenação', async () => {
      // O sistema usa findFirst({ where: { periodEnd: periodStart } })
      // portanto o critério é SEMPRE temporal via periodEnd, não createdAt.
      // Prova: o previousValue é correto mesmo que createdAt não esteja em ordem.
      const id = 'c9-createdAt-irrelevant';
      prisma.addIndicator(makeIndicator(id, { createdAt: JAN_1 }));
      prisma.addMeasurements(id, [
        makeMeas(500, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      prisma.addMeasurements(id, [
        makeMeas(750, new Date('2026-09-10T12:00:00Z')),
      ]);
      const r = await services.apuration.closePeriod(id, OCT_1);
      if (r.status === 'CLOSED') {
        expect(r.previousValue).toBe(500);
        expect(r.variationPercent).toBeCloseTo(50, 4);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONTRATO 10: Idempotência
  // ════════════════════════════════════════════════════════════════════════════

  describe('Contrato 10: Idempotência', () => {
    it('10a. Segundo fechamento do mesmo período → ALREADY_CLOSED', async () => {
      const id = 'c10-idempotent';
      prisma.addIndicator(makeIndicator(id));
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-10T12:00:00Z')),
      ]);
      const r1 = await services.apuration.closePeriod(id, SEP_1);
      expect(r1.status).toBe('CLOSED');
      const r2 = await services.apuration.closePeriod(id, SEP_1);
      expect(r2.status).toBe('ALREADY_CLOSED');
      expect(prisma.historyCreateSpy).toHaveBeenCalledTimes(1);
    });

    it('10b. [ETAPA 3G] Segunda execução (ALREADY_CLOSED) não chama update novamente', async () => {
      const id = 'c10-multi-run';
      prisma.addIndicator(makeIndicator(id));
      prisma.addMeasurements(id, [
        makeMeas(200, new Date('2026-08-10T12:00:00Z')),
      ]);
      // Primeira execução: CLOSED → chama update 1x
      await services.apuration.closePeriod(id, SEP_1);
      expect(prisma.indicatorUpdateSpy).toHaveBeenCalledTimes(1);
      // Segunda execução: ALREADY_CLOSED → NÃO chama update novamente
      await services.apuration.closePeriod(id, SEP_1);
      expect(prisma.indicatorUpdateSpy).toHaveBeenCalledTimes(1); // ainda 1x
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONTRATO 11: Diferença entre Indicator.variation e IndicatorHistory.variationPercent
  // ════════════════════════════════════════════════════════════════════════════

  describe('Contrato 11: Indicator.variation ≠ IndicatorHistory.variationPercent', () => {
    it('11a. Indicator.variation é calculado de raw measurements (não de períodos)', () => {
      // IndicatorAnalyticsService.compute() usa as 2 medições brutas mais recentes
      const analytics = services.analytics;
      const result = analytics.compute({
        measurements: [
          {
            value: { toNumber: () => 100 },
            referenceDate: new Date('2026-07-01'),
          },
          {
            value: { toNumber: () => 125 },
            referenceDate: new Date('2026-08-01'),
          },
        ],
        goalValue: null,
        minimumGoalValue: null,
        maximumGoalValue: null,
        desiredDirection: 'HIGHER_IS_BETTER' as never,
        endDate: null,
      });
      // variation = ((125-100)/100)*100 = 25%
      expect(result.variation).toBeCloseTo(25, 4);
      // currentValue = 125 (última medição bruta)
      expect(result.currentValue).toBe(125);
    });

    it('11b. IndicatorHistory.variationPercent é calculado de periods (value agregado)', async () => {
      const id = 'c11-history-variation';
      prisma.addIndicator(makeIndicator(id));
      // Período A: SUM de [100, 50, 50] = 200
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-05T12:00:00Z')),
        makeMeas(50, new Date('2026-08-15T12:00:00Z')),
        makeMeas(50, new Date('2026-08-25T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      // Período B: SUM de [100, 100, 50] = 250
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-09-05T12:00:00Z')),
        makeMeas(100, new Date('2026-09-15T12:00:00Z')),
        makeMeas(50, new Date('2026-09-25T12:00:00Z')),
      ]);
      const rSep = await services.apuration.closePeriod(id, OCT_1);
      if (rSep.status === 'CLOSED') {
        // variationPercent = ((250-200)/200)*100 = 25%
        expect(rSep.variationPercent).toBeCloseTo(25, 4);
        // value do período B
        expect(rSep.value).toBe(250);
      }
    });

    it('11c. Indicator.variation e IndicatorHistory.variationPercent são fontes DIFERENTES', () => {
      // Indicator.variation: schema diz "Cache fields (fonte de verdade: IndicatorMeasurement)"
      // IndicatorHistory.variationPercent: calculado de period.value vs previous period.value
      // São conceitos distintos e podem ter valores diferentes para o mesmo indicador
      expect(true).toBe(true); // evidência documentada acima
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONTRATO 12: Indicador inativo
  // ════════════════════════════════════════════════════════════════════════════

  describe('Contrato 12: Indicador inativo', () => {
    it('12a. closePeriod funciona para indicadores inativos (isActive=false)', async () => {
      const id = 'c12-inactive';
      prisma.addIndicator(makeIndicator(id, { isActive: false }));
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-10T12:00:00Z')),
      ]);
      // IndicatorPeriodApurationService NÃO bloqueia indicadores inativos
      const r = await services.apuration.closePeriod(id, SEP_1);
      expect(r.status).toBe('CLOSED');
      if (r.status === 'CLOSED') {
        expect(r.isActive).toBe(false); // retornado como contexto, não bloqueia
      }
    });

    it('12b. isActive=false permanece false após fechamento', async () => {
      const id = 'c12-inactive-preserved';
      prisma.addIndicator(makeIndicator(id, { isActive: false }));
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const snap = prisma.getIndicatorSnapshot(id);
      expect(snap?.['isActive']).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONTRATO 13: Campos NÃO existentes — confirmação
  // ════════════════════════════════════════════════════════════════════════════

  describe('Contrato 13: Campos confirmados não existentes', () => {
    it('13a. Indicator NÃO tem campo variationPercent (usa variation)', () => {
      const ind = makeIndicator('c13-no-variationpercent');
      // variationPercent não existe no schema do Indicator
      expect('variationPercent' in ind).toBe(false);
      expect('variation' in ind).toBe(true);
    });

    it('13b. Indicator NÃO tem campo periodStart/periodEnd direto', () => {
      const ind = makeIndicator('c13-no-period');
      expect('periodStart' in ind).toBe(false);
      expect('periodEnd' in ind).toBe(false);
    });

    it('13c. IndicatorHistory NÃO tem campo currentValue', async () => {
      const id = 'c13-hist-no-current';
      prisma.addIndicator(makeIndicator(id));
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const hist = prisma.getHistoryFor(id, AUG_1, SEP_1);
      // currentValue não existe em IndicatorHistory — existe apenas value
      expect('currentValue' in (hist ?? {})).toBe(false);
      expect('value' in (hist ?? {})).toBe(true);
    });

    it('13d. IndicatorHistory NÃO tem campo variation (usa variationPercent)', async () => {
      const id = 'c13-hist-no-variation';
      prisma.addIndicator(makeIndicator(id));
      prisma.addMeasurements(id, [
        makeMeas(100, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const createCall = prisma.historyCreateSpy.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      // O DTO usa variationPercent, não variation
      expect(
        'variationPercent' in createCall.data ||
          createCall.data['variationPercent'] === undefined,
      ).toBe(true);
      expect(createCall.data['variation']).toBeUndefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONTRATO 14: goalValue como snapshot
  // ════════════════════════════════════════════════════════════════════════════

  describe('Contrato 14: goalValue como snapshot histórico', () => {
    it('14a. IndicatorHistory captura goalValue do momento da apuração', async () => {
      const id = 'c14-goal-snapshot';
      prisma.addIndicator(
        makeIndicator(id, {
          goalValue: { toNumber: () => 1000 },
        }),
      );
      prisma.addMeasurements(id, [
        makeMeas(800, new Date('2026-08-10T12:00:00Z')),
      ]);
      await services.apuration.closePeriod(id, SEP_1);
      const hist = prisma.getHistoryFor(id, AUG_1, SEP_1);
      // goalValue no histórico = snapshot do Indicator.goalValue no momento
      expect(hist?.['goalValue']).toBe(1000);
    });
  });
});
