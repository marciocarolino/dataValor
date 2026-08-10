"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicatorPeriodApurationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const period_resolver_service_1 = require("./period-resolver.service");
const indicator_period_closing_service_1 = require("./indicator-period-closing.service");
const aggregation_engine_service_1 = require("./aggregation-engine.service");
const indicator_history_service_1 = require("./indicator-history.service");
const indicator_analytics_service_1 = require("./indicator-analytics.service");
const indicator_current_state_service_1 = require("./indicator-current-state.service");
const indicator_frequency_enum_1 = require("./enums/indicator-frequency.enum");
const aggregation_type_enum_1 = require("./enums/aggregation-type.enum");
const indicator_desired_direction_enum_1 = require("./enums/indicator-desired-direction.enum");
let IndicatorPeriodApurationService = class IndicatorPeriodApurationService {
    prisma;
    periodResolver;
    periodClosing;
    aggregationEngine;
    historyService;
    analytics;
    currentStateService;
    constructor(prisma, periodResolver, periodClosing, aggregationEngine, historyService, analytics, currentStateService) {
        this.prisma = prisma;
        this.periodResolver = periodResolver;
        this.periodClosing = periodClosing;
        this.aggregationEngine = aggregationEngine;
        this.historyService = historyService;
        this.analytics = analytics;
        this.currentStateService = currentStateService;
    }
    async closePeriod(indicatorId, referenceDate = new Date(), timezone = period_resolver_service_1.BUSINESS_TIMEZONE) {
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
            throw new common_1.NotFoundException(`Indicador ${indicatorId} não encontrado.`);
        }
        if (indicator.frequency === indicator_frequency_enum_1.IndicatorFrequency.CUSTOM) {
            return {
                status: 'CUSTOM_FREQUENCY_NOT_SUPPORTED',
                indicatorId,
                message: 'Indicadores com frequency=CUSTOM requerem periodStart/periodEnd ' +
                    'fornecidos manualmente. Use o endpoint POST /history diretamente.',
            };
        }
        const indForClosing = {
            id: indicator.id,
            frequency: indicator.frequency,
            isActive: indicator.isActive,
        };
        const closingCheck = this.periodClosing.check(indForClosing, referenceDate, timezone);
        if (!closingCheck.isClosed) {
            const resolution = this.periodResolver.resolve(indicator.frequency, referenceDate, timezone);
            const periodStart = (0, period_resolver_service_1.isPeriodResolution)(resolution)
                ? resolution.periodStart
                : referenceDate;
            const periodEnd = (0, period_resolver_service_1.isPeriodResolution)(resolution)
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
        const { periodStart, periodEnd } = closingCheck;
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
        if (indicator.aggregationType === aggregation_type_enum_1.AggregationType.FORMULA &&
            !indicator.formula) {
            return {
                status: 'FORMULA_ENGINE_REQUIRED',
                indicatorId,
                periodStart,
                periodEnd,
                formula: null,
            };
        }
        const rawMeasurements = await this.prisma.indicatorMeasurement.findMany({
            where: {
                indicatorId,
                referenceDate: {
                    gte: periodStart,
                    lt: periodEnd,
                },
            },
            orderBy: { referenceDate: 'asc' },
            select: { value: true, referenceDate: true },
        });
        const measurements = rawMeasurements.map((m) => ({
            value: m.value,
            referenceDate: m.referenceDate,
        }));
        const aggInput = {
            aggregationType: indicator.aggregationType,
            formula: indicator.formula,
        };
        const aggResult = this.aggregationEngine.aggregate(aggInput, periodStart, periodEnd, measurements);
        if ((0, aggregation_engine_service_1.isFormulaResult)(aggResult)) {
            return {
                status: 'FORMULA_ENGINE_REQUIRED',
                indicatorId,
                periodStart,
                periodEnd,
                formula: indicator.formula,
            };
        }
        const value = aggResult.value;
        if (value === null &&
            indicator.aggregationType !== aggregation_type_enum_1.AggregationType.COUNT) {
            return {
                status: 'NO_DATA',
                indicatorId,
                periodStart,
                periodEnd,
                aggregationType: indicator.aggregationType,
            };
        }
        const previousHistory = await this.prisma.indicatorHistory.findFirst({
            where: {
                indicatorId,
                periodEnd: periodStart,
            },
            orderBy: { periodStart: 'desc' },
            select: { value: true },
        });
        const previousValue = previousHistory?.value != null
            ? this.decimalToNumber(previousHistory.value)
            : null;
        const variationPercent = this.computeVariation(value, previousValue);
        const goalValue = indicator.goalValue != null
            ? this.decimalToNumber(indicator.goalValue)
            : null;
        const indicatorStatus = this.computeStatus(value, goalValue, indicator);
        const history = await this.historyService.create(indicatorId, {
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            value: value ?? undefined,
            goalValue: goalValue ?? undefined,
            previousValue: previousValue ?? undefined,
            variationPercent: variationPercent ?? undefined,
            status: indicatorStatus,
        });
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
            aggregationType: indicator.aggregationType,
            isActive: indicator.isActive,
        };
    }
    computeVariation(value, previousValue) {
        if (value == null || previousValue == null || previousValue === 0) {
            return null;
        }
        return ((value - previousValue) / Math.abs(previousValue)) * 100;
    }
    computeStatus(value, goalValue, indicator) {
        const minGoal = indicator.minimumGoalValue != null
            ? this.decimalToNumber(indicator.minimumGoalValue)
            : null;
        const maxGoal = indicator.maximumGoalValue != null
            ? this.decimalToNumber(indicator.maximumGoalValue)
            : null;
        const desiredDirection = indicator.desiredDirection ??
            indicator_desired_direction_enum_1.IndicatorDesiredDirection.HIGHER_IS_BETTER;
        const { targetStatus } = this.analytics.computeTargetAchievement(value, goalValue, minGoal, maxGoal, desiredDirection, null);
        return this.analytics.computeVisualStatus(targetStatus, null, false, value);
    }
    decimalToNumber(d) {
        if (d == null)
            return null;
        if (typeof d === 'object' && d !== null && 'toNumber' in d) {
            return d.toNumber();
        }
        const n = Number(d);
        return isFinite(n) && !isNaN(n) ? n : null;
    }
};
exports.IndicatorPeriodApurationService = IndicatorPeriodApurationService;
exports.IndicatorPeriodApurationService = IndicatorPeriodApurationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        period_resolver_service_1.PeriodResolverService,
        indicator_period_closing_service_1.IndicatorPeriodClosingService,
        aggregation_engine_service_1.AggregationEngineService,
        indicator_history_service_1.IndicatorHistoryService,
        indicator_analytics_service_1.IndicatorAnalyticsService,
        indicator_current_state_service_1.IndicatorCurrentStateService])
], IndicatorPeriodApurationService);
//# sourceMappingURL=indicator-period-apuration.service.js.map