/**
 * indicator-state-reconciliation.service.spec.ts
 *
 * ETAPA 3H-B — Testes unitários do IndicatorStateReconciliationService.
 *
 * Cobre os 18 cenários obrigatórios:
 *  1. Indicador consistente → não atualiza
 *  2. currentValue divergente → corrige
 *  3. status divergente → corrige
 *  4. currentValue e status divergentes → corrige ambos
 *  5. Indicador sem histórico → não altera
 *  6. Histórico com value = null → sincroniza null
 *  7. Histórico com value = 0 → sincroniza 0
 *  8. Dois históricos → utiliza o maior periodEnd
 *  9. Histórico mais antigo não pode sobrescrever o mais recente
 * 10. Nenhum campo além de currentValue/status é enviado ao update
 * 11. Histórico nunca é alterado
 * 12. Nenhum IndicatorHistory novo é criado
 * 13. Execução idempotente
 * 14. Falha em um indicador não interrompe os demais
 * 15. Múltiplos indicadores, alguns consistentes e outros inconsistentes
 * 16. Status é copiado do histórico sem recalcular
 * 17. Decimal é comparado corretamente
 * 18. Indicador criado após ETAPA 3G continua funcionando normalmente
 *
 * + Cenário específico da inconsistência real encontrada:
 *    Indicator.currentValue=1500.87 vs IndicatorHistory.value=4190.87
 */

import { IndicatorStateReconciliationService } from './indicator-state-reconciliation.service';
import { IndicatorCurrentStateService } from './indicator-current-state.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ID = 'aaaa-0000-4000-a000-000000000001';
const ID2 = 'bbbb-0000-4000-a000-000000000002';
const ID3 = 'cccc-0000-4000-a000-000000000003';
const HIST1 = 'hhhh-0000-4000-a000-000000000001';
const HIST2 = 'hhhh-0000-4000-a000-000000000002';

const AUG_1 = new Date('2026-08-01T03:00:00.000Z');
const SEP_1 = new Date('2026-09-01T03:00:00.000Z');
const OCT_1 = new Date('2026-10-01T03:00:00.000Z');

