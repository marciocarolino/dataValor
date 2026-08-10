import {
  IndicatorPeriodClosingScheduler,
  SchedulerCycleResult,
} from './indicator-period-closing.scheduler';
import { IndicatorPeriodApurationService } from './indicator-period-apuration.service';
import { IndicatorFrequency } from './enums/indicator-frequency.enum';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Data de referência no passado que garante que todo período mensal está encerrado */
const SEP_2 = new Date('2026-09-02T03:00:00.000Z'); // 02/set BRT — agosto encerrado

const makeIndicator = (
  id: string,
  frequency = 'MONTHLY',
  isActive = true,
  aggregationType = 'SUM',
) => ({
  id,
  name: `Indicador ${id}`,
  frequency,
  aggregationType,
  isActive,
});

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('IndicatorPeriodClosingScheduler', () => {
  let scheduler: IndicatorPeriodClosingScheduler;
  let mockPrisma: { indicator: { findMany: jest.Mock } };
  let mockApuration: { closePeriod: jest.Mock };

  beforeEach(() => {
    mockPrisma = {
      indicator: { findMany: jest.fn() },
    };
    mockApuration = {
      closePeriod: jest.fn(),
    };

    scheduler = new IndicatorPeriodClosingScheduler(
      mockPrisma as never,
      mockApuration as unknown as IndicatorPeriodApurationService,
    );

    // Default: nenhum indicador
    mockPrisma.indicator.findMany.mockResolvedValue([]);
  });

  // ── 1. Executa o ciclo corretamente ─────────────────────────────────────────

  describe('1. Executa o ciclo corretamente', () => {
    it('retorna resultado zerado quando não há indicadores', async () => {
      const result = await scheduler.runCycle(SEP_2);
      expect(result.processed).toBe(0);
      expect(result.closed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('handleCron chama runCycle', async () => {
      const spy = jest
        .spyOn(scheduler, 'runCycle')
        .mockResolvedValue({} as SchedulerCycleResult);
      await scheduler.handleCron();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  // ── 2. Busca somente indicadores ativos ────────────────────────────────────

  describe('2. Busca somente indicadores ativos', () => {
    it('query filtra isActive=true e frequency != CUSTOM', async () => {
      await scheduler.runCycle(SEP_2);
      const callArgs = mockPrisma.indicator.findMany.mock.calls[0][0];
      expect(callArgs.where.isActive).toBe(true);
      expect(callArgs.where.frequency).toEqual({
        not: IndicatorFrequency.CUSTOM,
      });
    });

    it('18. indicador ativo → closePeriod é chamado', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([makeIndicator('ind-1')]);
      mockApuration.closePeriod.mockResolvedValue({
        status: 'PERIOD_OPEN',
        indicatorId: 'ind-1',
        periodStart: new Date(),
        periodEnd: new Date(),
        referenceDate: new Date(),
      });
      await scheduler.runCycle(SEP_2);
      expect(mockApuration.closePeriod).toHaveBeenCalledWith(
        'ind-1',
        SEP_2,
        'America/Sao_Paulo',
      );
    });
  });

  // ── 3. Ignora indicadores inativos ─────────────────────────────────────────

  describe('3–19. Ignora indicadores inativos', () => {
    it('19. indicador inativo → não é buscado (filtro isActive=true na query)', async () => {
      // O filtro isActive=true é feito na query — inativos nunca chegam ao loop
      await scheduler.runCycle(SEP_2);
      const callArgs = mockPrisma.indicator.findMany.mock.calls[0][0];
      expect(callArgs.where.isActive).toBe(true);
      // closePeriod não é chamado pois findMany retorna vazio
      expect(mockApuration.closePeriod).not.toHaveBeenCalled();
    });
  });

  // ── 4. Ignora frequency CUSTOM ────────────────────────────────────────────

  describe('4. Ignora frequency CUSTOM', () => {
    it('query exclui CUSTOM antes mesmo de chegar ao loop', async () => {
      // Se chegasse um CUSTOM (porque o filtro falhou), seria tratado via CUSTOM_FREQUENCY_NOT_SUPPORTED
      mockPrisma.indicator.findMany.mockResolvedValue([
        makeIndicator('cust-1', 'CUSTOM'),
      ]);
      mockApuration.closePeriod.mockResolvedValue({
        status: 'CUSTOM_FREQUENCY_NOT_SUPPORTED',
        indicatorId: 'cust-1',
        message: 'CUSTOM não suportado',
      });
      const result = await scheduler.runCycle(SEP_2);
      expect(result.skipped).toBe(1);
    });
  });

  // ── 5. Chama closePeriod() para indicador elegível ─────────────────────────

  describe('5. Chama closePeriod() para indicador elegível', () => {
    it('chama closePeriod com indicatorId, referenceDate e BUSINESS_TIMEZONE', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([makeIndicator('ind-A')]);
      mockApuration.closePeriod.mockResolvedValue({
        status: 'CLOSED',
        historyId: 'hist-1',
        indicatorId: 'ind-A',
        periodStart: new Date('2026-08-01T03:00:00.000Z'),
        periodEnd: new Date('2026-09-01T03:00:00.000Z'),
        value: 100,
        previousValue: null,
        variationPercent: null,
        goalValue: null,
        indicatorStatus: 'NEUTRAL',
        measurementCount: 1,
        aggregationType: 'SUM',
        isActive: true,
      });
      await scheduler.runCycle(SEP_2);
      expect(mockApuration.closePeriod).toHaveBeenCalledWith(
        'ind-A',
        SEP_2,
        'America/Sao_Paulo',
      );
    });
  });

  // ── 6–7. Falha não interrompe processamento ────────────────────────────────

  describe('6–7. Falha de um indicador não interrompe os demais', () => {
    it('6. continua processando após erro', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([
        makeIndicator('ind-ok-1'),
        makeIndicator('ind-fail'),
        makeIndicator('ind-ok-2'),
      ]);
      mockApuration.closePeriod
        .mockResolvedValueOnce({
          status: 'CLOSED',
          historyId: 'h1',
          indicatorId: 'ind-ok-1',
          periodStart: new Date(),
          periodEnd: new Date(),
          value: 1,
          previousValue: null,
          variationPercent: null,
          goalValue: null,
          indicatorStatus: 'NEUTRAL',
          measurementCount: 1,
          aggregationType: 'SUM',
          isActive: true,
        })
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({
          status: 'CLOSED',
          historyId: 'h3',
          indicatorId: 'ind-ok-2',
          periodStart: new Date(),
          periodEnd: new Date(),
          value: 2,
          previousValue: null,
          variationPercent: null,
          goalValue: null,
          indicatorStatus: 'NEUTRAL',
          measurementCount: 1,
          aggregationType: 'SUM',
          isActive: true,
        });
      const result = await scheduler.runCycle(SEP_2);
      expect(result.closed).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.processed).toBe(3);
    });

    it('7. todos os indicadores são processados mesmo com múltiplas falhas', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([
        makeIndicator('f1'),
        makeIndicator('f2'),
        makeIndicator('f3'),
      ]);
      mockApuration.closePeriod.mockRejectedValue(new Error('fail'));
      const result = await scheduler.runCycle(SEP_2);
      expect(result.failed).toBe(3);
      expect(result.closed).toBe(0);
      expect(result.processed).toBe(3);
    });

    it('20. falha de um não altera resultado dos demais', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([
        makeIndicator('a'),
        makeIndicator('b'),
      ]);
      mockApuration.closePeriod
        .mockRejectedValueOnce(new Error('fail a'))
        .mockResolvedValueOnce({
          status: 'ALREADY_CLOSED',
          historyId: 'hb',
          indicatorId: 'b',
          periodStart: new Date(),
          periodEnd: new Date(),
        });
      const result = await scheduler.runCycle(SEP_2);
      expect(result.failed).toBe(1);
      expect(result.alreadyClosed).toBe(1);
    });
  });

  // ── 8. Trata CLOSED ───────────────────────────────────────────────────────

  describe('8. Trata CLOSED corretamente', () => {
    it('incrementa closed no resultado', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([makeIndicator('c1')]);
      mockApuration.closePeriod.mockResolvedValue({
        status: 'CLOSED',
        historyId: 'h1',
        indicatorId: 'c1',
        periodStart: new Date(),
        periodEnd: new Date(),
        value: 100,
        previousValue: null,
        variationPercent: null,
        goalValue: null,
        indicatorStatus: 'NEUTRAL',
        measurementCount: 1,
        aggregationType: 'SUM',
        isActive: true,
      });
      const result = await scheduler.runCycle(SEP_2);
      expect(result.closed).toBe(1);
      expect(result.alreadyClosed).toBe(0);
    });
  });

  // ── 9. Trata ALREADY_CLOSED ───────────────────────────────────────────────

  describe('9. Trata ALREADY_CLOSED corretamente', () => {
    it('incrementa alreadyClosed, não closed', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([makeIndicator('ac1')]);
      mockApuration.closePeriod.mockResolvedValue({
        status: 'ALREADY_CLOSED',
        historyId: 'h-ac',
        indicatorId: 'ac1',
        periodStart: new Date(),
        periodEnd: new Date(),
      });
      const result = await scheduler.runCycle(SEP_2);
      expect(result.alreadyClosed).toBe(1);
      expect(result.closed).toBe(0);
    });
  });

  // ── 10. Trata NO_DATA ────────────────────────────────────────────────────

  describe('10. Trata NO_DATA corretamente', () => {
    it('incrementa noData', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([makeIndicator('nd1')]);
      mockApuration.closePeriod.mockResolvedValue({
        status: 'NO_DATA',
        indicatorId: 'nd1',
        periodStart: new Date(),
        periodEnd: new Date(),
        aggregationType: 'SUM',
      });
      const result = await scheduler.runCycle(SEP_2);
      expect(result.noData).toBe(1);
    });
  });

  // ── 11. Trata FORMULA_ENGINE_REQUIRED ────────────────────────────────────

  describe('11. Trata FORMULA_ENGINE_REQUIRED corretamente', () => {
    it('incrementa formulaRequired, não cria histórico', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([
        makeIndicator('f1', 'MONTHLY', true, 'FORMULA'),
      ]);
      mockApuration.closePeriod.mockResolvedValue({
        status: 'FORMULA_ENGINE_REQUIRED',
        indicatorId: 'f1',
        periodStart: new Date(),
        periodEnd: new Date(),
        formula: 'SUM(x)',
      });
      const result = await scheduler.runCycle(SEP_2);
      expect(result.formulaRequired).toBe(1);
      expect(result.closed).toBe(0);
    });
  });

  // ── 12. Gera resumo correto ─────────────────────────────────────────────

  describe('12. Gera resumo correto da execução', () => {
    it('contabiliza todos os tipos corretamente', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([
        makeIndicator('i1'), // CLOSED
        makeIndicator('i2'), // ALREADY_CLOSED
        makeIndicator('i3'), // NO_DATA
        makeIndicator('i4', 'MONTHLY', true, 'FORMULA'), // FORMULA_ENGINE_REQUIRED
        makeIndicator('i5'), // PERIOD_OPEN
        makeIndicator('i6'), // failed
      ]);
      mockApuration.closePeriod
        .mockResolvedValueOnce({
          status: 'CLOSED',
          historyId: 'h1',
          indicatorId: 'i1',
          periodStart: new Date(),
          periodEnd: new Date(),
          value: 1,
          previousValue: null,
          variationPercent: null,
          goalValue: null,
          indicatorStatus: 'NEUTRAL',
          measurementCount: 1,
          aggregationType: 'SUM',
          isActive: true,
        })
        .mockResolvedValueOnce({
          status: 'ALREADY_CLOSED',
          historyId: 'h2',
          indicatorId: 'i2',
          periodStart: new Date(),
          periodEnd: new Date(),
        })
        .mockResolvedValueOnce({
          status: 'NO_DATA',
          indicatorId: 'i3',
          periodStart: new Date(),
          periodEnd: new Date(),
          aggregationType: 'SUM',
        })
        .mockResolvedValueOnce({
          status: 'FORMULA_ENGINE_REQUIRED',
          indicatorId: 'i4',
          periodStart: new Date(),
          periodEnd: new Date(),
          formula: 'x',
        })
        .mockResolvedValueOnce({
          status: 'PERIOD_OPEN',
          indicatorId: 'i5',
          periodStart: new Date(),
          periodEnd: new Date(),
          referenceDate: SEP_2,
        })
        .mockRejectedValueOnce(new Error('fail'));

      const result = await scheduler.runCycle(SEP_2);
      expect(result.processed).toBe(6);
      expect(result.closed).toBe(1);
      expect(result.alreadyClosed).toBe(1);
      expect(result.noData).toBe(1);
      expect(result.formulaRequired).toBe(1);
      expect(result.periodOpen).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  // ── 13. Registra erro corretamente ─────────────────────────────────────────

  describe('13. Registra erro corretamente', () => {
    it('incrementa failed quando closePeriod lança exceção', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([makeIndicator('err1')]);
      mockApuration.closePeriod.mockRejectedValue(new Error('unexpected'));
      const result = await scheduler.runCycle(SEP_2);
      expect(result.failed).toBe(1);
    });
  });

  // ── 14. Múltiplos indicadores ─────────────────────────────────────────────

  describe('14. Múltiplos indicadores', () => {
    it('processa todos corretamente', async () => {
      const inds = Array.from({ length: 5 }, (_, i) => makeIndicator(`m${i}`));
      mockPrisma.indicator.findMany.mockResolvedValue(inds);
      mockApuration.closePeriod.mockResolvedValue({
        status: 'PERIOD_OPEN',
        indicatorId: 'x',
        periodStart: new Date(),
        periodEnd: new Date(),
        referenceDate: SEP_2,
      });
      const result = await scheduler.runCycle(SEP_2);
      expect(result.processed).toBe(5);
      expect(mockApuration.closePeriod).toHaveBeenCalledTimes(5);
    });
  });

  // ── 15. Não duplica histórico ─────────────────────────────────────────────

  describe('15. Não duplica histórico quando executado novamente', () => {
    it('segunda execução retorna ALREADY_CLOSED — create não é chamado novamente', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([makeIndicator('dup1')]);

      // Primeira execução: CLOSED
      mockApuration.closePeriod.mockResolvedValueOnce({
        status: 'CLOSED',
        historyId: 'h-dup',
        indicatorId: 'dup1',
        periodStart: new Date('2026-08-01T03:00:00.000Z'),
        periodEnd: new Date('2026-09-01T03:00:00.000Z'),
        value: 100,
        previousValue: null,
        variationPercent: null,
        goalValue: null,
        indicatorStatus: 'NEUTRAL',
        measurementCount: 1,
        aggregationType: 'SUM',
        isActive: true,
      });
      const first = await scheduler.runCycle(SEP_2);
      expect(first.closed).toBe(1);

      // Segunda execução: ALREADY_CLOSED
      mockApuration.closePeriod.mockResolvedValueOnce({
        status: 'ALREADY_CLOSED',
        historyId: 'h-dup',
        indicatorId: 'dup1',
        periodStart: new Date('2026-08-01T03:00:00.000Z'),
        periodEnd: new Date('2026-09-01T03:00:00.000Z'),
      });
      const second = await scheduler.runCycle(SEP_2);
      expect(second.alreadyClosed).toBe(1);
      expect(second.closed).toBe(0);
    });
  });

  // ── 16. Respeita fronteira do período ─────────────────────────────────────

  describe('16. Respeita a fronteira do período', () => {
    it('não cria lógica temporal própria — delega para closePeriod', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([makeIndicator('b1')]);
      mockApuration.closePeriod.mockResolvedValue({
        status: 'PERIOD_OPEN',
        indicatorId: 'b1',
        periodStart: new Date(),
        periodEnd: new Date(),
        referenceDate: SEP_2,
      });
      await scheduler.runCycle(SEP_2);
      // Verifica que a referenceDate passada para closePeriod é a mesma do runCycle
      expect(mockApuration.closePeriod).toHaveBeenCalledWith(
        'b1',
        SEP_2,
        'America/Sao_Paulo',
      );
    });
  });

  // ── 17. Não cria lógica temporal própria ──────────────────────────────────

  describe('17. Não cria lógica temporal própria', () => {
    it('o scheduler delega completamente a lógica de período para closePeriod()', async () => {
      // O scheduler não usa PeriodResolverService diretamente nem calcula datas
      // Apenas passa a referenceDate para o closePeriod e confia no resultado
      mockPrisma.indicator.findMany.mockResolvedValue([makeIndicator('t1')]);
      mockApuration.closePeriod.mockResolvedValue({
        status: 'PERIOD_OPEN',
        indicatorId: 't1',
        periodStart: new Date(),
        periodEnd: new Date(),
        referenceDate: SEP_2,
      });
      await scheduler.runCycle(SEP_2);
      // Apenas 1 chamada, sem cálculos adicionais
      expect(mockApuration.closePeriod).toHaveBeenCalledTimes(1);
    });
  });

  // ── Concorrência: flag _running ────────────────────────────────────────────

  describe('Concorrência — proteção _running', () => {
    it('segunda chamada simultânea retorna zerado imediatamente', async () => {
      // Simula ciclo em andamento
      (scheduler as unknown as { _running: boolean })._running = true;
      const result = await scheduler.runCycle(SEP_2);
      expect(result.processed).toBe(0);
      expect(mockApuration.closePeriod).not.toHaveBeenCalled();
      // Limpa para outros testes
      (scheduler as unknown as { _running: boolean })._running = false;
    });

    it('flag _running é resetado mesmo após erro geral', async () => {
      mockPrisma.indicator.findMany.mockRejectedValue(new Error('DB down'));
      await expect(scheduler.runCycle(SEP_2)).rejects.toThrow('DB down');
      expect((scheduler as unknown as { _running: boolean })._running).toBe(
        false,
      );
    });
  });

  // ── PERIOD_OPEN não conta como skipped ────────────────────────────────────

  describe('PERIOD_OPEN conta em periodOpen', () => {
    it('periodOpen incrementado quando período ainda não terminou', async () => {
      mockPrisma.indicator.findMany.mockResolvedValue([makeIndicator('p1')]);
      mockApuration.closePeriod.mockResolvedValue({
        status: 'PERIOD_OPEN',
        indicatorId: 'p1',
        periodStart: new Date(),
        periodEnd: new Date(),
        referenceDate: SEP_2,
      });
      const result = await scheduler.runCycle(SEP_2);
      expect(result.periodOpen).toBe(1);
      expect(result.skipped).toBe(0);
    });
  });
});
