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
var IndicatorPeriodBackfillService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicatorPeriodBackfillService = exports.MAX_PERIODS_PER_INDICATOR = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const period_resolver_service_1 = require("./period-resolver.service");
const indicator_period_apuration_service_1 = require("./indicator-period-apuration.service");
const indicator_frequency_enum_1 = require("./enums/indicator-frequency.enum");
exports.MAX_PERIODS_PER_INDICATOR = 100;
let IndicatorPeriodBackfillService = IndicatorPeriodBackfillService_1 = class IndicatorPeriodBackfillService {
    prisma;
    periodResolver;
    apuration;
    logger = new common_1.Logger(IndicatorPeriodBackfillService_1.name);
    constructor(prisma, periodResolver, apuration) {
        this.prisma = prisma;
        this.periodResolver = periodResolver;
        this.apuration = apuration;
    }
    async runBackfill(referenceDate = new Date(), timezone = period_resolver_service_1.BUSINESS_TIMEZONE, includeInactive = false) {
        this.logger.log('[BackfillService] Starting backfill cycle', {
            referenceDate,
            timezone,
            includeInactive,
        });
        const cycle = {
            indicatorsProcessed: 0,
            indicatorsSkipped: 0,
            totalPeriodsFound: 0,
            totalClosed: 0,
            totalAlreadyClosed: 0,
            totalNoData: 0,
            totalFormulaRequired: 0,
            totalFailed: 0,
            indicatorsAborted: 0,
        };
        const indicators = await this.prisma.indicator.findMany({
            where: {
                ...(includeInactive ? {} : { isActive: true }),
                frequency: { not: indicator_frequency_enum_1.IndicatorFrequency.CUSTOM },
            },
            select: {
                id: true,
                frequency: true,
                createdAt: true,
                name: true,
            },
        });
        for (const indicator of indicators) {
            cycle.indicatorsProcessed++;
            this.logger.log(`[BackfillService] Processing indicator ${indicator.id} (${indicator.name})`);
            try {
                const result = await this.backfillIndicator(indicator.id, indicator.frequency, indicator.createdAt, referenceDate, timezone);
                cycle.totalPeriodsFound += result.periodsFound;
                cycle.totalClosed += result.closed;
                cycle.totalAlreadyClosed += result.alreadyClosed;
                cycle.totalNoData += result.noData;
                cycle.totalFormulaRequired += result.formulaRequired;
                cycle.totalFailed += result.failed;
                if (result.aborted)
                    cycle.indicatorsAborted++;
            }
            catch (error) {
                cycle.indicatorsSkipped++;
                this.logger.error(`[BackfillService] Failed to backfill indicator ${indicator.id}`, {
                    indicatorId: indicator.id,
                    error: String(error),
                });
            }
        }
        this.logger.log('[BackfillService] Backfill cycle completed', cycle);
        return cycle;
    }
    async backfillIndicator(indicatorId, frequency, startFrom, referenceDate = new Date(), timezone = period_resolver_service_1.BUSINESS_TIMEZONE) {
        const result = {
            indicatorId,
            periodsFound: 0,
            processed: 0,
            closed: 0,
            alreadyClosed: 0,
            noData: 0,
            formulaRequired: 0,
            failed: 0,
            aborted: false,
            firstPeriodStart: null,
            lastPeriodEnd: null,
        };
        if (frequency === indicator_frequency_enum_1.IndicatorFrequency.CUSTOM) {
            this.logger.log(`[BackfillService] Indicator skipped — CUSTOM frequency`, {
                indicatorId,
                reason: 'CUSTOM_FREQUENCY_NOT_SUPPORTED',
            });
            return result;
        }
        const pendingPeriods = await this.findPendingPeriods(indicatorId, frequency, startFrom, referenceDate, timezone);
        result.periodsFound = pendingPeriods.length;
        if (pendingPeriods.length === 0) {
            this.logger.debug(`[BackfillService] No pending periods for indicator ${indicatorId}`);
            return result;
        }
        this.logger.log(`[BackfillService] Found ${pendingPeriods.length} pending periods for ${indicatorId}`, {
            indicatorId,
            periodsFound: pendingPeriods.length,
            firstPeriod: pendingPeriods[0]?.periodEnd,
            lastPeriod: pendingPeriods[pendingPeriods.length - 1]?.periodEnd,
        });
        result.firstPeriodStart = pendingPeriods[0]?.periodStart ?? null;
        result.lastPeriodEnd =
            pendingPeriods[pendingPeriods.length - 1]?.periodEnd ?? null;
        for (const period of pendingPeriods) {
            if (result.processed >= exports.MAX_PERIODS_PER_INDICATOR) {
                this.logger.warn(`[BackfillService] Max periods reached for indicator ${indicatorId}`, {
                    indicatorId,
                    maxPeriods: exports.MAX_PERIODS_PER_INDICATOR,
                    periodsFound: pendingPeriods.length,
                });
                break;
            }
            result.processed++;
            try {
                const apurationResult = await this.apuration.closePeriod(indicatorId, period.periodEnd, timezone);
                switch (apurationResult.status) {
                    case 'CLOSED':
                        result.closed++;
                        this.logger.log(`[BackfillService] Period closed`, {
                            indicatorId,
                            periodStart: period.periodStart,
                            periodEnd: period.periodEnd,
                        });
                        break;
                    case 'ALREADY_CLOSED':
                        result.alreadyClosed++;
                        break;
                    case 'NO_DATA':
                        result.noData++;
                        break;
                    case 'FORMULA_ENGINE_REQUIRED':
                        result.formulaRequired++;
                        break;
                    case 'PERIOD_OPEN':
                        this.logger.warn(`[BackfillService] Unexpected PERIOD_OPEN during backfill`, {
                            indicatorId,
                            periodEnd: period.periodEnd,
                            referenceDate,
                        });
                        break;
                    default:
                        result.noData++;
                        break;
                }
            }
            catch (error) {
                result.failed++;
                result.aborted = true;
                this.logger.error(`[BackfillService] Error closing period — aborting backfill for indicator`, {
                    indicatorId,
                    periodStart: period.periodStart,
                    periodEnd: period.periodEnd,
                    error: String(error),
                });
                break;
            }
        }
        return result;
    }
    async findPendingPeriods(indicatorId, frequency, startFrom, referenceDate, timezone = period_resolver_service_1.BUSINESS_TIMEZONE) {
        const existingHistories = await this.prisma.indicatorHistory.findMany({
            where: { indicatorId },
            select: { periodStart: true },
        });
        const closedPeriodKeys = new Set(existingHistories.map((h) => h.periodStart.toISOString()));
        const pending = [];
        let currentRef = startFrom;
        let safetyCounter = 0;
        const SAFETY_LIMIT = 1000;
        while (safetyCounter < SAFETY_LIMIT) {
            safetyCounter++;
            const resolution = this.periodResolver.resolve(frequency, currentRef, timezone);
            if (!(0, period_resolver_service_1.isPeriodResolution)(resolution))
                break;
            const { periodStart, periodEnd } = resolution;
            if (periodEnd.getTime() > referenceDate.getTime())
                break;
            const key = periodStart.toISOString();
            if (!closedPeriodKeys.has(key)) {
                pending.push({ periodStart, periodEnd });
            }
            currentRef = periodEnd;
        }
        return pending;
    }
};
exports.IndicatorPeriodBackfillService = IndicatorPeriodBackfillService;
exports.IndicatorPeriodBackfillService = IndicatorPeriodBackfillService = IndicatorPeriodBackfillService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        period_resolver_service_1.PeriodResolverService,
        indicator_period_apuration_service_1.IndicatorPeriodApurationService])
], IndicatorPeriodBackfillService);
//# sourceMappingURL=indicator-period-backfill.service.js.map