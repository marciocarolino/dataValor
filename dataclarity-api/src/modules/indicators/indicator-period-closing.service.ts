import { Injectable } from '@nestjs/common';
import { IndicatorFrequency } from './enums/indicator-frequency.enum';
import {
  PeriodResolverService,
  PeriodResolution,
  isPeriodResolution,
  BUSINESS_TIMEZONE,
} from './period-resolver.service';

// ── Tipos de entrada ──────────────────────────────────────────────────────────

/**
 * Subconjunto mínimo de Indicator necessário para avaliar o fechamento.
 * Usar uma interface em vez do tipo gerado pelo Prisma mantém o serviço
 * desacoplado do ORM e facilita os testes.
 */
export interface IndicatorForClosing {
  id: string;
  frequency: IndicatorFrequency;
  isActive: boolean;
}

// ── Tipos de saída ─────────────────────────────────────────────────────────────

/**
 * Resultado do fechamento para frequências com resolução automática.
 *
 * isClosed             = periodEnd <= referenceDate
 * isReadyForClosing    = sinônimo de isClosed nesta etapa (sem reprocessamento)
 *
 * Nota: isActive é informação contextual — este serviço NÃO bloqueia
 * a resolução temporal de indicadores inativos.
 */
export interface PeriodClosingResult {
  indicatorId: string;
  frequency: IndicatorFrequency;
  periodStart: Date;
  periodEnd: Date;
  isClosed: boolean;
  isReadyForClosing: boolean;
  isActive: boolean;
  referenceDate: Date;
  timezone: string;
}

/**
 * Retornado quando frequency = CUSTOM.
 * O sistema não pode inferir a janela automaticamente.
 */
export interface CustomPeriodClosingResult {
  indicatorId: string;
  frequency: IndicatorFrequency.CUSTOM;
  isClosed: false;
  isReadyForClosing: false;
  isActive: boolean;
  requiresManualConfiguration: true;
  message: string;
  referenceDate: Date;
}

export type PeriodClosingCheckResult =
  PeriodClosingResult | CustomPeriodClosingResult;

/** Guard de tipo: distingue resultados resolvidos de CUSTOM */
export function isResolvedPeriodClosing(
  r: PeriodClosingCheckResult,
): r is PeriodClosingResult {
  return (r as PeriodClosingResult).periodStart !== undefined;
}

// ── Serviço ───────────────────────────────────────────────────────────────────

/**
 * IndicatorPeriodClosingService — detecção e decisão temporal de fechamento.
 *
 * Responsabilidade EXCLUSIVA: dado um Indicator e uma data de referência,
 * determinar se o período de apuração correspondente já terminou.
 *
 * Regra de fechamento: periodEnd <= referenceDate (fronteira exclusiva)
 *
 * NÃO persiste dados.
 * NÃO chama IndicatorHistoryService.
 * NÃO chama Prisma para alterar dados.
 * NÃO calcula value, variationPercent ou status.
 * NÃO cria cron/scheduler.
 * NÃO altera isActive.
 *
 * Pode ser instanciado com `new IndicatorPeriodClosingService(resolver)`
 * para testes unitários sem mock de dependências do Nest.
 */
@Injectable()
export class IndicatorPeriodClosingService {
  constructor(private readonly periodResolver: PeriodResolverService) {}

  /**
   * Verifica se o período de apuração de um indicador já está encerrado.
   *
   * @param indicator     Indicador a ser avaliado
   * @param referenceDate Data de referência para a verificação.
   *                      Padrão: Date.now() no timezone de negócio.
   *                      Aceitar referenceDate externo torna o serviço
   *                      completamente determinístico para testes.
   * @param timezone      Timezone de negócio (padrão: America/Sao_Paulo)
   */
  check(
    indicator: IndicatorForClosing,
    referenceDate: Date = new Date(),
    timezone: string = BUSINESS_TIMEZONE,
  ): PeriodClosingCheckResult {
    // Resolvemos o período usando referenceDate - 1ms para capturar o período
    // que acabou de encerrar (se houver).
    //
    // Exemplo MONTHLY:
    //   referenceDate = 2026-09-01T03:00:00Z (meia-noite BRT de 01/set)
    //   referenceDate - 1ms = 2026-09-01T02:59:59.999Z = 31/ago BRT
    //   → resolve agosto: periodStart=01/ago, periodEnd=01/set
    //   → isClosed: periodEnd (01/set UTC) <= referenceDate (01/set UTC) → TRUE ✓
    //
    //   referenceDate = 2026-08-15T03:00:00Z (meia-noite BRT de 15/ago)
    //   referenceDate - 1ms = 2026-08-15T02:59:59.999Z = 14/ago BRT
    //   → resolve agosto: periodStart=01/ago, periodEnd=01/set
    //   → isClosed: periodEnd (01/set UTC) <= referenceDate (15/ago UTC) → FALSE ✓
    const resolverDate = new Date(referenceDate.getTime() - 1);

    const resolution = this.periodResolver.resolve(
      indicator.frequency,
      resolverDate,
      timezone,
    );

    // CUSTOM: sem resolução automática
    if (!isPeriodResolution(resolution)) {
      return {
        indicatorId: indicator.id,
        frequency: IndicatorFrequency.CUSTOM,
        isClosed: false,
        isReadyForClosing: false,
        isActive: indicator.isActive,
        requiresManualConfiguration: true,
        message: resolution.message,
        referenceDate,
      };
    }

    return this.evaluateClosure(indicator, resolution, referenceDate, timezone);
  }

  /**
   * Conveniência: verifica múltiplos indicadores de uma vez.
   * Útil para futures chamadas em batch (Etapa 3C+).
   */
  checkMany(
    indicators: IndicatorForClosing[],
    referenceDate: Date = new Date(),
    timezone: string = BUSINESS_TIMEZONE,
  ): PeriodClosingCheckResult[] {
    return indicators.map((ind) => this.check(ind, referenceDate, timezone));
  }

  // ── Helper privado ──────────────────────────────────────────────────────────

  private evaluateClosure(
    indicator: IndicatorForClosing,
    resolution: PeriodResolution,
    referenceDate: Date,
    timezone: string,
  ): PeriodClosingResult {
    // Regra de fechamento: periodEnd <= referenceDate
    // (periodEnd é exclusivo: o instante em que começa o próximo período)
    // Quando referenceDate atinge exatamente periodEnd, o período está encerrado.
    const isClosed = resolution.periodEnd.getTime() <= referenceDate.getTime();

    return {
      indicatorId: indicator.id,
      frequency: indicator.frequency,
      periodStart: resolution.periodStart,
      periodEnd: resolution.periodEnd,
      isClosed,
      isReadyForClosing: isClosed, // nesta etapa são equivalentes
      isActive: indicator.isActive,
      referenceDate,
      timezone,
    };
  }
}
