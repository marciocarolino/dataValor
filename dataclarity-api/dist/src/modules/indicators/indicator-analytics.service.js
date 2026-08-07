"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicatorAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const indicator_desired_direction_enum_1 = require("./enums/indicator-desired-direction.enum");
const indicator_status_enum_1 = require("./enums/indicator-status.enum");
const indicator_target_status_enum_1 = require("./enums/indicator-target-status.enum");
const indicator_variation_status_enum_1 = require("./enums/indicator-variation-status.enum");
function toNumber(d) {
    if (d == null)
        return null;
    const n = typeof d === 'object' && d !== null && 'toNumber' in d
        ? d.toNumber()
        : Number(d);
    if (!isFinite(n))
        return null;
    return n;
}
function roundTo(value, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}
let IndicatorAnalyticsService = class IndicatorAnalyticsService {
    compute(input) {
        const sorted = [...input.measurements].sort((a, b) => b.referenceDate.getTime() - a.referenceDate.getTime());
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
        const { variation, variationCalculationStatus } = this.computeVariation(currentValue, previousValue);
        const { daysRemaining, isOverdue } = this.computeDaysRemaining(input.endDate);
        const { targetAchievementPercentage, targetDifference, targetStatus } = this.computeTargetAchievement(currentValue, toNumber(input.goalValue), toNumber(input.minimumGoalValue), toNumber(input.maximumGoalValue), input.desiredDirection, daysRemaining);
        const computedStatus = this.computeVisualStatus(targetStatus, daysRemaining, isOverdue, currentValue);
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
    computeVariation(currentValue, previousValue) {
        if (currentValue == null) {
            return {
                variation: null,
                variationCalculationStatus: indicator_variation_status_enum_1.IndicatorVariationStatus.NO_CURRENT_VALUE,
            };
        }
        if (previousValue == null) {
            return {
                variation: null,
                variationCalculationStatus: indicator_variation_status_enum_1.IndicatorVariationStatus.NO_PREVIOUS_VALUE,
            };
        }
        if (previousValue === 0) {
            return {
                variation: null,
                variationCalculationStatus: indicator_variation_status_enum_1.IndicatorVariationStatus.PREVIOUS_VALUE_ZERO,
            };
        }
        const raw = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
        return {
            variation: roundTo(raw, 10),
            variationCalculationStatus: indicator_variation_status_enum_1.IndicatorVariationStatus.CALCULATED,
        };
    }
    computeDaysRemaining(endDate) {
        if (!endDate) {
            return { daysRemaining: null, isOverdue: false };
        }
        const todayUtc = new Date();
        todayUtc.setUTCHours(0, 0, 0, 0);
        const endUtc = new Date(endDate);
        endUtc.setUTCHours(0, 0, 0, 0);
        const diffMs = endUtc.getTime() - todayUtc.getTime();
        const daysRemaining = Math.ceil(diffMs / 86_400_000) - 1;
        return {
            daysRemaining,
            isOverdue: daysRemaining < 0,
        };
    }
    computeTargetAchievement(currentValue, goalValue, minimumGoalValue, maximumGoalValue, desiredDirection, daysRemaining) {
        if (currentValue == null) {
            return {
                targetAchievementPercentage: null,
                targetDifference: null,
                targetStatus: indicator_target_status_enum_1.IndicatorTargetStatus.NO_DATA,
            };
        }
        if (desiredDirection === indicator_desired_direction_enum_1.IndicatorDesiredDirection.RANGE_IS_BETTER) {
            if (minimumGoalValue == null || maximumGoalValue == null) {
                return {
                    targetAchievementPercentage: null,
                    targetDifference: null,
                    targetStatus: indicator_target_status_enum_1.IndicatorTargetStatus.NO_GOAL,
                };
            }
            if (currentValue < minimumGoalValue) {
                return {
                    targetAchievementPercentage: roundTo((currentValue / minimumGoalValue) * 100, 4),
                    targetDifference: roundTo(currentValue - minimumGoalValue, 4),
                    targetStatus: indicator_target_status_enum_1.IndicatorTargetStatus.BELOW_RANGE,
                };
            }
            if (currentValue > maximumGoalValue) {
                return {
                    targetAchievementPercentage: roundTo((currentValue / maximumGoalValue) * 100, 4),
                    targetDifference: roundTo(currentValue - maximumGoalValue, 4),
                    targetStatus: indicator_target_status_enum_1.IndicatorTargetStatus.ABOVE_RANGE,
                };
            }
            return {
                targetAchievementPercentage: 100,
                targetDifference: 0,
                targetStatus: indicator_target_status_enum_1.IndicatorTargetStatus.WITHIN_RANGE,
            };
        }
        if (goalValue == null || goalValue === 0) {
            return {
                targetAchievementPercentage: null,
                targetDifference: null,
                targetStatus: indicator_target_status_enum_1.IndicatorTargetStatus.NO_GOAL,
            };
        }
        if (desiredDirection === indicator_desired_direction_enum_1.IndicatorDesiredDirection.HIGHER_IS_BETTER) {
            const pct = roundTo((currentValue / goalValue) * 100, 4);
            const diff = roundTo(currentValue - goalValue, 4);
            if (currentValue >= goalValue) {
                return {
                    targetAchievementPercentage: pct,
                    targetDifference: diff,
                    targetStatus: indicator_target_status_enum_1.IndicatorTargetStatus.TARGET_ACHIEVED,
                };
            }
            const status = this.trackStatus(pct, daysRemaining);
            return {
                targetAchievementPercentage: pct,
                targetDifference: diff,
                targetStatus: status,
            };
        }
        const pct = goalValue > 0 ? roundTo((goalValue / currentValue) * 100, 4) : null;
        const diff = roundTo(goalValue - currentValue, 4);
        if (currentValue <= goalValue) {
            return {
                targetAchievementPercentage: pct,
                targetDifference: diff,
                targetStatus: indicator_target_status_enum_1.IndicatorTargetStatus.TARGET_ACHIEVED,
            };
        }
        const lowerPct = roundTo((goalValue / currentValue) * 100, 4);
        const status = this.trackStatus(lowerPct, daysRemaining);
        return {
            targetAchievementPercentage: lowerPct,
            targetDifference: diff,
            targetStatus: status,
        };
    }
    computeVisualStatus(targetStatus, daysRemaining, isOverdue, currentValue) {
        if (currentValue == null)
            return indicator_status_enum_1.IndicatorStatus.NEUTRAL;
        if (targetStatus === indicator_target_status_enum_1.IndicatorTargetStatus.TARGET_ACHIEVED ||
            targetStatus === indicator_target_status_enum_1.IndicatorTargetStatus.WITHIN_RANGE) {
            return indicator_status_enum_1.IndicatorStatus.SUCCESS;
        }
        if (targetStatus === indicator_target_status_enum_1.IndicatorTargetStatus.OFF_TRACK ||
            targetStatus === indicator_target_status_enum_1.IndicatorTargetStatus.BELOW_RANGE ||
            targetStatus === indicator_target_status_enum_1.IndicatorTargetStatus.ABOVE_RANGE ||
            isOverdue) {
            return indicator_status_enum_1.IndicatorStatus.DANGER;
        }
        if (targetStatus === indicator_target_status_enum_1.IndicatorTargetStatus.AT_RISK ||
            (daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7)) {
            return indicator_status_enum_1.IndicatorStatus.WARNING;
        }
        if (targetStatus === indicator_target_status_enum_1.IndicatorTargetStatus.ON_TRACK ||
            targetStatus === indicator_target_status_enum_1.IndicatorTargetStatus.NO_GOAL ||
            targetStatus === indicator_target_status_enum_1.IndicatorTargetStatus.NO_DATA) {
            return indicator_status_enum_1.IndicatorStatus.NEUTRAL;
        }
        return indicator_status_enum_1.IndicatorStatus.NEUTRAL;
    }
    trackStatus(achievementPct, daysRemaining) {
        if (achievementPct >= 90)
            return indicator_target_status_enum_1.IndicatorTargetStatus.ON_TRACK;
        if (achievementPct >= 70) {
            if (daysRemaining !== null && daysRemaining <= 7)
                return indicator_target_status_enum_1.IndicatorTargetStatus.AT_RISK;
            return indicator_target_status_enum_1.IndicatorTargetStatus.ON_TRACK;
        }
        if (achievementPct >= 50)
            return indicator_target_status_enum_1.IndicatorTargetStatus.AT_RISK;
        return indicator_target_status_enum_1.IndicatorTargetStatus.OFF_TRACK;
    }
};
exports.IndicatorAnalyticsService = IndicatorAnalyticsService;
exports.IndicatorAnalyticsService = IndicatorAnalyticsService = __decorate([
    (0, common_1.Injectable)()
], IndicatorAnalyticsService);
//# sourceMappingURL=indicator-analytics.service.js.map