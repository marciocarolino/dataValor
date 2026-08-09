import { Injectable } from '@nestjs/common';
import { IndicatorFrequency } from './enums/indicator-frequency.enum';

/**
 * Timezone de negócio do DataValor.
 * Centralizado aqui para evitar strings espalhadas pelo código.
 * Altere SOMENTE aqui caso o negócio mude de timezone.
 */
export const BUSINESS_TIMEZONE = 'America/Sao_Paulo';

/**
 * Resultado de resolução de período bem-sucedida.
 *
 * Modelo de fronteiras: [periodStart, periodEnd)
 *   - periodStart: início inclusivo (meia-noite do primeiro dia do período no timezone de negócio)
 *   - periodEnd:   início do dia SEGUINTE ao último dia (exclusivo)
 *
 * Essa abordagem elimina problemas de milissegundos (ex: 23:59:59.999 vs 00:00:00.000)
 * e é compatível com filtros Prisma: where: { periodStart: { gte: start }, periodEnd: { lte: end } }
 *
 * As datas são armazenadas em UTC no banco.
 * Exemplo MONTHLY agosto/2026 (BRT UTC-3 sem horário de verão):
 *   periodStart = 2026-08-01T03:00:00.000Z  (meia-noite BRT = 03:00 UTC)
 *   periodEnd   = 2026-09-01T03:00:00.000Z  (meia-noite de 01/set BRT)
 */
export interface PeriodResolution {
  periodStart: Date; // inclusivo
  periodEnd: Date; // exclusivo — início do próximo período no timezone de negócio
  frequency: IndicatorFrequency;
  referenceDate: Date;
  timezone: string;
}

/**
 * Retornado quando frequency = CUSTOM.
 * CUSTOM requer configuração explícita de periodStart/periodEnd pelo usuário.
 * O sistema NÃO pode inferir a janela automaticamente.
 */
export interface CustomPeriodResolution {
  frequency: IndicatorFrequency.CUSTOM;
  requiresManualConfiguration: true;
  message: string;
}

export type PeriodResolverResult = PeriodResolution | CustomPeriodResolution;

/** Guard de tipo para resultado bem-sucedido */
export function isPeriodResolution(
  r: PeriodResolverResult,
): r is PeriodResolution {
  return (r as PeriodResolution).periodStart !== undefined;
}

/** Componentes calendários de uma data */
interface DateParts {
  year: number;
  month: number; // 1-based
  day: number;
}

/**
 * PeriodResolverService — resolução temporal de períodos de apuração.
 *
 * Responsabilidade EXCLUSIVA: dada uma (frequency, referenceDate),
 * retornar a janela temporal [periodStart, periodEnd) do período ao qual
 * referenceDate pertence, considerando o timezone de negócio.
 *
 * NÃO calcula valores de indicadores.
 * NÃO consulta IndicatorMeasurement.
 * NÃO cria IndicatorHistory.
 * NÃO executa jobs.
 *
 * Pode ser instanciado diretamente com `new PeriodResolverService()`
 * para uso em testes unitários, sem mock de dependências.
 */
@Injectable()
export class PeriodResolverService {
  /**
   * Resolve o período de apuração para (frequency, referenceDate).
   *
   * @param frequency     Periodicidade de apuração do indicador
   * @param referenceDate Data de referência (qualquer Date, UTC ou local)
   * @param timezone      Timezone de negócio (padrão: America/Sao_Paulo)
   */
  resolve(
    frequency: IndicatorFrequency,
    referenceDate: Date,
    timezone: string = BUSINESS_TIMEZONE,
  ): PeriodResolverResult {
    if (frequency === IndicatorFrequency.CUSTOM) {
      return {
        frequency: IndicatorFrequency.CUSTOM,
        requiresManualConfiguration: true,
        message:
          'A periodicidade CUSTOM requer que periodStart e periodEnd sejam ' +
          'fornecidos explicitamente pelo usuário. O sistema não pode inferir ' +
          'automaticamente a janela temporal para períodos personalizados.',
      };
    }

    const parts = this.getDateParts(referenceDate, timezone);
    const { startParts, endParts } = this.computeStartEnd(frequency, parts);

    return {
      periodStart: this.toUtcMidnight(startParts, timezone),
      periodEnd: this.toUtcMidnight(endParts, timezone),
      frequency,
      referenceDate,
      timezone,
    };
  }

