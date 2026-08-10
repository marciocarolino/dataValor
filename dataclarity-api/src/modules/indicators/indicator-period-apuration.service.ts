import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PeriodResolverService,
  isPeriodResolution,
  BUSINESS_TIMEZONE,
} from './period-resolver.service';
import {
  IndicatorPeriodClosingService,
  IndicatorForClosing,
} from './indicator-period-closing.service';
import {
  AggregationEngineService,
  MeasurementInput,
  IndicatorAggregationInput,
  isFormulaResult,
} from './aggregation-engine.service';
import { IndicatorHistoryService } from './indicator-history.service';
import { IndicatorAnalyticsService } from './indicator-analytics.service';
import { IndicatorCurrentStateService } from './indicator-current-state.service';
import { IndicatorStatus } from './enums/indicator-status.enum';
import { IndicatorFrequency } from './enums/indicator-frequency.enum';
import { AggregationType } from './enums/aggregation-type.enum';
import { IndicatorDesiredDirection } from './enums/indicator-desired-direction.enum';

// ── Tipos de resultado ─────────────────────────────────────────────────────────

/** O período ainda não terminou. */
export interface ApurationResultPeriodOpen {
  status: 'PERIOD_OPEN';
  indicatorId: string;
  periodStart: Date;
  periodEnd: Date;
  referenceDate: Date;
}

/** O período já possui um histórico registrado (idempotência). */
export interface ApurationResultAlreadyClosed {
  status: 'ALREADY_CLOSED';
  indicatorId: string;
  historyId: string;
  periodStart: Date;
  periodEnd: Date;
}

/** FORMULA não é executada — aguarda Formula Engine. */
export interface ApurationResultFormulaRequired {
  status: 'FORMULA_ENGINE_REQUIRED';
  indicatorId: string;
  periodStart: Date;
  periodEnd: Date;
  formula: string | null;
}

/**
 * Período encerrado mas sem medições válidas.
 *
 * Decisão documentada:
 * Para SUM/AVG/MIN/MAX/LAST → não cria histórico, retorna NO_DATA.
 * Para COUNT → cria histórico com value=0 (COUNT de 0 medições é semântico).
 * Esta decisão preserva a semântica: um histórico com value=null
 * seria ambíguo (erro vs. zero medições).
 */
export interface ApurationResultNoData {
  status: 'NO_DATA';
  indicatorId: string;
  periodStart: Date;
  periodEnd: Date;
  aggregationType: AggregationType;
}

/** Período fechado com sucesso — histórico criado. */
export interface ApurationResultClosed {
  status: 'CLOSED';
  historyId: string;
  indicatorId: string;
  periodStart: Date;
  periodEnd: Date;
  value: number | null;
  previousValue: number | null;
  variationPercent: number | null;
  goalValue: number | null;
  indicatorStatus: IndicatorStatus;
  measurementCount: number;
  aggregationType: AggregationType;
  isActive: boolean; // contexto — não determina o fechamento
}

/** frequency = CUSTOM não possui período inferível automaticamente. */
export interface ApurationResultCustomFrequency {
  status: 'CUSTOM_FREQUENCY_NOT_SUPPORTED';
  indicatorId: string;
  message: string;
}

export type ApurationResult =
  | ApurationResultPeriodOpen
  | ApurationResultAlreadyClosed
  | ApurationResultFormulaRequired
  | ApurationResultNoData
  | ApurationResultClosed
  | ApurationResultCustomFrequency;

// ── Tipo mínimo do Indicator necessário para a apuração ────────────────────────

interface IndicatorForApuration {
  id: string;
  frequency: string; // aceita tanto o enum local quanto o gerado pelo Prisma
  aggregationType: string;
  formula: string | null;
  goalValue: unknown; // Decimal | null
  minimumGoalValue: unknown;
  maximumGoalValue: unknown;
  desiredDirection: string;
  isActive: boolean;
}

// ── Serviço ────────────────────────────────────────────────────────────────────

/**
 * IndicatorPeriodApurationService — motor de apuração e fechamento de período.
 *
 * Responsabilidade: dado um indicador e uma data de referência, executa o
 * processo completo de fechamento do período correspondente:
 *
 * 1. Resolve o período (PeriodResolverService)
 * 2. Verifica se está encerrado (IndicatorPeriodClosingService)
 * 3. Busca medições do período (PrismaService)
 * 4. Agrega os valores (AggregationEngineService)
 * 5. Busca previousValue do histórico anterior
 * 6. Calcula variationPercent
 * 7. Determina status (IndicatorAnalyticsService)
 * 8. Persiste IndicatorHistory (IndicatorHistoryService)
 *
 * GARANTIAS:
 * - Idempotente: retorna ALREADY_CLOSED se o período já possui histórico.
 * - Não altera isActive, status, currentValue, previousValue ou variation do Indicator.
 * - Não executa fórmulas.
 * - Não cria cron/scheduler.
 *
 * REGRA PARA INDICADORES INATIVOS:
 * isActive não bloqueia o fechamento. Histórico é independente de isActive.
 * Um indicador desativado (ex: pausado para revisão) ainda possui períodos
 * passados que podem e devem ser fechados. O resultado inclui isActive como
 * informação contextual.
 *
 * REGRA PARA PERÍODO SEM MEDIÇÕES (NO_DATA):
 * Para SUM/AVG/MIN/MAX/LAST: não cria histórico → retorna NO_DATA.
 * Para COUNT: cria histórico com value=0 (semântica clara: 0 eventos no período).
 */