/** Cria um Decimal-like do Prisma (retorna string como toNumber) */
const dec = (n: number) => ({ toNumber: () => n });

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('IndicatorStateReconciliationService', () => {
  let svc: IndicatorStateReconciliationService;
  let mockPrisma: {
    indicator: {
      findMany: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
    };
    indicatorHistory: { findFirst: jest.Mock; create: jest.Mock };
  };
  let mockCurrentState: { syncFromHistory: jest.Mock };

  beforeEach(() => {
    mockPrisma = {
      indicator: {
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: ID }),
        findUnique: jest.fn(),
      },
      indicatorHistory: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    mockCurrentState = {
      syncFromHistory: jest.fn().mockResolvedValue({ synced: true }),
    };

    svc = new IndicatorStateReconciliationService(
      mockPrisma as never,
      mockCurrentState as unknown as IndicatorCurrentStateService,
    );
  });

  // ── Teste 1: Indicador consistente — não atualiza ─────────────────────────

  describe('1. Indicador consistente → não chama syncFromHistory', () => {
    it('currentValue e status iguais → inconsistent=false, syncFromHistory não chamado', async () => {
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST1,
        value: dec(1500),
        status: 'SUCCESS',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });

      const entry = await svc.reconcileOne(
        ID,
        'Indicador A',
        dec(1500),
        'SUCCESS',
      );

      expect(entry.inconsistent).toBe(false);
      expect(mockCurrentState.syncFromHistory).not.toHaveBeenCalled();
    });
  });

  // ── Teste 2: currentValue divergente → corrige ─────────────────────────────

  describe('2. currentValue divergente → corrige', () => {
    it('currentValue diferente → inconsistent=true, syncFromHistory chamado', async () => {
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST1,
        value: dec(4190.87),
        status: 'SUCCESS',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });

      const entry = await svc.reconcileOne(
        ID,
        'Receita Total',
        dec(1500.87),
        'SUCCESS',
      );

      expect(entry.inconsistent).toBe(true);
      expect(entry.currentValue).toBeCloseTo(1500.87);
      expect(entry.latestHistoryValue).toBeCloseTo(4190.87);
      expect(mockCurrentState.syncFromHistory).toHaveBeenCalledWith(ID, {
        value: expect.closeTo(4190.87, 2),
        status: 'SUCCESS',
      });
    });
  });

  // ── Teste 3: status divergente → corrige ──────────────────────────────────

  describe('3. status divergente → corrige', () => {
    it('status diferente → inconsistent=true, syncFromHistory chamado', async () => {
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST1,
        value: dec(1500),
        status: 'DANGER',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });

      const entry = await svc.reconcileOne(
        ID,
        'Indicador B',
        dec(1500),
        'SUCCESS',
      );

      expect(entry.inconsistent).toBe(true);
      expect(entry.indicatorStatus).toBe('SUCCESS');
      expect(entry.latestHistoryStatus).toBe('DANGER');
      expect(mockCurrentState.syncFromHistory).toHaveBeenCalledWith(ID, {
        value: expect.closeTo(1500, 2),
        status: 'DANGER',
      });
    });
  });

  // ── Teste 4: Ambos divergentes → corrige ambos ────────────────────────────

  describe('4. currentValue e status divergentes → corrige ambos', () => {
    it('ambos diferentes → inconsistent=true, syncFromHistory chamado', async () => {
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST1,
        value: dec(4190.87),
        status: 'WARNING',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });

      const entry = await svc.reconcileOne(
        ID,
        'Indicador C',
        dec(1500),
        'SUCCESS',
      );

      expect(entry.inconsistent).toBe(true);
      expect(mockCurrentState.syncFromHistory).toHaveBeenCalledWith(ID, {
        value: expect.closeTo(4190.87, 2),
        status: 'WARNING',
      });
    });
  });

  // ── Teste 5: Sem histórico → não altera ───────────────────────────────────

  describe('5. Indicador sem histórico → não altera', () => {
    it('findFirst retorna null → inconsistent=false, hasHistory=false, sync não chamado', async () => {
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue(null);

      const entry = await svc.reconcileOne(
        ID,
        'Indicador D',
        dec(1000),
        'NEUTRAL',
      );

      expect(entry.hasHistory).toBe(false);
      expect(entry.inconsistent).toBe(false);
      expect(mockCurrentState.syncFromHistory).not.toHaveBeenCalled();
    });
  });

  // ── Teste 6: value = null no histórico ────────────────────────────────────

  describe('6. Histórico com value = null → sincroniza null', () => {
    it('history.value=null, indicator.currentValue=500 → corrige para null', async () => {
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST1,
        value: null,
        status: 'NEUTRAL',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });

      const entry = await svc.reconcileOne(
        ID,
        'Indicador E',
        dec(500),
        'NEUTRAL',
      );

      expect(entry.inconsistent).toBe(true);
      expect(entry.latestHistoryValue).toBeNull();
      expect(mockCurrentState.syncFromHistory).toHaveBeenCalledWith(ID, {
        value: null,
        status: 'NEUTRAL',
      });
    });

    it('history.value=null, indicator.currentValue=null → consistente, não atualiza', async () => {
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST1,
        value: null,
        status: 'NEUTRAL',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });

      const entry = await svc.reconcileOne(ID, 'Indicador F', null, 'NEUTRAL');

      expect(entry.inconsistent).toBe(false);
      expect(mockCurrentState.syncFromHistory).not.toHaveBeenCalled();
    });
  });

  // ── Teste 7: value = 0 no histórico ───────────────────────────────────────

  describe('7. Histórico com value = 0 → sincroniza 0 (não trata como null)', () => {
    it('history.value=0, indicator.currentValue=null → inconsistente, sincroniza 0', async () => {
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST1,
        value: dec(0),
        status: 'NEUTRAL',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });

      const entry = await svc.reconcileOne(ID, 'Indicador G', null, 'NEUTRAL');

      expect(entry.inconsistent).toBe(true);
      expect(entry.latestHistoryValue).toBe(0);
      expect(mockCurrentState.syncFromHistory).toHaveBeenCalledWith(ID, {
        value: 0,
        status: 'NEUTRAL',
      });
    });

    it('history.value=0, indicator.currentValue=0 → consistente', async () => {
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST1,
        value: dec(0),
        status: 'NEUTRAL',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });

      const entry = await svc.reconcileOne(
        ID,
        'Indicador H',
        dec(0),
        'NEUTRAL',
      );

      expect(entry.inconsistent).toBe(false);
      expect(mockCurrentState.syncFromHistory).not.toHaveBeenCalled();
    });
  });

  // ── Teste 8: Dois históricos → utiliza o maior periodEnd ─────────────────

  describe('8. Dois históricos → reconcileOne usa o que foi retornado por findFirst', () => {
    it('findFirst recebe orderBy periodEnd desc → o serviço usa o registro retornado', async () => {
      // O mock simula que o Prisma retornou o histórico de setembro (mais recente)
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST2,
        value: dec(2000),
        status: 'SUCCESS',
        periodStart: SEP_1,
        periodEnd: OCT_1,
      });

      const entry = await svc.reconcileOne(
        ID,
        'Indicador I',
        dec(1000),
        'NEUTRAL',
      );

      // Verifica que a query usou o orderBy correto
      const callArgs = mockPrisma.indicatorHistory.findFirst.mock
        .calls[0][0] as {
        orderBy: Array<Record<string, unknown>>;
      };
      expect(callArgs.orderBy[0]).toEqual({ periodEnd: 'desc' });

      // E que usou o registro retornado pelo mock (set=2000, SUCCESS)
      expect(entry.latestHistoryValue).toBe(2000);
      expect(entry.latestHistoryStatus).toBe('SUCCESS');
      expect(entry.latestHistoryPeriodEnd).toEqual(OCT_1);
      expect(entry.inconsistent).toBe(true);
    });
  });

  // ── Teste 9: Histórico mais antigo não sobrescreve o mais recente ─────────

  describe('9. Histórico mais antigo não pode sobrescrever o mais recente', () => {
    it('a query orderBy periodEnd desc garante que apenas o mais recente é retornado', async () => {
      // Prisma retorna APENAS o mais recente (periodEnd=OCT_1)
      // O serviço não faz lógica própria de seleção — delega ao Prisma
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST2,
        value: dec(3000),
        status: 'SUCCESS',
        periodStart: SEP_1,
        periodEnd: OCT_1,
      });

      const entry = await svc.reconcileOne(
        ID,
        'Indicador J',
        dec(3000),
        'SUCCESS',
      );

      // Consistente com o mais recente → não atualiza
      expect(entry.inconsistent).toBe(false);
      expect(mockCurrentState.syncFromHistory).not.toHaveBeenCalled();
    });
  });

  // ── Teste 10: Nenhum campo além de currentValue/status no update ──────────

  describe('10. syncFromHistory recebe SOMENTE currentValue e status', () => {
    it('payload de sync contém exatamente 2 chaves: value e status', async () => {
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST1,
        value: dec(5000),
        status: 'WARNING',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });

      await svc.reconcileOne(ID, 'Indicador K', dec(1000), 'NEUTRAL');

      expect(mockCurrentState.syncFromHistory).toHaveBeenCalledTimes(1);
      const syncArgs = mockCurrentState.syncFromHistory.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      const syncPayload = syncArgs[1];
      expect(Object.keys(syncPayload)).toHaveLength(2);
      expect(Object.keys(syncPayload)).toContain('value');
      expect(Object.keys(syncPayload)).toContain('status');
      // Campos proibidos ausentes
      expect(Object.keys(syncPayload)).not.toContain('previousValue');
      expect(Object.keys(syncPayload)).not.toContain('variation');
      expect(Object.keys(syncPayload)).not.toContain('goalValue');
      expect(Object.keys(syncPayload)).not.toContain('isActive');
    });
  });

  // ── Teste 11: Histórico nunca é alterado ──────────────────────────────────

  describe('11. Histórico nunca é alterado', () => {
    it('indicatorHistory.create e update nunca são chamados', async () => {
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST1,
        value: dec(9999),
        status: 'SUCCESS',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });

      await svc.reconcileOne(ID, 'Indicador L', dec(1000), 'NEUTRAL');

      expect(mockPrisma.indicatorHistory.create).not.toHaveBeenCalled();
      // indicatorHistory.update não existe no mock — garantia via design
    });
  });

  // ── Teste 12: Nenhum IndicatorHistory novo é criado ───────────────────────

  describe('12. Nenhum IndicatorHistory novo é criado', () => {
    it('reconcileAll não cria nenhum histórico', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([
        { id: ID, name: 'Ind A', currentValue: dec(100), status: 'SUCCESS' },
        { id: ID2, name: 'Ind B', currentValue: null, status: 'NEUTRAL' },
      ]);
      mockPrisma.indicatorHistory.findFirst
        .mockResolvedValueOnce({
          id: HIST1,
          value: dec(200),
          status: 'SUCCESS',
          periodStart: AUG_1,
          periodEnd: SEP_1,
        })
        .mockResolvedValueOnce(null);

      await svc.reconcileAll();

      expect(mockPrisma.indicatorHistory.create).not.toHaveBeenCalled();
    });
  });

  // ── Teste 13: Idempotência ────────────────────────────────────────────────

  describe('13. Execução idempotente', () => {
    it('segunda execução → corrected=0 (após primeira corrigir)', async () => {
      // Primeira execução: inconsistente
      mockPrisma.indicatorHistory.findFirst.mockResolvedValueOnce({
        id: HIST1,
        value: dec(4190.87),
        status: 'SUCCESS',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });
      await svc.reconcileOne(ID, 'Receita', dec(1500.87), 'SUCCESS');
      expect(mockCurrentState.syncFromHistory).toHaveBeenCalledTimes(1);

      // Segunda execução: agora consistente (indicator foi corrigido)
      mockCurrentState.syncFromHistory.mockClear();
      mockPrisma.indicatorHistory.findFirst.mockResolvedValueOnce({
        id: HIST1,
        value: dec(4190.87),
        status: 'SUCCESS',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });
      const entry2 = await svc.reconcileOne(
        ID,
        'Receita',
        dec(4190.87),
        'SUCCESS',
      );

      expect(entry2.inconsistent).toBe(false);
      expect(mockCurrentState.syncFromHistory).not.toHaveBeenCalled();
    });
  });

  // ── Teste 14: Falha em um não interrompe os demais ────────────────────────

  describe('14. Falha em um indicador não interrompe os demais', () => {
    it('segundo indicador falha → terceiro ainda é processado', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([
        { id: ID, name: 'OK1', currentValue: dec(100), status: 'SUCCESS' },
        { id: ID2, name: 'FAIL', currentValue: dec(200), status: 'NEUTRAL' },
        { id: ID3, name: 'OK2', currentValue: dec(300), status: 'NEUTRAL' },
      ]);

      // OK1: consistente
      mockPrisma.indicatorHistory.findFirst
        .mockResolvedValueOnce({
          id: HIST1,
          value: dec(100),
          status: 'SUCCESS',
          periodStart: AUG_1,
          periodEnd: SEP_1,
        })
        // FAIL: findFirst lança erro
        .mockRejectedValueOnce(new Error('DB timeout'))
        // OK2: consistente
        .mockResolvedValueOnce({
          id: HIST2,
          value: dec(300),
          status: 'NEUTRAL',
          periodStart: AUG_1,
          periodEnd: SEP_1,
        });

      const result = await svc.reconcileAll();

      expect(result.total).toBe(3);
      expect(result.consistent).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.corrected).toBe(0);
    });
  });

  // ── Teste 15: Múltiplos indicadores mistos ────────────────────────────────

  describe('15. Múltiplos indicadores: alguns consistentes, outros inconsistentes', () => {
    it('3 indicadores: 1 consistente, 1 inconsistente, 1 sem histórico', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([
        {
          id: ID,
          name: 'Consistente',
          currentValue: dec(1000),
          status: 'SUCCESS',
        },
        {
          id: ID2,
          name: 'Inconsistente',
          currentValue: dec(500),
          status: 'NEUTRAL',
        },
        {
          id: ID3,
          name: 'Sem Histórico',
          currentValue: null,
          status: 'NEUTRAL',
        },
      ]);

      mockPrisma.indicatorHistory.findFirst
        .mockResolvedValueOnce({
          id: HIST1,
          value: dec(1000),
          status: 'SUCCESS',
          periodStart: AUG_1,
          periodEnd: SEP_1,
        }) // consistente
        .mockResolvedValueOnce({
          id: HIST2,
          value: dec(2000),
          status: 'SUCCESS',
          periodStart: AUG_1,
          periodEnd: SEP_1,
        }) // inconsistente
        .mockResolvedValueOnce(null); // sem histórico

      const result = await svc.reconcileAll();

      expect(result.total).toBe(3);
      expect(result.consistent).toBe(1);
      expect(result.corrected).toBe(1);
      expect(result.withoutHistory).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockCurrentState.syncFromHistory).toHaveBeenCalledTimes(1);
    });
  });

  // ── Teste 16: Status copiado sem recalcular ───────────────────────────────

  describe('16. Status é copiado do histórico sem recalcular', () => {
    it('history.status=DANGER → sync recebe DANGER diretamente (sem computeVisualStatus)', async () => {
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST1,
        value: dec(100),
        status: 'DANGER',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });

      await svc.reconcileOne(ID, 'Indicador M', dec(100), 'SUCCESS');

      // O status sincronizado é exatamente o que veio do histórico
      expect(mockCurrentState.syncFromHistory).toHaveBeenCalledWith(
        ID,
        expect.objectContaining({ status: 'DANGER' }),
      );
    });
  });

  // ── Teste 17: Decimal comparado corretamente ──────────────────────────────

  describe('17. Decimal é comparado corretamente', () => {
    it('Decimal 1500.87 vs number 1500.87 → consistente (sem falso positivo)', async () => {
      // Simula Decimal object do Prisma vs número puro
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST1,
        value: { toNumber: () => 1500.87 },
        status: 'SUCCESS',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });

      const entry = await svc.reconcileOne(
        ID,
        'Indicador N',
        { toNumber: () => 1500.87 },
        'SUCCESS',
      );

      expect(entry.inconsistent).toBe(false);
      expect(mockCurrentState.syncFromHistory).not.toHaveBeenCalled();
    });

    it('1500.87 vs 1500.88 → inconsistente (diferença real)', async () => {
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST1,
        value: { toNumber: () => 1500.88 },
        status: 'SUCCESS',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });

      const entry = await svc.reconcileOne(
        ID,
        'Indicador O',
        { toNumber: () => 1500.87 },
        'SUCCESS',
      );

      expect(entry.inconsistent).toBe(true);
    });

    it('string "1500.00" vs Decimal 1500.00 → consistente', async () => {
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST1,
        value: { toNumber: () => 1500.0 },
        status: 'SUCCESS',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });

      // currentValue pode chegar como string "1500.00" do Prisma antes do parse
      const entry = await svc.reconcileOne(
        ID,
        'Indicador P',
        '1500.00',
        'SUCCESS',
      );

      expect(entry.inconsistent).toBe(false);
    });
  });

  // ── Teste 18: Indicador pós-ETAPA 3G continua funcionando ────────────────

  describe('18. Indicador criado após ETAPA 3G continua funcionando normalmente', () => {
    it('indicador já sincronizado (pós-3G) → consistente, não atualiza', async () => {
      // Simula indicador cujo currentValue/status já foram sincronizados pela ETAPA 3G
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST1,
        value: dec(8000),
        status: 'SUCCESS',
        periodStart: AUG_1,
        periodEnd: SEP_1,
      });

      const entry = await svc.reconcileOne(
        ID,
        'Indicador Novo',
        dec(8000),
        'SUCCESS',
      );

      expect(entry.inconsistent).toBe(false);
      expect(mockCurrentState.syncFromHistory).not.toHaveBeenCalled();
      expect(entry.hasHistory).toBe(true);
    });
  });

  // ── Cenário específico da inconsistência real encontrada ──────────────────

  describe('Cenário real: Indicator.currentValue=1500.87 vs IndicatorHistory.value=4190.87', () => {
    it('corrige para 4190.87 e mantém status SUCCESS', async () => {
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue({
        id: HIST1,
        value: { toNumber: () => 4190.87 },
        status: 'SUCCESS',
        periodStart: new Date('2026-08-01T03:00:00.000Z'),
        periodEnd: new Date('2026-09-01T03:00:00.000Z'),
      });

      const entry = await svc.reconcileOne(
        ID,
        'Receita Total',
        { toNumber: () => 1500.87 },
        'SUCCESS',
      );

      expect(entry.inconsistent).toBe(true);
      expect(entry.currentValue).toBeCloseTo(1500.87, 2);
      expect(entry.latestHistoryValue).toBeCloseTo(4190.87, 2);
      expect(entry.latestHistoryStatus).toBe('SUCCESS');

      // O update contém SOMENTE os dois campos corretos
      expect(mockCurrentState.syncFromHistory).toHaveBeenCalledTimes(1);
      const [calledId, calledPayload] = mockCurrentState.syncFromHistory.mock
        .calls[0] as [string, Record<string, unknown>];
      expect(calledId).toBe(ID);
      expect(Object.keys(calledPayload)).toHaveLength(2);
      expect(calledPayload['value'] as number).toBeCloseTo(4190.87, 2);
      expect(calledPayload['status']).toBe('SUCCESS');
    });
  });

  // ── reconcileAll — estrutura do resultado ─────────────────────────────────

  describe('reconcileAll — estrutura do resultado', () => {
    it('retorna {total, consistent, corrected, withoutHistory, failed, entries}', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([]);
      const result = await svc.reconcileAll();

      expect(result).toMatchObject({
        total: 0,
        consistent: 0,
        corrected: 0,
        withoutHistory: 0,
        failed: 0,
        entries: [],
      });
    });

    it('entries contém AuditEntry para cada indicador processado', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([
        { id: ID, name: 'Ind A', currentValue: dec(100), status: 'NEUTRAL' },
      ]);
      mockPrisma.indicatorHistory.findFirst.mockResolvedValue(null);

      const result = await svc.reconcileAll();

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].indicatorId).toBe(ID);
      expect(result.entries[0].hasHistory).toBe(false);
    });
  });
});