  /** Calcula startParts e endParts para cada frequência */
  private computeStartEnd(
    frequency: Exclude<IndicatorFrequency, IndicatorFrequency.CUSTOM>,
    parts: DateParts,
  ): { startParts: DateParts; endParts: DateParts } {
    switch (frequency) {
      case IndicatorFrequency.DAILY: {
        // período = o próprio dia; próximo período = dia seguinte
        return {
          startParts: { year: parts.year, month: parts.month, day: parts.day },
          endParts: this.addCalendarDays(parts.year, parts.month, parts.day, 1),
        };
      }

      case IndicatorFrequency.WEEKLY: {
        // Semana ISO: segunda (dow=1) a domingo (dow=7)
        const dow = this.isoDayOfWeek(parts.year, parts.month, parts.day);
        const daysToMonday = dow - 1;
        const mondayParts = this.addCalendarDays(
          parts.year,
          parts.month,
          parts.day,
          -daysToMonday,
        );
        const nextMondayParts = this.addCalendarDays(
          mondayParts.year,
          mondayParts.month,
          mondayParts.day,
          7,
        );
        return { startParts: mondayParts, endParts: nextMondayParts };
      }

      case IndicatorFrequency.MONTHLY: {
        // Começa no dia 1 do mês; próximo período = dia 1 do mês seguinte
        const startParts: DateParts = {
          year: parts.year,
          month: parts.month,
          day: 1,
        };
        const endParts: DateParts =
          parts.month === 12
            ? { year: parts.year + 1, month: 1, day: 1 }
            : { year: parts.year, month: parts.month + 1, day: 1 };
        return { startParts, endParts };
      }

      case IndicatorFrequency.QUARTERLY: {
        // Q1=jan-mar, Q2=abr-jun, Q3=jul-set, Q4=out-dez
        const qStartMonth = Math.floor((parts.month - 1) / 3) * 3 + 1; // 1, 4, 7, 10
        const startParts: DateParts = {
          year: parts.year,
          month: qStartMonth,
          day: 1,
        };
        const qEndMonth = qStartMonth + 3;
        const endParts: DateParts =
          qEndMonth > 12
            ? { year: parts.year + 1, month: 1, day: 1 }
            : { year: parts.year, month: qEndMonth, day: 1 };
        return { startParts, endParts };
      }

      case IndicatorFrequency.SEMESTERLY: {
        // S1=jan-jun (começa jan), S2=jul-dez (começa jul)
        const sStartMonth = parts.month <= 6 ? 1 : 7;
        const startParts: DateParts = {
          year: parts.year,
          month: sStartMonth,
          day: 1,
        };
        const endParts: DateParts =
          sStartMonth === 1
            ? { year: parts.year, month: 7, day: 1 } // S1 → próximo em jul
            : { year: parts.year + 1, month: 1, day: 1 }; // S2 → próximo em jan+1
        return { startParts, endParts };
      }

      case IndicatorFrequency.YEARLY: {
        const startParts: DateParts = { year: parts.year, month: 1, day: 1 };
        const endParts: DateParts = { year: parts.year + 1, month: 1, day: 1 };
        return { startParts, endParts };
      }

      default: {
        // TypeScript exhaustiveness check — não deve ser alcançado
        const _exhaustive: never = frequency;
        throw new Error(
          `IndicatorFrequency não suportado: ${String(_exhaustive)}`,
        );
      }
    }
  }

  // ── Helpers de calendário ──────────────────────────────────────────────────

  /**
   * Extrai os componentes da data no timezone informado.
   * Usa Intl.DateTimeFormat para garantir conversão correta entre UTC e local.
   */
  private getDateParts(date: Date, timezone: string): DateParts {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = fmt.formatToParts(date);
    const get = (t: string) =>
      parseInt(parts.find((p) => p.type === t)?.value ?? '0', 10);
    return { year: get('year'), month: get('month'), day: get('day') };
  }

