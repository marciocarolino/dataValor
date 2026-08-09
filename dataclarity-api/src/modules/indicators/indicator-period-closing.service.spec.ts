import {
  IndicatorPeriodClosingService,
  IndicatorForClosing,
  PeriodClosingResult,
  CustomPeriodClosingResult,
  isResolvedPeriodClosing,
} from './indicator-period-closing.service';
import { PeriodResolverService } from './period-resolver.service';
import { IndicatorFrequency } from './enums/indicator-frequency.enum';

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Cria meia-noite BRT no instante certo (BRT = UTC-3 sem DST) */
const brt = (dateStr: string): Date => new Date(`${dateStr}T03:00:00.000Z`);

/** Indicador padrão (MONTHLY, ativo) */
const makeIndicator = (
  frequency: IndicatorFrequency = IndicatorFrequency.MONTHLY,
  isActive = true,
): IndicatorForClosing => ({
  id: `ind-${frequency.toLowerCase()}`,
  frequency,
  isActive,
});

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('IndicatorPeriodClosingService', () => {
  let resolver: PeriodResolverService;
  let svc: IndicatorPeriodClosingService;

  beforeEach(() => {
    resolver = new PeriodResolverService();
    svc = new IndicatorPeriodClosingService(resolver);
  });

  // ── DAILY ──────────────────────────────────────────────────────────────────

  describe('DAILY', () => {
    const ind = makeIndicator(IndicatorFrequency.DAILY);

    it('1. encerrado: referenceDate = dia seguinte → isClosed=true', () => {
      // Período: 09/08/2026; referência: 10/08 (dia seguinte = periodEnd)
      const ref = brt('2026-08-10');
      const r = svc.check(ind, ref) as PeriodClosingResult;
      expect(isResolvedPeriodClosing(r)).toBe(true);
      expect(r.isClosed).toBe(true);
      expect(r.isReadyForClosing).toBe(true);
    });

    it('2. ainda aberto: referenceDate = meio-dia do mesmo dia → isClosed=false', () => {
      // 12:00 BRT de 09/ago (15:00 UTC): o período de 09/ago ainda não encerrou
      const ref = new Date('2026-08-09T15:00:00.000Z'); // 12:00 BRT de 09/ago
      const r = svc.check(ind, ref) as PeriodClosingResult;
      expect(r.isClosed).toBe(false);
      expect(r.isReadyForClosing).toBe(false);
    });
  });

  // ── WEEKLY ─────────────────────────────────────────────────────────────────

  describe('WEEKLY', () => {
    const ind = makeIndicator(IndicatorFrequency.WEEKLY);

    it('3. encerrado: referenceDate = segunda seguinte (periodEnd)', () => {
      // Semana 03/08–09/08 BRT; periodEnd = 10/08 (próxima segunda)
      const ref = brt('2026-08-10'); // segunda-feira = periodEnd
      const r = svc.check(ind, ref) as PeriodClosingResult;
      expect(r.isClosed).toBe(true);
    });

    it('4. ainda aberto: referenceDate = domingo (último dia da semana)', () => {
      const ref = brt('2026-08-09'); // domingo, dentro da semana
      const r = svc.check(ind, ref) as PeriodClosingResult;
      expect(r.isClosed).toBe(false);
    });
  });

  // ── MONTHLY ────────────────────────────────────────────────────────────────

  describe('MONTHLY', () => {
    const ind = makeIndicator(IndicatorFrequency.MONTHLY);

    it('5. encerrado: referenceDate = 01/09 (periodEnd de agosto)', () => {
      const ref = brt('2026-09-01');
      const r = svc.check(ind, ref) as PeriodClosingResult;
      expect(r.isClosed).toBe(true);
      expect(r.isReadyForClosing).toBe(true);
    });

    it('6. ainda aberto: referenceDate = 15/08 (dentro de agosto)', () => {
      const ref = brt('2026-08-15');
      const r = svc.check(ind, ref) as PeriodClosingResult;
      expect(r.isClosed).toBe(false);
      expect(r.isReadyForClosing).toBe(false);
    });

    it('periodStart e periodEnd retornados corretamente', () => {
      const ref = brt('2026-09-01');
      const r = svc.check(ind, ref) as PeriodClosingResult;
      // Agosto encerrado
      expect(r.periodStart.toISOString()).toBe('2026-08-01T03:00:00.000Z');
      expect(r.periodEnd.toISOString()).toBe('2026-09-01T03:00:00.000Z');
    });

    it('indicatorId preservado no resultado', () => {
      const r = svc.check(ind, brt('2026-09-01')) as PeriodClosingResult;
      expect(r.indicatorId).toBe(ind.id);
    });
  });

  // ── QUARTERLY ──────────────────────────────────────────────────────────────

  describe('QUARTERLY', () => {
    const ind = makeIndicator(IndicatorFrequency.QUARTERLY);

    it('7. encerrado: referenceDate = 01/10 (início Q4, periodEnd de Q3)', () => {
      const ref = brt('2026-10-01');
      const r = svc.check(ind, ref) as PeriodClosingResult;
      expect(r.isClosed).toBe(true);
    });

    it('8. ainda aberto: referenceDate = 15/08 (dentro Q3)', () => {
      const ref = brt('2026-08-15');
      const r = svc.check(ind, ref) as PeriodClosingResult;
      expect(r.isClosed).toBe(false);
    });
  });

  // ── SEMESTERLY ─────────────────────────────────────────────────────────────

  describe('SEMESTERLY', () => {
    const ind = makeIndicator(IndicatorFrequency.SEMESTERLY);

    it('9. encerrado: referenceDate = 01/07 (periodEnd do S1)', () => {
      // brt('2026-07-01') = 2026-07-01T03:00:00Z = meia-noite BRT de 01/jul
      // ref - 1ms = 30/jun BRT → resolve S1 (jan-jun): periodEnd = 2026-07-01T03:00:00Z
      // isClosed: periodEnd (01/jul 03:00Z) <= referenceDate (01/jul 03:00Z) → TRUE
      const ref = brt('2026-07-01');
      const r = svc.check(ind, ref) as PeriodClosingResult;
      expect(r.isClosed).toBe(true);
    });

    it('9b. encerrado: referenceDate = 01/01/2027 (fim do S2 de 2026)', () => {
      const ref = brt('2027-01-01');
      const r = svc.check(ind, ref) as PeriodClosingResult;
      expect(r.isClosed).toBe(true);
    });

    it('10. ainda aberto: referenceDate = 30/06 (último dia de S1)', () => {
      const ref = brt('2026-06-30');
      const r = svc.check(ind, ref) as PeriodClosingResult;
      expect(r.isClosed).toBe(false);
    });
  });

  // ── YEARLY ─────────────────────────────────────────────────────────────────

  describe('YEARLY', () => {
    const ind = makeIndicator(IndicatorFrequency.YEARLY);

    it('11. encerrado: referenceDate = 01/01/2027', () => {
      const ref = brt('2027-01-01');
      const r = svc.check(ind, ref) as PeriodClosingResult;
      expect(r.isClosed).toBe(true);
    });

    it('12. ainda aberto: referenceDate = 31/12/2026', () => {
      const ref = brt('2026-12-31');
      const r = svc.check(ind, ref) as PeriodClosingResult;
      expect(r.isClosed).toBe(false);
    });
  });

  // ── CUSTOM ─────────────────────────────────────────────────────────────────

  describe('13. CUSTOM', () => {
    const ind = makeIndicator(IndicatorFrequency.CUSTOM);

    it('retorna CustomPeriodClosingResult com isClosed=false', () => {
      const r = svc.check(ind, new Date()) as CustomPeriodClosingResult;
      expect(isResolvedPeriodClosing(r)).toBe(false);
      expect(r.isClosed).toBe(false);
      expect(r.isReadyForClosing).toBe(false);
      expect(r.requiresManualConfiguration).toBe(true);
      expect(typeof r.message).toBe('string');
    });

    it('frequency e indicatorId preservados no resultado CUSTOM', () => {
      const r = svc.check(ind, new Date()) as CustomPeriodClosingResult;
      expect(r.frequency).toBe(IndicatorFrequency.CUSTOM);
      expect(r.indicatorId).toBe(ind.id);
    });
  });

  // ── FRONTEIRAS EXATAS ──────────────────────────────────────────────────────

  describe('Casos de borda temporais', () => {
    const ind = makeIndicator(IndicatorFrequency.MONTHLY);

    it('14. exatamente no instante de periodEnd → isClosed=true (periodEnd <= ref)', () => {
      // periodEnd de agosto = 2026-09-01T03:00:00.000Z
      const exactlyAtPeriodEnd = new Date('2026-09-01T03:00:00.000Z');
      const r = svc.check(ind, exactlyAtPeriodEnd) as PeriodClosingResult;
      expect(r.isClosed).toBe(true);
    });

    it('15. 1ms antes de periodEnd → isClosed=false', () => {
      const oneMilliBefore = new Date('2026-09-01T02:59:59.999Z');
      const r = svc.check(ind, oneMilliBefore) as PeriodClosingResult;
      expect(r.isClosed).toBe(false);
    });

    it('16. 1h depois de periodEnd → isClosed=false (novo período ainda em curso)', () => {
      // 1h depois de periodEnd: já estamos em setembro (novo período ativo)
      // ref - 1ms = 2026-09-01T03:59:59.999Z = 00:59 BRT de 01/set → setembro
      // periodEnd de set = 01/out → 01/out > 04:00Z de 01/set → isClosed=false
      // O período de AGOSTO já foi fechado; o de SETEMBRO ainda está em curso
      const oneHourAfter = new Date('2026-09-01T04:00:00.000Z'); // 01:00 BRT de 01/set
      const r = svc.check(ind, oneHourAfter) as PeriodClosingResult;
      // Setembro ainda não encerrou → isClosed=false (setembro está ativo)
      expect(r.isClosed).toBe(false);
      // Mas o periodStart deve ser setembro
      expect(r.periodStart.toISOString()).toBe('2026-09-01T03:00:00.000Z');
    });
  });

  // ── TIMEZONE ───────────────────────────────────────────────────────────────

  describe('17. Timezone America/Sao_Paulo', () => {
    const ind = makeIndicator(IndicatorFrequency.MONTHLY);

    it('timezone preservado no resultado', () => {
      const r = svc.check(ind, brt('2026-08-15')) as PeriodClosingResult;
      expect(r.timezone).toBe('America/Sao_Paulo');
    });

    it('referenceDate às 02:59 UTC de 01/09 = 23:59 BRT de 31/08 → agosto ainda aberto', () => {
      // 02:59 UTC de 01/09 = 23:59 BRT de 31/08 (ainda dentro de agosto em BRT)
      const ref = new Date('2026-09-01T02:59:59.000Z');
      const r = svc.check(ind, ref) as PeriodClosingResult;
      // Em BRT: 31/ago, portanto o período de agosto ainda não encerrou
      expect(r.isClosed).toBe(false);
    });

    it('referenceDate às 03:00 UTC de 01/09 = meia-noite BRT de 01/09 → agosto encerrado', () => {
      // 03:00 UTC de 01/09 = 00:00 BRT de 01/09 = periodEnd de agosto
      const ref = new Date('2026-09-01T03:00:00.000Z');
      const r = svc.check(ind, ref) as PeriodClosingResult;
      expect(r.isClosed).toBe(true);
    });
  });

  // ── ESTADO isActive ────────────────────────────────────────────────────────

  describe('Estado isActive como contexto informacional', () => {
    it('18. indicador ATIVO: resultado inclui isActive=true, resolução não bloqueada', () => {
      const ind = makeIndicator(IndicatorFrequency.MONTHLY, true);
      const r = svc.check(ind, brt('2026-09-01')) as PeriodClosingResult;
      expect(r.isActive).toBe(true);
      expect(r.isClosed).toBe(true); // resolução funciona normalmente
    });

    it('19. indicador INATIVO: resultado inclui isActive=false, resolução não bloqueada', () => {
      const ind = makeIndicator(IndicatorFrequency.MONTHLY, false);
      const r = svc.check(ind, brt('2026-09-01')) as PeriodClosingResult;
      expect(r.isActive).toBe(false);
      expect(r.isClosed).toBe(true); // serviço NÃO bloqueia indicadores inativos
    });

    it('indicador INATIVO com período ainda aberto: isClosed=false, isActive=false', () => {
      const ind = makeIndicator(IndicatorFrequency.MONTHLY, false);
      const r = svc.check(ind, brt('2026-08-15')) as PeriodClosingResult;
      expect(r.isActive).toBe(false);
      expect(r.isClosed).toBe(false);
    });
  });

  // ── METADADOS E CONSISTÊNCIA ───────────────────────────────────────────────

  describe('Metadados e consistência', () => {
    it('referenceDate preservada no resultado', () => {
      const ref = brt('2026-09-01');
      const ind = makeIndicator(IndicatorFrequency.MONTHLY);
      const r = svc.check(ind, ref) as PeriodClosingResult;
      expect(r.referenceDate).toBe(ref);
    });

    it('frequency preservada no resultado', () => {
      const ind = makeIndicator(IndicatorFrequency.QUARTERLY);
      const r = svc.check(ind, brt('2026-10-01')) as PeriodClosingResult;
      expect(r.frequency).toBe(IndicatorFrequency.QUARTERLY);
    });

    it('isClosed === isReadyForClosing em todos os casos', () => {
      const freqs = [
        IndicatorFrequency.DAILY,
        IndicatorFrequency.WEEKLY,
        IndicatorFrequency.MONTHLY,
        IndicatorFrequency.QUARTERLY,
        IndicatorFrequency.SEMESTERLY,
        IndicatorFrequency.YEARLY,
      ];
      // referenceDate bem no futuro: todos devem estar encerrados
      const future = brt('2030-01-01');
      for (const f of freqs) {
        const ind = makeIndicator(f);
        const r = svc.check(ind, future) as PeriodClosingResult;
        expect(r.isClosed).toBe(r.isReadyForClosing);
      }
    });

    it('checkMany retorna um resultado por indicador', () => {
      const indicators = [
        makeIndicator(IndicatorFrequency.DAILY),
        makeIndicator(IndicatorFrequency.MONTHLY),
        makeIndicator(IndicatorFrequency.CUSTOM),
      ];
      const results = svc.checkMany(indicators, brt('2026-09-01'));
      expect(results).toHaveLength(3);
      expect(isResolvedPeriodClosing(results[0])).toBe(true);
      expect(isResolvedPeriodClosing(results[1])).toBe(true);
      expect(isResolvedPeriodClosing(results[2])).toBe(false);
    });
  });
});
