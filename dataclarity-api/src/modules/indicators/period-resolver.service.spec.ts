import {
  PeriodResolverService,
  PeriodResolution,
  CustomPeriodResolution,
  isPeriodResolution,
  BUSINESS_TIMEZONE,
} from './period-resolver.service';
import { IndicatorFrequency } from './enums/indicator-frequency.enum';

/**
 * Helper: cria um Date a partir de "YYYY-MM-DD" tratado como meia-noite BRT (UTC-3).
 * Útil para construir datas de referência consistentes nos testes.
 */
const brt = (dateStr: string): Date => new Date(`${dateStr}T03:00:00.000Z`); // 00:00 BRT = 03:00 UTC (sem DST)

/**
 * Helper: extrai componentes "YYYY-MM-DD HH:MM:SS" no timezone BRT para comparação.
 */
const toBrtString = (date: Date): string =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(' ', 'T');

/** Helper: extrai apenas YYYY-MM-DD no timezone BRT */
const toBrtDate = (date: Date): string => toBrtString(date).substring(0, 10);

describe('PeriodResolverService', () => {
  let svc: PeriodResolverService;

  beforeEach(() => {
    svc = new PeriodResolverService();
  });

  // ── CUSTOM ─────────────────────────────────────────────────────────────────

  describe('CUSTOM', () => {
    it('deve retornar CustomPeriodResolution com requiresManualConfiguration=true', () => {
      const result = svc.resolve(IndicatorFrequency.CUSTOM, new Date());
      expect(isPeriodResolution(result)).toBe(false);
      const custom = result as CustomPeriodResolution;
      expect(custom.frequency).toBe(IndicatorFrequency.CUSTOM);
      expect(custom.requiresManualConfiguration).toBe(true);
      expect(typeof custom.message).toBe('string');
      expect(custom.message.length).toBeGreaterThan(10);
    });

    it('não deve ter periodStart nem periodEnd', () => {
      const result = svc.resolve(IndicatorFrequency.CUSTOM, new Date());
      expect(
        (result as unknown as Record<string, unknown>)['periodStart'],
      ).toBeUndefined();
      expect(
        (result as unknown as Record<string, unknown>)['periodEnd'],
      ).toBeUndefined();
    });
  });

  // ── DAILY ──────────────────────────────────────────────────────────────────

  describe('DAILY', () => {
    it('dia comum (09/08/2026)', () => {
      const ref = brt('2026-08-09');
      const r = svc.resolve(IndicatorFrequency.DAILY, ref) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-08-09');
      expect(toBrtDate(r.periodEnd)).toBe('2026-08-10'); // exclusivo
    });

    it('virada de mês: 31/01 → 01/02', () => {
      const ref = brt('2026-01-31');
      const r = svc.resolve(IndicatorFrequency.DAILY, ref) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-01-31');
      expect(toBrtDate(r.periodEnd)).toBe('2026-02-01');
    });

    it('virada de ano: 31/12/2026 → 01/01/2027', () => {
      const ref = brt('2026-12-31');
      const r = svc.resolve(IndicatorFrequency.DAILY, ref) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-12-31');
      expect(toBrtDate(r.periodEnd)).toBe('2027-01-01');
    });

    it('29/02 em ano bissexto (2028)', () => {
      const ref = brt('2028-02-29');
      const r = svc.resolve(IndicatorFrequency.DAILY, ref) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2028-02-29');
      expect(toBrtDate(r.periodEnd)).toBe('2028-03-01');
    });

    it('metadados corretos (timezone, frequency, referenceDate)', () => {
      const ref = brt('2026-08-09');
      const r = svc.resolve(IndicatorFrequency.DAILY, ref) as PeriodResolution;
      expect(r.frequency).toBe(IndicatorFrequency.DAILY);
      expect(r.referenceDate).toBe(ref);
      expect(r.timezone).toBe(BUSINESS_TIMEZONE);
    });
  });

  // ── TIMEZONE próximo da meia-noite ─────────────────────────────────────────

  describe('TIMEZONE — comportamento próximo da meia-noite BRT', () => {
    it('23:59 BRT de 08/08 = 02:59 UTC de 09/08 → pertence a 08/08 em BRT', () => {
      // 02:59 UTC do dia 09 = 23:59 BRT do dia 08 (BRT está 3h atrás de UTC)
      const late = new Date('2026-08-09T02:59:59.000Z');
      const r = svc.resolve(IndicatorFrequency.DAILY, late) as PeriodResolution;
      // Em BRT este instante é 23:59 de 08/ago, portanto o período é 08/ago
      expect(toBrtDate(r.periodStart)).toBe('2026-08-08');
    });

    it('00:00 BRT (03:00 UTC) → ainda o mesmo dia (início do dia)', () => {
      const midnight = new Date('2026-08-09T03:00:00.000Z'); // meia-noite BRT
      const r = svc.resolve(
        IndicatorFrequency.DAILY,
        midnight,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-08-09');
    });

    it('00:01 BRT (03:01 UTC) → ainda 09/08', () => {
      const justAfterMidnight = new Date('2026-08-09T03:01:00.000Z');
      const r = svc.resolve(
        IndicatorFrequency.DAILY,
        justAfterMidnight,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-08-09');
    });

    it('22:59 UTC (19:59 BRT do dia anterior) → ainda 08/08 BRT', () => {
      // 22:59 UTC de 09/ago = 19:59 BRT de 09/ago
      const ref = new Date('2026-08-09T22:59:00.000Z');
      const r = svc.resolve(IndicatorFrequency.DAILY, ref) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-08-09');
    });

    it('America/Sao_Paulo timezone é respeitado no result', () => {
      const ref = brt('2026-08-09');
      const r = svc.resolve(IndicatorFrequency.DAILY, ref) as PeriodResolution;
      expect(r.timezone).toBe('America/Sao_Paulo');
    });

    it('periodStart em UTC reflete corretamente meia-noite BRT (UTC-3)', () => {
      const ref = brt('2026-08-09');
      const r = svc.resolve(IndicatorFrequency.DAILY, ref) as PeriodResolution;
      // meia-noite de 09/ago BRT = 03:00 UTC (sem DST em agosto)
      expect(r.periodStart.toISOString()).toBe('2026-08-09T03:00:00.000Z');
      expect(r.periodEnd.toISOString()).toBe('2026-08-10T03:00:00.000Z');
    });
  });

  // ── WEEKLY ─────────────────────────────────────────────────────────────────

  describe('WEEKLY (semana ISO: seg a dom)', () => {
    it('segunda-feira (03/08/2026) → semana 03/08–09/08', () => {
      const ref = brt('2026-08-03'); // segunda
      const r = svc.resolve(IndicatorFrequency.WEEKLY, ref) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-08-03');
      expect(toBrtDate(r.periodEnd)).toBe('2026-08-10'); // próxima segunda (exclusivo)
    });

    it('quarta-feira (05/08/2026) → mesma semana: 03/08–09/08', () => {
      const ref = brt('2026-08-05'); // quarta
      const r = svc.resolve(IndicatorFrequency.WEEKLY, ref) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-08-03');
      expect(toBrtDate(r.periodEnd)).toBe('2026-08-10');
    });

    it('domingo (09/08/2026) → semana 03/08–09/08 (último dia incluído)', () => {
      const ref = brt('2026-08-09'); // domingo
      const r = svc.resolve(IndicatorFrequency.WEEKLY, ref) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-08-03');
      expect(toBrtDate(r.periodEnd)).toBe('2026-08-10');
    });

    it('sábado (08/08/2026) → mesma semana: 03/08–09/08', () => {
      const ref = brt('2026-08-08'); // sábado
      const r = svc.resolve(IndicatorFrequency.WEEKLY, ref) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-08-03');
      expect(toBrtDate(r.periodEnd)).toBe('2026-08-10');
    });

    it('virada de mês: quinta 29/01/2026 → seg 26/01–dom 01/02', () => {
      const ref = brt('2026-01-29'); // quinta
      const r = svc.resolve(IndicatorFrequency.WEEKLY, ref) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-01-26');
      expect(toBrtDate(r.periodEnd)).toBe('2026-02-02');
    });

    it('virada de ano: quinta 31/12/2026 → seg 28/12/2026–dom 03/01/2027', () => {
      const ref = brt('2026-12-31'); // quinta
      const r = svc.resolve(IndicatorFrequency.WEEKLY, ref) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-12-28');
      expect(toBrtDate(r.periodEnd)).toBe('2027-01-04');
    });

    it('domingo 03/01/2027 → semana 28/12/2026–03/01/2027', () => {
      const ref = brt('2027-01-03'); // domingo
      const r = svc.resolve(IndicatorFrequency.WEEKLY, ref) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-12-28');
      expect(toBrtDate(r.periodEnd)).toBe('2027-01-04');
    });
  });

  // ── MONTHLY ────────────────────────────────────────────────────────────────

  describe('MONTHLY', () => {
    it('agosto/2026: 01/08 → 01/09', () => {
      const ref = brt('2026-08-15');
      const r = svc.resolve(
        IndicatorFrequency.MONTHLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-08-01');
      expect(toBrtDate(r.periodEnd)).toBe('2026-09-01');
    });

    it('dezembro/2026 (virada de ano): 01/12 → 01/01/2027', () => {
      const ref = brt('2026-12-10');
      const r = svc.resolve(
        IndicatorFrequency.MONTHLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-12-01');
      expect(toBrtDate(r.periodEnd)).toBe('2027-01-01');
    });

    it('fevereiro em ano comum (2026): 01/02 → 01/03', () => {
      const ref = brt('2026-02-28');
      const r = svc.resolve(
        IndicatorFrequency.MONTHLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-02-01');
      expect(toBrtDate(r.periodEnd)).toBe('2026-03-01');
    });

    it('fevereiro em ano bissexto (2028): 01/02 → 01/03', () => {
      const ref = brt('2028-02-29');
      const r = svc.resolve(
        IndicatorFrequency.MONTHLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2028-02-01');
      expect(toBrtDate(r.periodEnd)).toBe('2028-03-01');
    });

    it('mês com 30 dias (abril/2026): 01/04 → 01/05', () => {
      const ref = brt('2026-04-30');
      const r = svc.resolve(
        IndicatorFrequency.MONTHLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-04-01');
      expect(toBrtDate(r.periodEnd)).toBe('2026-05-01');
    });

    it('mês com 31 dias (janeiro/2026): 01/01 → 01/02', () => {
      const ref = brt('2026-01-31');
      const r = svc.resolve(
        IndicatorFrequency.MONTHLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-01-01');
      expect(toBrtDate(r.periodEnd)).toBe('2026-02-01');
    });

    it('início do mês (dia 1)', () => {
      const ref = brt('2026-07-01');
      const r = svc.resolve(
        IndicatorFrequency.MONTHLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-07-01');
      expect(toBrtDate(r.periodEnd)).toBe('2026-08-01');
    });
  });

  // ── QUARTERLY ─────────────────────────────────────────────────────────────

  describe('QUARTERLY', () => {
    it('Q1: janeiro (01/01 → 01/04)', () => {
      const ref = brt('2026-01-15');
      const r = svc.resolve(
        IndicatorFrequency.QUARTERLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-01-01');
      expect(toBrtDate(r.periodEnd)).toBe('2026-04-01');
    });

    it('Q1: março (último mês do trimestre)', () => {
      const ref = brt('2026-03-31');
      const r = svc.resolve(
        IndicatorFrequency.QUARTERLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-01-01');
      expect(toBrtDate(r.periodEnd)).toBe('2026-04-01');
    });

    it('Q2: abril (01/04 → 01/07)', () => {
      const ref = brt('2026-04-01');
      const r = svc.resolve(
        IndicatorFrequency.QUARTERLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-04-01');
      expect(toBrtDate(r.periodEnd)).toBe('2026-07-01');
    });

    it('Q3: agosto (01/07 → 01/10)', () => {
      const ref = brt('2026-08-09');
      const r = svc.resolve(
        IndicatorFrequency.QUARTERLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-07-01');
      expect(toBrtDate(r.periodEnd)).toBe('2026-10-01');
    });

    it('Q4: dezembro (01/10 → 01/01/2027)', () => {
      const ref = brt('2026-12-31');
      const r = svc.resolve(
        IndicatorFrequency.QUARTERLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-10-01');
      expect(toBrtDate(r.periodEnd)).toBe('2027-01-01');
    });

    it('Q4: outubro (início do último trimestre)', () => {
      const ref = brt('2026-10-01');
      const r = svc.resolve(
        IndicatorFrequency.QUARTERLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-10-01');
      expect(toBrtDate(r.periodEnd)).toBe('2027-01-01');
    });
  });

  // ── SEMESTERLY ─────────────────────────────────────────────────────────────

  describe('SEMESTERLY', () => {
    it('S1: janeiro (01/01 → 01/07)', () => {
      const ref = brt('2026-01-01');
      const r = svc.resolve(
        IndicatorFrequency.SEMESTERLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-01-01');
      expect(toBrtDate(r.periodEnd)).toBe('2026-07-01');
    });

    it('S1: junho (último mês do S1)', () => {
      const ref = brt('2026-06-30');
      const r = svc.resolve(
        IndicatorFrequency.SEMESTERLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-01-01');
      expect(toBrtDate(r.periodEnd)).toBe('2026-07-01');
    });

    it('S2: julho (01/07 → 01/01/2027)', () => {
      const ref = brt('2026-07-01');
      const r = svc.resolve(
        IndicatorFrequency.SEMESTERLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-07-01');
      expect(toBrtDate(r.periodEnd)).toBe('2027-01-01');
    });

    it('S2: dezembro (último mês do S2)', () => {
      const ref = brt('2026-12-31');
      const r = svc.resolve(
        IndicatorFrequency.SEMESTERLY,
        ref,
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-07-01');
      expect(toBrtDate(r.periodEnd)).toBe('2027-01-01');
    });
  });

  // ── YEARLY ─────────────────────────────────────────────────────────────────

  describe('YEARLY', () => {
    it('início do ano (01/01/2026)', () => {
      const ref = brt('2026-01-01');
      const r = svc.resolve(IndicatorFrequency.YEARLY, ref) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-01-01');
      expect(toBrtDate(r.periodEnd)).toBe('2027-01-01');
    });

    it('fim do ano (31/12/2026)', () => {
      const ref = brt('2026-12-31');
      const r = svc.resolve(IndicatorFrequency.YEARLY, ref) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-01-01');
      expect(toBrtDate(r.periodEnd)).toBe('2027-01-01');
    });

    it('meados do ano (09/08/2026)', () => {
      const ref = brt('2026-08-09');
      const r = svc.resolve(IndicatorFrequency.YEARLY, ref) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-01-01');
      expect(toBrtDate(r.periodEnd)).toBe('2027-01-01');
    });

    it('ano bissexto 2028: 01/01 → 01/01/2029', () => {
      const ref = brt('2028-08-09');
      const r = svc.resolve(IndicatorFrequency.YEARLY, ref) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2028-01-01');
      expect(toBrtDate(r.periodEnd)).toBe('2029-01-01');
    });
  });

  // ── CASOS DE BORDA ─────────────────────────────────────────────────────────

  describe('Casos de borda calendários', () => {
    it('31/01 → 01/02 (DAILY)', () => {
      const r = svc.resolve(
        IndicatorFrequency.DAILY,
        brt('2026-01-31'),
      ) as PeriodResolution;
      expect(toBrtDate(r.periodEnd)).toBe('2026-02-01');
    });

    it('28/02 → 01/03 em ano comum (DAILY)', () => {
      const r = svc.resolve(
        IndicatorFrequency.DAILY,
        brt('2026-02-28'),
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-02-28');
      expect(toBrtDate(r.periodEnd)).toBe('2026-03-01');
    });

    it('29/02 em ano bissexto 2028 (DAILY)', () => {
      const r = svc.resolve(
        IndicatorFrequency.DAILY,
        brt('2028-02-29'),
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2028-02-29');
      expect(toBrtDate(r.periodEnd)).toBe('2028-03-01');
    });

    it('30/04 → 01/05 (DAILY)', () => {
      const r = svc.resolve(
        IndicatorFrequency.DAILY,
        brt('2026-04-30'),
      ) as PeriodResolution;
      expect(toBrtDate(r.periodEnd)).toBe('2026-05-01');
    });

    it('30/06 → 01/07 (DAILY)', () => {
      const r = svc.resolve(
        IndicatorFrequency.DAILY,
        brt('2026-06-30'),
      ) as PeriodResolution;
      expect(toBrtDate(r.periodEnd)).toBe('2026-07-01');
    });

    it('30/09 → 01/10 (DAILY)', () => {
      const r = svc.resolve(
        IndicatorFrequency.DAILY,
        brt('2026-09-30'),
      ) as PeriodResolution;
      expect(toBrtDate(r.periodEnd)).toBe('2026-10-01');
    });

    it('31/12 → 01/01 (DAILY)', () => {
      const r = svc.resolve(
        IndicatorFrequency.DAILY,
        brt('2026-12-31'),
      ) as PeriodResolution;
      expect(toBrtDate(r.periodEnd)).toBe('2027-01-01');
    });

    it('domingo 01/02/2026 → semana seg 26/01–dom 01/02 (WEEKLY)', () => {
      // 01/02/2026 é domingo
      const r = svc.resolve(
        IndicatorFrequency.WEEKLY,
        brt('2026-02-01'),
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-01-26');
      expect(toBrtDate(r.periodEnd)).toBe('2026-02-02');
    });

    it('segunda 02/02/2026 → nova semana: 02/02–08/02 (WEEKLY)', () => {
      const r = svc.resolve(
        IndicatorFrequency.WEEKLY,
        brt('2026-02-02'),
      ) as PeriodResolution;
      expect(toBrtDate(r.periodStart)).toBe('2026-02-02');
      expect(toBrtDate(r.periodEnd)).toBe('2026-02-09');
    });

    it('isPeriodResolution guard: true para DAILY', () => {
      const r = svc.resolve(IndicatorFrequency.DAILY, new Date());
      expect(isPeriodResolution(r)).toBe(true);
    });

    it('isPeriodResolution guard: false para CUSTOM', () => {
      const r = svc.resolve(IndicatorFrequency.CUSTOM, new Date());
      expect(isPeriodResolution(r)).toBe(false);
    });

    it('periodEnd > periodStart para todos os frequency', () => {
      const ref = brt('2026-08-09');
      const freqs = [
        IndicatorFrequency.DAILY,
        IndicatorFrequency.WEEKLY,
        IndicatorFrequency.MONTHLY,
        IndicatorFrequency.QUARTERLY,
        IndicatorFrequency.SEMESTERLY,
        IndicatorFrequency.YEARLY,
      ];
      for (const f of freqs) {
        const r = svc.resolve(f, ref) as PeriodResolution;
        expect(r.periodEnd.getTime()).toBeGreaterThan(r.periodStart.getTime());
      }
    });
  });
});
