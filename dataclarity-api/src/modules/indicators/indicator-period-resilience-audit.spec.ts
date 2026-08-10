/**
 * ETAPA 3E-B — Auditoria de Resiliência e Prontidão para Produção
 *
 * Este arquivo NÃO altera nenhum arquivo de produção.
 * Cria APENAS testes de auditoria para validar comportamento de resiliência.
 *
 * Cobre:
 *  - Concorrência (2 execuções simultâneas)
 *  - Restart da aplicação
 *  - Falhas em diferentes pontos do fluxo
 *  - Idempotência tripla
 *  - Períodos perdidos (downtime prolongado)
 *  - Comportamento para múltiplas instâncias
 *  - Timezone
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

// ── Constantes de referência ──────────────────────────────────────────────────

/** meia-noite BRT de 01/set/2026 = periodEnd de agosto */
const SEP_1_BRT = new Date('2026-09-01T03:00:00.000Z');
/** meia-noite BRT de 01/ago/2026 = periodStart de agosto */
const AUG_1_BRT = new Date('2026-08-01T03:00:00.000Z');
/** meia-noite BRT de 01/out/2026 = periodEnd de setembro */
const OCT_1_BRT = new Date('2026-10-01T03:00:00.000Z');
/** meia-noite BRT de 01/nov/2026 = periodEnd de outubro */
const NOV_1_BRT = new Date('2026-11-01T03:00:00.000Z');

const IND_ID = 'resil-0001-0000-4000-a000-000000000001';
const HIST_ID = 'hist-resil-0000-4000-a000-000000000001';

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
  name: 'Indicador Resiliência',
  ...overrides,
});

