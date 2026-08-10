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
var IndicatorPeriodClosingScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicatorPeriodClosingScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../prisma/prisma.service");
const indicator_period_apuration_service_1 = require("./indicator-period-apuration.service");
const indicator_period_backfill_service_1 = require("./indicator-period-backfill.service");
const period_resolver_service_1 = require("./period-resolver.service");
const indicator_frequency_enum_1 = require("./enums/indicator-frequency.enum");
let IndicatorPeriodClosingScheduler = IndicatorPeriodClosingScheduler_1 = class IndicatorPeriodClosingScheduler {
    prisma;
    apuration;
    backfill;
    logger = new common_1.Logger(IndicatorPeriodClosingScheduler_1.name);
    _running = false;
    constructor(prisma, apuration, backfill) {
        this.prisma = prisma;
        this.apuration = apuration;
        this.backfill = backfill;
    }
    async handleCron() {
        await this.runCycle();
    }
    async runCycle(referenceDate = new Date()) {
        if (this._running) {
            this.logger.warn('[IndicatorPeriodScheduler] Ciclo anterior ainda em andamento — pulando esta execução.');
            return {
                processed: 0,
                closed: 0,
                alreadyClosed: 0,
                noData: 0,
                formulaRequired: 0,
                periodOpen: 0,
                skipped: 0,
                failed: 0,
            };
        }
        this._running = true;
        this.logger.log('[IndicatorPeriodScheduler] Starting period closing cycle');
        const result = {
            processed: 0,
            closed: 0,
            alreadyClosed: 0,
            noData: 0,
            formulaRequired: 0,
            periodOpen: 0,
            skipped: 0,
            failed: 0,
        };
        try {
            const indicators = await this.prisma.indicator.findMany({
                where: {
                    isActive: true,
                    frequency: { not: indicator_frequency_enum_1.IndicatorFrequency.CUSTOM },
                },
                select: {
                    id: true,
                    name: true,
                    frequency: true,
                    aggregationType: true,
                },
            });
            for (const indicator of indicators) {
                result.processed++;
                this.logger.log(`[IndicatorPeriodScheduler] Processing indicator ${indicator.id} (${indicator.name})`);
                try {
                    const apurationResult = await this.apuration.closePeriod(indicator.id, referenceDate, period_resolver_service_1.BUSINESS_TIMEZONE);
                    switch (apurationResult.status) {
                        case 'CLOSED': {
                            const r = apurationResult;
                            result.closed++;
                            this.logger.log(`[IndicatorPeriodScheduler] Period closed successfully`, {
                                indicatorId: r.indicatorId,
                                periodStart: r.periodStart,
                                periodEnd: r.periodEnd,
                                historyId: r.historyId,
                            });
                            break;
                        }
                        case 'ALREADY_CLOSED': {
                            const r = apurationResult;
                            result.alreadyClosed++;
                            this.logger.log(`[IndicatorPeriodScheduler] Period already closed`, {
                                indicatorId: r.indicatorId,
                                periodStart: r.periodStart,
                                periodEnd: r.periodEnd,
                            });
                            break;
                        }
                        case 'NO_DATA': {
                            const r = apurationResult;
                            result.noData++;
                            this.logger.log(`[IndicatorPeriodScheduler] Indicator skipped — no data`, { indicatorId: r.indicatorId, reason: 'NO_DATA' });
                            break;
                        }
                        case 'FORMULA_ENGINE_REQUIRED': {
                            const r = apurationResult;
                            result.formulaRequired++;
                            this.logger.log(`[IndicatorPeriodScheduler] Indicator skipped — formula engine required`, {
                                indicatorId: r.indicatorId,
                                reason: 'FORMULA_ENGINE_REQUIRED',
                            });
                            break;
                        }
                        case 'PERIOD_OPEN': {
                            const r = apurationResult;
                            result.periodOpen++;
                            this.logger.debug(`[IndicatorPeriodScheduler] Period not yet closed`, { indicatorId: r.indicatorId, periodEnd: r.periodEnd });
                            break;
                        }
                        case 'CUSTOM_FREQUENCY_NOT_SUPPORTED': {
                            result.skipped++;
                            this.logger.log(`[IndicatorPeriodScheduler] Indicator skipped — CUSTOM frequency`, {
                                indicatorId: indicator.id,
                                reason: 'CUSTOM_FREQUENCY_NOT_SUPPORTED',
                            });
                            break;
                        }
                        default: {
                            result.skipped++;
                            break;
                        }
                    }
                }
                catch (error) {
                    result.failed++;
                    this.logger.error(`[IndicatorPeriodScheduler] Failed to close period`, { indicatorId: indicator.id, error: String(error) });
                }
            }
            try {
                await this.backfill.runBackfill(referenceDate, period_resolver_service_1.BUSINESS_TIMEZONE);
            }
            catch (error) {
                this.logger.error('[IndicatorPeriodScheduler] Backfill failed — continuing', { error: String(error) });
            }
        }
        finally {
            this._running = false;
        }
        this.logger.log('[IndicatorPeriodScheduler] Period closing cycle completed', result);
        return result;
    }
};
exports.IndicatorPeriodClosingScheduler = IndicatorPeriodClosingScheduler;
__decorate([
    (0, schedule_1.Cron)('0 * * * * *', {
        name: 'indicator-period-closing',
        timeZone: period_resolver_service_1.BUSINESS_TIMEZONE,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IndicatorPeriodClosingScheduler.prototype, "handleCron", null);
exports.IndicatorPeriodClosingScheduler = IndicatorPeriodClosingScheduler = IndicatorPeriodClosingScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        indicator_period_apuration_service_1.IndicatorPeriodApurationService,
        indicator_period_backfill_service_1.IndicatorPeriodBackfillService])
], IndicatorPeriodClosingScheduler);
//# sourceMappingURL=indicator-period-closing.scheduler.js.map