@Injectable()
export class IndicatorPeriodApurationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periodResolver: PeriodResolverService,
    private readonly periodClosing: IndicatorPeriodClosingService,
    private readonly aggregationEngine: AggregationEngineService,
    private readonly historyService: IndicatorHistoryService,
    private readonly analytics: IndicatorAnalyticsService,
    private readonly currentStateService: IndicatorCurrentStateService,
  ) {}

  /**
   * Executa o fechamento completo de um período de apuração.
   *
   * @param indicatorId   ID do indicador a ser apurado
   * @param referenceDate Data de referência (default: agora). Permite testes determinísticos.
   * @param timezone      Timezone de negócio (default: America/Sao_Paulo)
   */
  async closePeriod(
    indicatorId: string,
    referenceDate: Date = new Date(),
    timezone: string = BUSINESS_TIMEZONE,
  ): Promise<ApurationResult> {
    // 1. Buscar o indicador
    const indicator = await this.prisma.indicator.findUnique({
      where: { id: indicatorId },
      select: {
        id: true,
        frequency: true,
        aggregationType: true,
        formula: true,
        goalValue: true,
        minimumGoalValue: true,
        maximumGoalValue: true,
        desiredDirection: true,
        isActive: true,
      },
    });

    if (!indicator) {
      throw new NotFoundException(`Indicador ${indicatorId} não encontrado.`);
    }

    // 2. CUSTOM não possui resolução automática
    if (indicator.frequency === IndicatorFrequency.CUSTOM) {
      return {
        status: 'CUSTOM_FREQUENCY_NOT_SUPPORTED',
        indicatorId,
        message:
          'Indicadores com frequency=CUSTOM requerem periodStart/periodEnd ' +
          'fornecidos manualmente. Use o endpoint POST /history diretamente.',
      };
    }

    // 3 + 4. Verificar se o período está encerrado via IndicatorPeriodClosingService.
    // O serviço usa referenceDate - 1ms internamente para identificar o período que acabou.
    // periodStart/periodEnd do resultado correspondem ao período encerrado.
    const indForClosing: IndicatorForClosing = {
      id: indicator.id,
      frequency: indicator.frequency as IndicatorFrequency,
      isActive: indicator.isActive,
    };
    const closingCheck = this.periodClosing.check(
      indForClosing,
      referenceDate,
      timezone,
    );

    if (!closingCheck.isClosed) {
      // Para retornar periodStart/periodEnd no PERIOD_OPEN, resolve o período atual
      const resolution = this.periodResolver.resolve(
        indicator.frequency as IndicatorFrequency,
        referenceDate,
        timezone,
      );
      const periodStart = isPeriodResolution(resolution)
        ? resolution.periodStart
        : referenceDate;
      const periodEnd = isPeriodResolution(resolution)
        ? resolution.periodEnd
        : referenceDate;
      return {
        status: 'PERIOD_OPEN',
        indicatorId,
        periodStart,
        periodEnd,
        referenceDate,
      };
    }

    // O período encerrado está em closingCheck.periodStart / closingCheck.periodEnd
    const { periodStart, periodEnd } = closingCheck as {
      periodStart: Date;
      periodEnd: Date;
    };

    // 5. Verificar idempotência — histórico já existe?
    const existing = await this.prisma.indicatorHistory.findUnique({
      where: {
        indicatorId_periodStart_periodEnd: {
          indicatorId,
          periodStart,
          periodEnd,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return {
        status: 'ALREADY_CLOSED',
        indicatorId,
        historyId: existing.id,
        periodStart,
        periodEnd,
      };
    }

    // 6. FORMULA sem fórmula definida → não há o que calcular
    // Se a fórmula estiver definida, o AggregationEngine + FormulaEngine a avaliarão.
    if (
      indicator.aggregationType === AggregationType.FORMULA &&
      !indicator.formula
    ) {
      return {
        status: 'FORMULA_ENGINE_REQUIRED',
        indicatorId,
        periodStart,
        periodEnd,
        formula: null,
      };
    }

    // 7. Buscar medições do período [periodStart, periodEnd)
    const rawMeasurements = await this.prisma.indicatorMeasurement.findMany({
      where: {
        indicatorId,
        referenceDate: {
          gte: periodStart,
          lt: periodEnd, // exclusivo: < periodEnd
        },
      },
      orderBy: { referenceDate: 'asc' },
      select: { value: true, referenceDate: true },
    });

    const measurements: MeasurementInput[] = rawMeasurements.map((m) => ({
      value: m.value,
      referenceDate: m.referenceDate,
    }));

    // 8. Agregar via AggregationEngineService
    const aggInput: IndicatorAggregationInput = {
      aggregationType: indicator.aggregationType as AggregationType,
      formula: indicator.formula,
    };

    const aggResult = this.aggregationEngine.aggregate(
      aggInput,
      periodStart,
      periodEnd,
      measurements,
    );

    // FORMULA guard (não deve chegar aqui, mas por segurança)
    if (isFormulaResult(aggResult)) {
      return {
        status: 'FORMULA_ENGINE_REQUIRED',
        indicatorId,
        periodStart,
        periodEnd,
        formula: indicator.formula,
      };
    }

    const value = aggResult.value;

    // 9. NO_DATA: sem medições e aggregationType != COUNT
    // Para COUNT: value=0 é semântico (0 eventos é um resultado válido)
    if (
      value === null &&
      (indicator.aggregationType as AggregationType) !== AggregationType.COUNT
    ) {
      return {
        status: 'NO_DATA',
        indicatorId,
        periodStart,
        periodEnd,
        aggregationType: indicator.aggregationType as AggregationType,
      };
    }

    // 10. Buscar previousValue no histórico do período imediatamente anterior
    //
    // "Período anterior" = histórico com periodEnd = periodStart do período atual.
    // Isso garante que o previousValue é o resultado consolidado do período
    // imediatamente anterior, independentemente de gaps.
    const previousHistory = await this.prisma.indicatorHistory.findFirst({
      where: {
        indicatorId,
        periodEnd: periodStart, // o período anterior termina onde o atual começa
      },
      orderBy: { periodStart: 'desc' },
      select: { value: true },
    });

    const previousValue =
      previousHistory?.value != null
        ? this.decimalToNumber(previousHistory.value)
        : null;

    // 11. Calcular variationPercent
    const variationPercent = this.computeVariation(value, previousValue);

    // 12. Determinar goalValue do período
    const goalValue =
      indicator.goalValue != null
        ? this.decimalToNumber(indicator.goalValue)
        : null;

    // 13. Determinar status usando IndicatorAnalyticsService
    const indicatorStatus = this.computeStatus(value, goalValue, indicator);

    // 14. Persistir IndicatorHistory via IndicatorHistoryService
    const history = await this.historyService.create(indicatorId, {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      value: value ?? undefined,
      goalValue: goalValue ?? undefined,
      previousValue: previousValue ?? undefined,
      variationPercent: variationPercent ?? undefined,
      status: indicatorStatus,
    });

    // 15. Sincronizar estado corrente do Indicator a partir do histórico criado.
    //     Atualiza SOMENTE Indicator.currentValue e Indicator.status.
    //     Nenhum outro campo é alterado.
    await this.currentStateService.syncFromHistory(indicatorId, {
      value: history.value,
      status: history.status,
    });

    return {
      status: 'CLOSED',
      historyId: history.id,
      indicatorId,
      periodStart,
      periodEnd,
      value,
      previousValue,
      variationPercent,
      goalValue,
      indicatorStatus,
      measurementCount: aggResult.measurementCount,
      aggregationType: indicator.aggregationType as AggregationType,
      isActive: indicator.isActive,
    };
  }

  // ── Helpers privados ──────────────────────────────────────────────────────────

  /**
   * Calcula variationPercent = ((value - prev) / |prev|) * 100.
   * Retorna null quando value=null, prev=null ou prev=0.
   */
  private computeVariation(
    value: number | null,
    previousValue: number | null,
  ): number | null {
    if (value == null || previousValue == null || previousValue === 0) {
      return null;
    }
    return ((value - previousValue) / Math.abs(previousValue)) * 100;
  }

  /**
   * Determina o status do resultado usando IndicatorAnalyticsService.
   * Reutiliza a regra existente para evitar duplicação.
   */
  private computeStatus(
    value: number | null,
    goalValue: number | null,
    indicator: IndicatorForApuration,
  ): IndicatorStatus {
    const minGoal =
      indicator.minimumGoalValue != null
        ? this.decimalToNumber(indicator.minimumGoalValue)
        : null;
    const maxGoal =
      indicator.maximumGoalValue != null
        ? this.decimalToNumber(indicator.maximumGoalValue)
        : null;
    const desiredDirection =
      (indicator.desiredDirection as IndicatorDesiredDirection) ??
      IndicatorDesiredDirection.HIGHER_IS_BETTER;

    const { targetStatus } = this.analytics.computeTargetAchievement(
      value,
      goalValue,
      minGoal,
      maxGoal,
      desiredDirection,
      null, // daysRemaining — não relevante para histórico
    );

    return this.analytics.computeVisualStatus(targetStatus, null, false, value);
  }

  /** Converte Decimal do Prisma ou número puro para number | null. */
  private decimalToNumber(d: unknown): number | null {
    if (d == null) return null;
    if (typeof d === 'object' && d !== null && 'toNumber' in d) {
      return (d as { toNumber(): number }).toNumber();
    }
    const n = Number(d);
    return isFinite(n) && !isNaN(n) ? n : null;
  }
}