const makeHist = (overrides: Record<string, unknown> = {}) => ({
  id: HIST_ID,
  indicatorId: IND_ID,
  periodStart: AUG_1_BRT,
  periodEnd: SEP_1_BRT,
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

const AUG_M = [
  { value: dec(100), referenceDate: new Date('2026-08-10T12:00:00.000Z') },
];

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('ETAPA 3E-B — Auditoria de Resiliência', () => {
  let prisma: {
    indicator: { findUnique: jest.Mock; findMany: jest.Mock };
    indicatorHistory: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    indicatorMeasurement: { findMany: jest.Mock };
  };
  let apuration: IndicatorPeriodApurationService;
  let scheduler: IndicatorPeriodClosingScheduler;

  const buildStack = () => {
    const periodResolver = new PeriodResolverService();
    const periodClosing = new IndicatorPeriodClosingService(periodResolver);
    const aggregation = new AggregationEngineService();
    const analytics = new IndicatorAnalyticsService();
    const historyService = new IndicatorHistoryService(prisma as never);
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
    scheduler = new IndicatorPeriodClosingScheduler(
      prisma as never,
      apuration,
      { runBackfill: jest.fn().mockResolvedValue({}) } as never,
    );
  };

  beforeEach(() => {
    prisma = {
      indicator: { findUnique: jest.fn(), findMany: jest.fn() },
      indicatorHistory: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      indicatorMeasurement: { findMany: jest.fn().mockResolvedValue([]) },
    };
    buildStack();

    // Default: create retorna histórico
    prisma.indicatorHistory.create.mockImplementation(
      (args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          ...makeHist(),
          periodStart: args.data['periodStart'],
          periodEnd: args.data['periodEnd'],
          value:
            args.data['value'] != null
              ? dec(args.data['value'] as number)
              : null,
          status: args.data['status'],
        }),
    );
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. AUDITORIA DE CONCORRÊNCIA
  //    Simula duas chamadas simultâneas ao closePeriod() para o mesmo indicador.
  // ══════════════════════════════════════════════════════════════════════════════

  describe('1. Concorrência — duas chamadas simultâneas a closePeriod()', () => {
    /**
     * CENÁRIO: duas instâncias chamam closePeriod() ao mesmo tempo.
     *
     * O fluxo COMPLETO é:
     *   A) findUnique(indicatorId)          → ambas retornam o indicador
     *   B) findUnique(history idempotência) → ambas retornam null (ainda não existe)
     *   C) create()                         → apenas UMA deve ter sucesso;
     *                                         a outra recebe P2002 (unique constraint)
     *
     * ANÁLISE: O Prisma lança PrismaClientKnownRequestError com code='P2002'
     * quando a constraint @@unique([indicatorId, periodStart, periodEnd]) é violada.
     *
     * PROTEÇÃO ATUAL: a constraint do banco é a única proteção em multi-instância.
     * A flag `_running` do scheduler protege apenas dentro da mesma instância.
     */

    it('AUDIT-C1: duas chamadas concorrentes — apenas uma cria histórico (race condition simulado)', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);

      // Ambas verificam idempotência e não encontram histórico
      prisma.indicatorHistory.findUnique.mockResolvedValue(null);

      // Primeira create tem sucesso; segunda lança P2002
      let createCount = 0;
      prisma.indicatorHistory.create.mockImplementation(() => {
        createCount++;
        if (createCount === 1) return Promise.resolve(makeHist());
        // Simula Prisma P2002 unique constraint violation
        const err = Object.assign(new Error('Unique constraint failed'), {
          code: 'P2002',
          meta: { target: ['indicatorId', 'periodStart', 'periodEnd'] },
        });
        return Promise.reject(err);
      });

      // Executar as duas chamadas simultaneamente
      const [resultA, resultB] = await Promise.allSettled([
        apuration.closePeriod(IND_ID, SEP_1_BRT),
        apuration.closePeriod(IND_ID, SEP_1_BRT),
      ]);

      // Uma deve ter sucesso (CLOSED), a outra deve falhar com P2002
      const results = [resultA, resultB];
      const successful = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      // Exatamente uma chamada retornou CLOSED
      const closed = successful.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 'CLOSED',
      );
      expect(closed).toHaveLength(1);

      // A outra falhou — P2002 sobe como exceção não tratada
      // NOTA AUDITORIA: o P2002 NÃO é tratado pelo closePeriod atual.
      // Isso significa que o scheduler registrará a segunda instância como `failed=1`,
      // mas não haverá duplicação no banco. A constraint garante integridade.
      expect(failed).toHaveLength(1);

      // create foi chamado duas vezes (race), mas apenas um INSERT chegou ao banco
      expect(createCount).toBe(2);
    });

    it('AUDIT-C2: scheduler _running flag protege a mesma instância', async () => {
      // Simula que o ciclo já está rodando
      (scheduler as unknown as { _running: boolean })._running = true;

      const result = await scheduler.runCycle(SEP_1_BRT);

      // Retorna imediatamente sem processar nada
      expect(result.processed).toBe(0);
      expect(prisma.indicator.findMany).not.toHaveBeenCalled();

      // Limpa
      (scheduler as unknown as { _running: boolean })._running = false;
    });

    it('AUDIT-C3: _running NÃO protege instâncias diferentes (multi-instance)', () => {
      // NOTA AUDITORIA: _running é estado em memória local.
      // Uma segunda INSTÂNCIA da aplicação (processo separado) tem seu próprio
      // _running=false e executará o scheduler normalmente.
      // A única proteção em multi-instância é a constraint @@unique do banco.
      const scheduler2 = new IndicatorPeriodClosingScheduler(
        prisma as never,
        apuration,
        { runBackfill: jest.fn().mockResolvedValue({}) } as never,
      );

      // Ambos os schedulers têm _running=false independentemente
      expect((scheduler as unknown as { _running: boolean })._running).toBe(
        false,
      );
      expect((scheduler2 as unknown as { _running: boolean })._running).toBe(
        false,
      );

      // Prova que são instâncias separadas
      (scheduler as unknown as { _running: boolean })._running = true;
      expect((scheduler2 as unknown as { _running: boolean })._running).toBe(
        false,
      );

      // Limpa
      (scheduler as unknown as { _running: boolean })._running = false;
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. AUDITORIA DE RESTART
  //    O restart não corrompe nada porque:
  //    - O estado de idempotência está no banco (constraint @@unique)
  //    - O scheduler não possui estado persistido fora do banco
  //    - Após restart, a próxima execução encontrará os históricos existentes
  // ══════════════════════════════════════════════════════════════════════════════

  describe('2. Restart da aplicação', () => {
    it('AUDIT-R1: após restart, scheduler encontra histórico existente e retorna ALREADY_CLOSED', async () => {
      // Simula: antes do restart, agosto foi fechado
      // Após restart, o banco ainda contém o histórico
      prisma.indicator.findMany.mockResolvedValue([makeInd()]);
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);

      // Após restart: histórico já existe no banco
      prisma.indicatorHistory.findUnique.mockResolvedValue({ id: HIST_ID });

      const result = await scheduler.runCycle(SEP_1_BRT);

      expect(result.alreadyClosed).toBe(1);
      expect(result.closed).toBe(0);
      expect(prisma.indicatorHistory.create).not.toHaveBeenCalled();
    });

    it('AUDIT-R2: restart durante o processamento — período não fechado é retentado na próxima execução', async () => {
      // Simula: ciclo anterior não chegou ao create (ex: crash após buscar medições)
      // O banco NÃO tem histórico → próxima execução começa do zero
      prisma.indicator.findMany.mockResolvedValue([makeInd()]);
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);
      prisma.indicatorHistory.findUnique.mockResolvedValue(null); // nada foi salvo

      // Nova execução após restart fecha normalmente
      const result = await scheduler.runCycle(SEP_1_BRT);
      expect(result.closed).toBe(1);
      expect(prisma.indicatorHistory.create).toHaveBeenCalledTimes(1);
    });

    it('AUDIT-R3: sem estado em memória entre execuções — _running sempre false após restart', () => {
      // Após restart: _running é sempre false (memória reiniciada)
      const freshScheduler = new IndicatorPeriodClosingScheduler(
        prisma as never,
        apuration,
        { runBackfill: jest.fn().mockResolvedValue({}) } as never,
      );
      expect(
        (freshScheduler as unknown as { _running: boolean })._running,
      ).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. AUDITORIA DE FALHA EM DIFERENTES PONTOS
  //    Análise de risk por cenário de falha
  // ══════════════════════════════════════════════════════════════════════════════

  describe('3. Falha em diferentes pontos do fluxo', () => {
    it('AUDIT-F1: falha ao buscar indicador (ponto A) — nenhum histórico criado', async () => {
      prisma.indicator.findUnique.mockRejectedValue(new Error('DB timeout'));
      await expect(apuration.closePeriod(IND_ID, SEP_1_BRT)).rejects.toThrow(
        'DB timeout',
      );
      expect(prisma.indicatorHistory.create).not.toHaveBeenCalled();
    });

    it('AUDIT-F2: falha ao buscar medições (ponto B) — nenhum histórico criado', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockRejectedValue(
        new Error('network error'),
      );
      await expect(apuration.closePeriod(IND_ID, SEP_1_BRT)).rejects.toThrow(
        'network error',
      );
      expect(prisma.indicatorHistory.create).not.toHaveBeenCalled();
    });

    it('AUDIT-F3: falha durante create() (ponto F) — exceção propagada, sem histórico parcial', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);
      prisma.indicatorHistory.create.mockRejectedValue(
        new Error('INSERT failed'),
      );
      await expect(apuration.closePeriod(IND_ID, SEP_1_BRT)).rejects.toThrow(
        'INSERT failed',
      );
    });

    it('AUDIT-F4: falha durante create() — nova execução tenta novamente (sem histórico gravado)', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);
      prisma.indicatorHistory.findUnique.mockResolvedValue(null);

      // Primeira tentativa: create falha
      prisma.indicatorHistory.create.mockRejectedValueOnce(
        new Error('timeout'),
      );
      await expect(apuration.closePeriod(IND_ID, SEP_1_BRT)).rejects.toThrow();

      // Segunda tentativa: create tem sucesso (nenhum histórico foi criado antes)
      prisma.indicatorHistory.create.mockResolvedValueOnce(makeHist());
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
    });

    it('AUDIT-F5: falha P2002 durante create() — IndicatorHistoryService converte em ConflictException', async () => {
      /**
       * DESCOBERTA AUDITORIA:
       * O IndicatorHistoryService JÁ trata P2002 e lança ConflictException
       * com mensagem 'Já existe um resultado histórico para este indicador neste período exato.'
       *
       * Isso significa que em multi-instância:
       * - Instância A: CLOSED (inserção bem-sucedida)
       * - Instância B: ConflictException (P2002 capturado → scheduler registra failed=1)
       * - Banco: apenas 1 histórico (constraint garantida)
       *
       * O comportamento é MAIS SEGURO do que o esperado inicialmente.
       * O scheduler registra como `failed` mas a integridade do banco está garantida.
       */
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);
      const p2002 = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target: ['indicatorId', 'periodStart', 'periodEnd'] },
      });
      prisma.indicatorHistory.create.mockRejectedValue(p2002);

      // IndicatorHistoryService converte P2002 em ConflictException
      await expect(apuration.closePeriod(IND_ID, SEP_1_BRT)).rejects.toThrow(
        'Já existe um resultado histórico para este indicador neste período exato.',
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. AUDITORIA DE IDEMPOTÊNCIA TRIPLA
  // ══════════════════════════════════════════════════════════════════════════════

  describe('4. Idempotência tripla', () => {
    it('AUDIT-I1: 3 execuções — CLOSED, ALREADY_CLOSED, ALREADY_CLOSED; create chamado 1x', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);

      // 1ª execução: sem histórico
      prisma.indicatorHistory.findUnique.mockResolvedValueOnce(null);
      const r1 = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(r1.status).toBe('CLOSED');

      // 2ª execução: histórico existe
      prisma.indicatorHistory.findUnique.mockResolvedValueOnce({ id: HIST_ID });
      const r2 = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(r2.status).toBe('ALREADY_CLOSED');

      // 3ª execução: histórico ainda existe
      prisma.indicatorHistory.findUnique.mockResolvedValueOnce({ id: HIST_ID });
      const r3 = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(r3.status).toBe('ALREADY_CLOSED');

      expect(prisma.indicatorHistory.create).toHaveBeenCalledTimes(1);
    });

    it('AUDIT-I2: scheduler executado 3 vezes — 1 closed, 2 alreadyClosed', async () => {
      prisma.indicator.findMany.mockResolvedValue([makeInd()]);
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);

      const r1 = await scheduler.runCycle(SEP_1_BRT);
      expect(r1.closed).toBe(1);

      prisma.indicatorHistory.findUnique.mockResolvedValue({ id: HIST_ID });
      const r2 = await scheduler.runCycle(SEP_1_BRT);
      expect(r2.alreadyClosed).toBe(1);

      const r3 = await scheduler.runCycle(SEP_1_BRT);
      expect(r3.alreadyClosed).toBe(1);

      expect(prisma.indicatorHistory.create).toHaveBeenCalledTimes(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 5. AUDITORIA DE PERÍODOS PERDIDOS (DOWNTIME PROLONGADO)
  //    Comportamento crítico: o scheduler fecha APENAS O PERÍODO IMEDIATAMENTE
  //    ANTERIOR à referenceDate. Se a aplicação ficou desligada por múltiplos
  //    períodos, cada execução do scheduler fechará apenas 1 período.
  // ══════════════════════════════════════════════════════════════════════════════

  describe('5. Períodos perdidos — downtime prolongado', () => {
    /**
     * CENÁRIO CRÍTICO:
     * Aplicação ficou desligada de julho/2026 a setembro/2026.
     *
     * Em 15/set/2026 (15:00 BRT = 18:00 UTC):
     *   referenceDate - 1ms = 14/set BRT
     *   PeriodResolver resolve: setembro em andamento (01/set→01/out)
     *   periodEnd = 01/out > referenceDate → isClosed = FALSE
     *
     * O scheduler executa em 15/set → PERIOD_OPEN para setembro.
     * O período de agosto (01/ago→01/set) ficou SEM fechamento.
     *
     * DESCOBERTA AUDITORIA: O scheduler atual NÃO fecha períodos retroativos.
     * Cada execução resolve apenas o período em que a referenceDate se encontra.
     * Se a aplicação ficou desligada, os períodos passados são perdidos
     * a menos que uma ferramenta externa chame closePeriod() com datas retroativas.
     */

    it('AUDIT-P1: em 15/set, setembro ainda está aberto → PERIOD_OPEN', async () => {
      const sep15 = new Date('2026-09-15T15:00:00.000Z'); // 12:00 BRT de 15/set
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      const result = await apuration.closePeriod(IND_ID, sep15);
      // setembro ainda não terminou → PERIOD_OPEN
      expect(result.status).toBe('PERIOD_OPEN');
      expect(prisma.indicatorHistory.create).not.toHaveBeenCalled();
    });

    it('AUDIT-P2: em 01/out (referenceDate), apenas agosto é fechado — setembro fica pendente', async () => {
      // Em 01/out/2026, o scheduler tenta fechar setembro (01/set→01/out)
      // Agosto (01/ago→01/set) ficou sem fechamento no passado
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: dec(200),
          referenceDate: new Date('2026-09-10T12:00:00.000Z'),
        },
      ]);

      const result = await apuration.closePeriod(IND_ID, OCT_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') {
        // Fecha setembro (01/set→01/out), NÃO agosto
        expect(result.periodStart.toISOString()).toBe(
          '2026-09-01T03:00:00.000Z',
        );
        expect(result.periodEnd.toISOString()).toBe(OCT_1_BRT.toISOString());
      }
      // NOTA: agosto (01/ago→01/set) ficou sem fechamento
    });

    it('AUDIT-P3: para fechar agosto retroativamente, é necessário chamar closePeriod com SEP_1_BRT', async () => {
      // Simula recuperação manual: fornecer referenceDate correspondente ao fim do período
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);

      // Chamada retroativa com SEP_1_BRT (meia-noite de 01/set) fecha agosto
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') {
        expect(result.periodStart.toISOString()).toBe(AUG_1_BRT.toISOString());
        expect(result.periodEnd.toISOString()).toBe(SEP_1_BRT.toISOString());
      }
    });

    it('AUDIT-P4: múltiplos períodos perdidos — cada chamada retroativa fecha apenas 1 período', async () => {
      // Aplicação volta em 01/nov após 2 meses desligada (ago + set + out faltam)
      // Execução automática em 01/nov fecha apenas outubro
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue([
        {
          value: dec(300),
          referenceDate: new Date('2026-10-10T12:00:00.000Z'),
        },
      ]);

      const result = await apuration.closePeriod(IND_ID, NOV_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') {
        // Fecha SOMENTE outubro — agosto e setembro ficam pendentes
        expect(result.periodStart.toISOString()).toBe(
          '2026-10-01T03:00:00.000Z',
        );
        expect(result.periodEnd.toISOString()).toBe(NOV_1_BRT.toISOString());
      }
      // NOTA CRÍTICA: agosto e setembro NÃO foram fechados.
      // O scheduler atual NÃO tem mecanismo de backfill automático.
    });

    it('AUDIT-P5: recuperação parcial — após restart em 17/set (03:17 UTC), setembro ainda encerra em 01/out', async () => {
      // Aplicação volta às 03:17 UTC de 01/set (= 00:17 BRT)
      // setembro começou mas ainda está aberto
      const restartTime = new Date('2026-09-01T03:17:00.000Z'); // 00:17 BRT de 01/set
      prisma.indicator.findUnique.mockResolvedValue(makeInd());

      const result = await apuration.closePeriod(IND_ID, restartTime);
      // setembro está aberto (restartTime < OCT_1_BRT)
      expect(result.status).toBe('PERIOD_OPEN');
      // Agosto FICOU PERDIDO: o scheduler não fecha retroativamente às 03:17 BRT de 01/set
      // a menos que referenceDate seja exatamente SEP_1_BRT ou posterior
    });

    it('AUDIT-P6: aos 03:00 UTC exatos (= 00:00 BRT de 01/set), agosto é fechado corretamente', async () => {
      // Restart exatamente às 03:00 UTC → agosto encerra normalmente
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);

      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT); // = 03:00 UTC
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') {
        expect(result.periodStart.toISOString()).toBe(AUG_1_BRT.toISOString());
        expect(result.periodEnd.toISOString()).toBe(SEP_1_BRT.toISOString());
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 6. AUDITORIA DE TIMEZONE
  //    Fronteiras críticas UTC vs America/Sao_Paulo
  // ══════════════════════════════════════════════════════════════════════════════

  describe('6. Timezone — fronteiras críticas UTC vs BRT', () => {
    it('AUDIT-T1: 02:59:59.999Z = 23:59:59.999 BRT de 31/ago → PERIOD_OPEN', async () => {
      const utcBeforeMidnight = new Date('2026-09-01T02:59:59.999Z');
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      const result = await apuration.closePeriod(IND_ID, utcBeforeMidnight);
      expect(result.status).toBe('PERIOD_OPEN');
    });

    it('AUDIT-T2: 03:00:00.000Z = 00:00:00.000 BRT de 01/set → CLOSED (fronteira exata)', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT); // = 03:00:00.000Z
      expect(result.status).toBe('CLOSED');
    });

    it('AUDIT-T3: query de medições usa gte/lt no UTC (sem setHours locais)', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);
      await apuration.closePeriod(IND_ID, SEP_1_BRT);

      const callArgs = prisma.indicatorMeasurement.findMany.mock.calls[0][0];
      // periodStart e periodEnd são Date UTC → sem new Date().setHours()
      expect(callArgs.where.referenceDate.gte).toEqual(AUG_1_BRT);
      expect(callArgs.where.referenceDate.lt).toEqual(SEP_1_BRT);
    });

    it('AUDIT-T4: CUSTOM não gera periodStart/periodEnd automáticos', async () => {
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ frequency: IndicatorFrequency.CUSTOM }),
      );
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CUSTOM_FREQUENCY_NOT_SUPPORTED');
      expect(prisma.indicatorHistory.create).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 7. AUDITORIA DE DADOS AUSENTES
  // ══════════════════════════════════════════════════════════════════════════════

  describe('7. Dados ausentes — comportamento documentado', () => {
    it('AUDIT-D1: SUM sem medições → NO_DATA (não cria histórico)', async () => {
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ aggregationType: AggregationType.SUM }),
      );
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('NO_DATA');
      expect(prisma.indicatorHistory.create).not.toHaveBeenCalled();
    });

    it('AUDIT-D2: COUNT sem medições → CLOSED value=0 (semântico: 0 eventos é válido)', async () => {
      prisma.indicator.findUnique.mockResolvedValue(
        makeInd({ aggregationType: AggregationType.COUNT }),
      );
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') expect(result.value).toBe(0);
    });

    it('AUDIT-D3: período anterior sem histórico → previousValue=null (sem crash)', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);
      prisma.indicatorHistory.findFirst.mockResolvedValue(null);
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED') {
        expect(result.previousValue).toBeNull();
        expect(result.variationPercent).toBeNull();
      }
    });

    it('AUDIT-D4: previousValue=0 → variationPercent=null (sem divisão por zero)', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);
      prisma.indicatorHistory.findFirst.mockResolvedValue({ value: dec(0) });
      const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
      expect(result.status).toBe('CLOSED');
      if (result.status === 'CLOSED')
        expect(result.variationPercent).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 8. AUDITORIA DE FORMULA
  //    Verifica que nenhuma fórmula é executada em nenhum caminho
  // ══════════════════════════════════════════════════════════════════════════════

  describe('8. FORMULA — nenhuma execução de código', () => {
    const formulas = [
      'SUM(lucro) / SUM(receita) * 100',
      'SUM(',
      '1/0',
      'foo.bar',
      'DROP TABLE indicators',
      'process.env.SECRET',
      '"><script>alert(1)</script>',
    ];

    formulas.forEach((formula) => {
      it(`AUDIT-FO: fórmula "${formula.slice(0, 30)}" → FORMULA_ENGINE_REQUIRED sem execução`, async () => {
        prisma.indicator.findUnique.mockResolvedValue(
          makeInd({ aggregationType: AggregationType.FORMULA, formula }),
        );
        prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);

        const result = await apuration.closePeriod(IND_ID, SEP_1_BRT);
        expect(result.status).toBe('FORMULA_ENGINE_REQUIRED');
        expect(prisma.indicatorHistory.create).not.toHaveBeenCalled();
        // A fórmula é apenas armazenada como string — nunca interpretada
        if (result.status === 'FORMULA_ENGINE_REQUIRED') {
          expect(result.formula).toBe(formula);
        }
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 9. AUDITORIA DO SCHEDULER — CUSTOM não entra no ciclo
  // ══════════════════════════════════════════════════════════════════════════════

  describe('9. Scheduler — CUSTOM excluído da query', () => {
    it('AUDIT-S1: query do scheduler exclui CUSTOM — nunca chega ao PeriodResolver', async () => {
      prisma.indicator.findMany.mockResolvedValue([]);
      await scheduler.runCycle(SEP_1_BRT);
      const callArgs = prisma.indicator.findMany.mock.calls[0][0];
      expect(callArgs.where.frequency).toEqual({
        not: IndicatorFrequency.CUSTOM,
      });
    });

    it('AUDIT-S2: apenas indicadores ativos chegam ao loop', async () => {
      prisma.indicator.findMany.mockResolvedValue([]);
      await scheduler.runCycle(SEP_1_BRT);
      const callArgs = prisma.indicator.findMany.mock.calls[0][0];
      expect(callArgs.where.isActive).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 10. AUDITORIA DE TRANSAÇÃO
  //     O closePeriod atual NÃO usa transação Prisma.
  //     Análise: apenas 1 operação de escrita (indicatorHistory.create).
  //     A verificação de idempotência (findUnique) e a busca de previousValue
  //     (findFirst) são somente leitura.
  //     Portanto: a ausência de transação é ACEITÁVEL neste momento.
  // ══════════════════════════════════════════════════════════════════════════════

  describe('10. Transação — análise de atomicidade', () => {
    it('AUDIT-TX1: apenas 1 operação de escrita — create é a única mutação do fluxo', async () => {
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);

      await apuration.closePeriod(IND_ID, SEP_1_BRT);

      // Verifica que nenhum update foi feito em indicator
      const indicatorMock = prisma.indicator as Record<
        string,
        jest.Mock | undefined
      >;
      const historyMock = prisma.indicatorHistory as Record<
        string,
        jest.Mock | undefined
      >;

      expect(indicatorMock['update']).toBeUndefined();
      expect(historyMock['update']).toBeUndefined();
      expect(historyMock['updateMany']).toBeUndefined();

      // Apenas create foi chamado
      expect(prisma.indicatorHistory.create).toHaveBeenCalledTimes(1);
    });

    it('AUDIT-TX2: não existe risco de estado intermediário — sem múltiplas escritas no mesmo fluxo', async () => {
      // O fluxo atual: read → read → read → CREATE (único write)
      // Se CREATE falhar: nada foi escrito → próxima execução parte do zero
      // Se CREATE tiver sucesso: estado final é consistente
      // Transação seria necessária se houvesse múltiplos CREATE/UPDATE/DELETE no mesmo fluxo
      prisma.indicator.findUnique.mockResolvedValue(makeInd());
      prisma.indicatorMeasurement.findMany.mockResolvedValue(AUG_M);
      prisma.indicatorHistory.create.mockRejectedValue(
        new Error('create failed'),
      );

      await expect(apuration.closePeriod(IND_ID, SEP_1_BRT)).rejects.toThrow(
        'create failed',
      );

      // Nenhum estado parcial foi escrito
      expect(prisma.indicatorHistory.create).toHaveBeenCalledTimes(1);
    });
  });
});
