import { Injectable } from '@nestjs/common';
import { IndicatorDesiredDirection } from './enums/indicator-desired-direction.enum';
import { IndicatorStatus } from './enums/indicator-status.enum';
import { IndicatorTargetStatus } from './enums/indicator-target-status.enum';
import { IndicatorVariationStatus } from './enums/indicator-variation-status.enum';

/** Duck-type para Decimal do Prisma (evita import direto do runtime interno) */
type DecimalLike = { toNumber(): number } | number | string | null;

// ── Tipos internos ─────────────────────────────────────────────────────────────

export interface MeasurementRaw {
  value: DecimalLike;
  referenceDate: Date;
}

export interface AnalyticsInput {
  measurements: MeasurementRaw[];
  goalValue: DecimalLike;
  minimumGoalValue: DecimalLike;
  maximumGoalValue: DecimalLike;
  desiredDirection: IndicatorDesiredDirection;
  endDate: Date | null;
}

export interface AnalyticsResult {
  currentValue: number | null;
  previousValue: number | null;
  variation: number | null;
  variationCalculationStatus: IndicatorVariationStatus;
  targetAchievementPercentage: number | null;
  targetDifference: number | null;
  targetStatus: IndicatorTargetStatus;
  daysRemaining: number | null;
  isOverdue: boolean;
  lastMeasurementDate: string | null;
  computedStatus: IndicatorStatus;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toNumber(d: DecimalLike | undefined): number | null {
  if (d == null) return null;
  const n =
    typeof d === 'object' && d !== null && 'toNumber' in d
      ? d.toNumber()
      : Number(d);
  if (!isFinite(n)) return null;
  return n;
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class IndicatorAnalyticsService {
  /**
   * Ponto central de todos os cálculos analíticos de um indicador.
   * Nenhuma lógica de negócio deve ficar duplicada em controllers ou frontend.
   */
  compute(input: AnalyticsInput): AnalyticsResult {
    // 1. Ordenar medições por data desc e extrair as 2 mais recentes
    const sorted = [...input.measurements].sort(
      (a, b) => b.referenceDate.getTime() - a.referenceDate.getTime(),
    );

    const latestMeasurement = sorted[0] ?? null;
    const previousMeasurement = sorted[1] ?? null;

    const currentValue = latestMeasurement
      ? toNumber(latestMeasurement.value)
      : null;
    const previousValue = previousMeasurement
      ? toNumber(previousMeasurement.value)
      : null;
    const lastMeasurementDate = latestMeasurement
      ? latestMeasurement.referenceDate.toISOString().substring(0, 10)
      : null;

    // 2. Variação percentual
    const { variation, variationCalculationStatus } = this.computeVariation(
      currentValue,
      previousValue,
    );

    // 3. Dias restantes
    const { daysRemaining, isOverdue } = this.computeDaysRemaining(
      input.endDate,
    );

    // 4. Atingimento da meta
    const { targetAchievementPercentage, targetDifference, targetStatus } =
      this.computeTargetAchievement(
        currentValue,
        toNumber(input.goalValue),
        toNumber(input.minimumGoalValue),
        toNumber(input.maximumGoalValue),
        input.desiredDirection,
        daysRemaining,
      );

    // 5. Status visual final
    const computedStatus = this.computeVisualStatus(
      targetStatus,
      daysRemaining,
      isOverdue,
      currentValue,
    );

    return {
      currentValue,
      previousValue,
      variation,
      variationCalculationStatus,
      targetAchievementPercentage,
      targetDifference,
      targetStatus,
      daysRemaining,
      isOverdue,
      lastMeasurementDate,
      computedStatus,
    };
  }

  // ── 3.2 Variação percentual ─────────────────────────────────────────────────

  computeVariation(
    currentValue: number | null,
    previousValue: number | null,
  ): {
    variation: number | null;
    variationCalculationStatus: IndicatorVariationStatus;
  } {
    if (currentValue == null) {
      return {
        variation: null,
        variationCalculationStatus: IndicatorVariationStatus.NO_CURRENT_VALUE,
      };
    }
    if (previousValue == null) {
      return {
        variation: null,
        variationCalculationStatus: IndicatorVariationStatus.NO_PREVIOUS_VALUE,
      };
    }
    if (previousValue === 0) {
      return {
        variation: null,
        variationCalculationStatus:
          IndicatorVariationStatus.PREVIOUS_VALUE_ZERO,
      };
    }
    const raw =
      ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    return {
      variation: roundTo(raw, 10), // precisão máxima; frontend formata
      variationCalculationStatus: IndicatorVariationStatus.CALCULATED,
    };
  }

  // ── 3.3 Dias restantes ──────────────────────────────────────────────────────

  computeDaysRemaining(endDate: Date | null): {
    daysRemaining: number | null;
    isOverdue: boolean;
  } {
    if (!endDate) {
      return { daysRemaining: null, isOverdue: false };
    }
    // Padronizar início do dia UTC
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);

    const endUtc = new Date(endDate);
    endUtc.setUTCHours(0, 0, 0, 0);

    // Não contar o dia atual: subtrair 1
    const diffMs = endUtc.getTime() - todayUtc.getTime();
    const daysRemaining = Math.ceil(diffMs / 86_400_000) - 1;

    return {
      daysRemaining,
      isOverdue: daysRemaining < 0,
    };
  }

  // ── 3.4 Atingimento da meta ─────────────────────────────────────────────────

  computeTargetAchievement(
    currentValue: number | null,
    goalValue: number | null,
    minimumGoalValue: number | null,
    maximumGoalValue: number | null,
    desiredDirection: IndicatorDesiredDirection,
    daysRemaining: number | null,
  ): {
    targetAchievementPercentage: number | null;
    targetDifference: number | null;
    targetStatus: IndicatorTargetStatus;
  } {
    if (currentValue == null) {
      return {
        targetAchievementPercentage: null,
        targetDifference: null,
        targetStatus: IndicatorTargetStatus.NO_DATA,
      };
    }

    if (desiredDirection === IndicatorDesiredDirection.RANGE_IS_BETTER) {
      if (minimumGoalValue == null || maximumGoalValue == null) {
        return {
          targetAchievementPercentage: null,
          targetDifference: null,
          targetStatus: IndicatorTargetStatus.NO_GOAL,
        };
      }
      if (currentValue < minimumGoalValue) {
        return {
          targetAchievementPercentage: roundTo(
            (currentValue / minimumGoalValue) * 100,
            4,
          ),
          targetDifference: roundTo(currentValue - minimumGoalValue, 4),
          targetStatus: IndicatorTargetStatus.BELOW_RANGE,
        };
      }
      if (currentValue > maximumGoalValue) {
        return {
          targetAchievementPercentage: roundTo(
            (currentValue / maximumGoalValue) * 100,
            4,
          ),
          targetDifference: roundTo(currentValue - maximumGoalValue, 4),
          targetStatus: IndicatorTargetStatus.ABOVE_RANGE,
        };
      }
      return {
        targetAchievementPercentage: 100,
        targetDifference: 0,
        targetStatus: IndicatorTargetStatus.WITHIN_RANGE,
      };
    }

    if (goalValue == null || goalValue === 0) {
      return {
        targetAchievementPercentage: null,
        targetDifference: null,
        targetStatus: IndicatorTargetStatus.NO_GOAL,
      };
    }

    if (desiredDirection === IndicatorDesiredDirection.HIGHER_IS_BETTER) {
      const pct = roundTo((currentValue / goalValue) * 100, 4);
      const diff = roundTo(currentValue - goalValue, 4);

      if (currentValue >= goalValue) {
        return {
          targetAchievementPercentage: pct,
          targetDifference: diff,
          targetStatus: IndicatorTargetStatus.TARGET_ACHIEVED,
        };
      }
      const status = this.trackStatus(pct, daysRemaining);
      return {
        targetAchievementPercentage: pct,
        targetDifference: diff,
        targetStatus: status,
      };
    }

    // LOWER_IS_BETTER
    const pct =
      goalValue > 0 ? roundTo((goalValue / currentValue) * 100, 4) : null;
    const diff = roundTo(goalValue - currentValue, 4); // positivo = favorável

    if (currentValue <= goalValue) {
      return {
        targetAchievementPercentage: pct,
        targetDifference: diff,
        targetStatus: IndicatorTargetStatus.TARGET_ACHIEVED,
      };
    }
    // Para LOWER_IS_BETTER, o "achievement" cai quando currentValue sobe acima da meta
    const lowerPct = roundTo((goalValue / currentValue) * 100, 4);
    const status = this.trackStatus(lowerPct, daysRemaining);
    return {
      targetAchievementPercentage: lowerPct,
      targetDifference: diff,
      targetStatus: status,
    };
  }

  // ── 3.5 Status visual final ─────────────────────────────────────────────────

  computeVisualStatus(
    targetStatus: IndicatorTargetStatus,
    daysRemaining: number | null,
    isOverdue: boolean,
    currentValue: number | null,
  ): IndicatorStatus {
    // Sem valor → sem status definido
    if (currentValue == null) return IndicatorStatus.NEUTRAL;

    // Meta atingida ou dentro da faixa → verde
    if (
      targetStatus === IndicatorTargetStatus.TARGET_ACHIEVED ||
      targetStatus === IndicatorTargetStatus.WITHIN_RANGE ||
      targetStatus === IndicatorTargetStatus.ON_TRACK
    ) {
      return IndicatorStatus.SUCCESS;
    }

    // Fora dos trilhos, faixa violada ou prazo vencido → vermelho
    if (
      targetStatus === IndicatorTargetStatus.OFF_TRACK ||
      targetStatus === IndicatorTargetStatus.BELOW_RANGE ||
      targetStatus === IndicatorTargetStatus.ABOVE_RANGE ||
      isOverdue
    ) {
      return IndicatorStatus.DANGER;
    }

    // Em risco ou prazo crítico (≤7 dias) → amarelo
    if (
      targetStatus === IndicatorTargetStatus.AT_RISK ||
      (daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7)
    ) {
      return IndicatorStatus.WARNING;
    }

    // Sem meta configurada ou sem dados → neutro
    return IndicatorStatus.NEUTRAL;
  }

  // ── Helper privado ───────────────────────────────────────────────────────────

  private trackStatus(
    achievementPct: number,
    daysRemaining: number | null,
  ): IndicatorTargetStatus {
    if (achievementPct >= 90) return IndicatorTargetStatus.ON_TRACK;
    if (achievementPct >= 70) {
      if (daysRemaining !== null && daysRemaining <= 7)
        return IndicatorTargetStatus.AT_RISK;
      return IndicatorTargetStatus.ON_TRACK;
    }
    if (achievementPct >= 50) return IndicatorTargetStatus.AT_RISK;
    return IndicatorTargetStatus.OFF_TRACK;
  }
}
