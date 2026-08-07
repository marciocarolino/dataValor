import { IndicatorDesiredDirection } from './enums/indicator-desired-direction.enum';
import { IndicatorStatus } from './enums/indicator-status.enum';
import { IndicatorTargetStatus } from './enums/indicator-target-status.enum';
import { IndicatorVariationStatus } from './enums/indicator-variation-status.enum';
type DecimalLike = {
    toNumber(): number;
} | number | string | null;
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
export declare class IndicatorAnalyticsService {
    compute(input: AnalyticsInput): AnalyticsResult;
    computeVariation(currentValue: number | null, previousValue: number | null): {
        variation: number | null;
        variationCalculationStatus: IndicatorVariationStatus;
    };
    computeDaysRemaining(endDate: Date | null): {
        daysRemaining: number | null;
        isOverdue: boolean;
    };
    computeTargetAchievement(currentValue: number | null, goalValue: number | null, minimumGoalValue: number | null, maximumGoalValue: number | null, desiredDirection: IndicatorDesiredDirection, daysRemaining: number | null): {
        targetAchievementPercentage: number | null;
        targetDifference: number | null;
        targetStatus: IndicatorTargetStatus;
    };
    computeVisualStatus(targetStatus: IndicatorTargetStatus, daysRemaining: number | null, isOverdue: boolean, currentValue: number | null): IndicatorStatus;
    private trackStatus;
}
export {};