  /**
   * Converte componentes calendários para um Date UTC que representa
   * a meia-noite (00:00:00.000) daquele dia no timezone informado.
   *
   * Algoritmo:
   * 1. Cria `localMidnightAsUtc` tratando os componentes como se fossem UTC
   *    (ex: 2026-08-01T00:00:00Z).
   * 2. Checa qual hora local esse instante representa no timezone.
   * 3. Ajusta para que o resultado final corresponda à meia-noite local.
   *
   * Ex (BRT = UTC-3):
   *   toUtcMidnight({2026,8,1}, 'America/Sao_Paulo')
   *   → 2026-08-01T03:00:00.000Z
   */
  private toUtcMidnight(parts: DateParts, timezone: string): Date {
    const pad = (n: number) => String(n).padStart(2, '0');
    const { year, month, day } = parts;

    // Passo 1: data local tratada como UTC (placeholder)
    const placeholder = new Date(
      `${year}-${pad(month)}-${pad(day)}T00:00:00.000Z`,
    );

    // Passo 2: descobrir o offset UTC para meia-noite naquele dia/timezone
    // Usamos noon UTC do mesmo dia para evitar problemas de ambiguidade de DST
    const noonUtc = new Date(`${year}-${pad(month)}-${pad(day)}T12:00:00.000Z`);
    const noonParts = this.getDatePartsWithTime(noonUtc, timezone);

    // Reconstruímos noon "como se fosse UTC" para calcular a diferença
    const noonAsUtcString =
      `${pad(noonParts.year)}-${pad(noonParts.month)}-${pad(noonParts.day)}` +
      `T${pad(noonParts.hour)}:${pad(noonParts.minute)}:${pad(noonParts.second)}.000Z`;
    const noonAsUtc = new Date(noonAsUtcString);

    // offsetMs = quanto UTC está à frente do local (positivo para UTC-3: +10800000)
    const offsetMs = noonUtc.getTime() - noonAsUtc.getTime();

    // Passo 3: meia-noite UTC = meia-noite local + offset
    return new Date(placeholder.getTime() + offsetMs);
  }

  /** Extrai componentes de data E hora no timezone */
  private getDatePartsWithTime(
    date: Date,
    timezone: string,
  ): DateParts & { hour: number; minute: number; second: number } {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(date);
    const get = (t: string) => {
      const val = parseInt(parts.find((p) => p.type === t)?.value ?? '0', 10);
      // hour12:false pode retornar 24 à meia-noite em alguns runtimes
      return t === 'hour' && val === 24 ? 0 : val;
    };
    return {
      year: get('year'),
      month: get('month'),
      day: get('day'),
      hour: get('hour'),
      minute: get('minute'),
      second: get('second'),
    };
  }

  /**
   * Adiciona `days` dias a uma data calendária (ano, mês, dia).
   * Funciona corretamente para viradas de mês, trimestre e ano.
   * Não depende de timezone — opera puramente no calendário gregoriano via Date UTC.
   */
  private addCalendarDays(
    year: number,
    month: number,
    day: number,
    days: number,
  ): DateParts {
    const pad = (n: number) => String(n).padStart(2, '0');
    const base = new Date(`${year}-${pad(month)}-${pad(day)}T12:00:00.000Z`);
    base.setUTCDate(base.getUTCDate() + days);
    return {
      year: base.getUTCFullYear(),
      month: base.getUTCMonth() + 1,
      day: base.getUTCDate(),
    };
  }

  /**
   * Retorna o dia da semana ISO (1=segunda, 7=domingo) para uma data calendária.
   * Não depende de timezone — usa Date UTC às 12:00 para evitar mudanças de dia.
   */
  private isoDayOfWeek(year: number, month: number, day: number): number {
    const pad = (n: number) => String(n).padStart(2, '0');
    const d = new Date(`${year}-${pad(month)}-${pad(day)}T12:00:00.000Z`);
    const dow = d.getUTCDay(); // 0=domingo, 1=segunda, ..., 6=sábado
    return dow === 0 ? 7 : dow; // converte para ISO: domingo=7
  }
}
