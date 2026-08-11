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
var IndicatorStateReconciliationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicatorStateReconciliationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const indicator_current_state_service_1 = require("./indicator-current-state.service");
function toNumber(v) {
    if (v == null)
        return null;
    if (typeof v === 'object' && v !== null && 'toNumber' in v) {
        const n = v.toNumber();
        return isFinite(n) ? n : null;
    }
    const n = Number(v);
    return isFinite(n) && !isNaN(n) ? n : null;
}
function decimalsEqual(a, b) {
    const na = toNumber(a);
    const nb = toNumber(b);
    if (na === null && nb === null)
        return true;
    if (na === null || nb === null)
        return false;
    return Math.abs(na - nb) < 1e-9;
}
let IndicatorStateReconciliationService = IndicatorStateReconciliationService_1 = class IndicatorStateReconciliationService {
    prisma;
    currentStateService;
    logger = new common_1.Logger(IndicatorStateReconciliationService_1.name);
    constructor(prisma, currentStateService) {
        this.prisma = prisma;
        this.currentStateService = currentStateService;
    }
    async reconcileAll() {
        this.logger.log('[Reconciliation] Starting state reconciliation for all indicators');
        const indicators = await this.prisma.indicator.findMany({
            select: {
                id: true,
                name: true,
                currentValue: true,
                status: true,
            },
            orderBy: { createdAt: 'asc' },
        });
        const result = {
            total: indicators.length,
            consistent: 0,
            corrected: 0,
            withoutHistory: 0,
            failed: 0,
            entries: [],
        };
        for (const ind of indicators) {
            try {
                const entry = await this.reconcileOne(ind.id, ind.name, ind.currentValue, ind.status);
                result.entries.push(entry);
                if (!entry.hasHistory) {
                    result.withoutHistory++;
                }
                else if (!entry.inconsistent) {
                    result.consistent++;
                }
                else {
                    result.corrected++;
                }
            }
            catch (err) {
                result.failed++;
                this.logger.error(`[Reconciliation] Failed to reconcile indicator ${ind.id} (${ind.name})`, err instanceof Error ? err.stack : String(err));
                result.entries.push({
                    indicatorId: ind.id,
                    indicatorName: ind.name,
                    currentValue: toNumber(ind.currentValue),
                    indicatorStatus: ind.status,
                    hasHistory: false,
                    latestHistoryId: null,
                    latestHistoryValue: null,
                    latestHistoryStatus: null,
                    latestHistoryPeriodStart: null,
                    latestHistoryPeriodEnd: null,
                    inconsistent: false,
                });
            }
        }
        this.logger.log(`[Reconciliation] Completed: total=${result.total} consistent=${result.consistent} ` +
            `corrected=${result.corrected} withoutHistory=${result.withoutHistory} failed=${result.failed}`);
        return result;
    }
    async reconcileOne(indicatorId, indicatorName, rawCurrentValue, rawStatus) {
        const latest = await this.prisma.indicatorHistory.findFirst({
            where: { indicatorId },
            orderBy: [
                { periodEnd: 'desc' },
                { calculatedAt: 'desc' },
            ],
            select: {
                id: true,
                value: true,
                status: true,
                periodStart: true,
                periodEnd: true,
            },
        });
        const currentValue = toNumber(rawCurrentValue);
        const indicatorStatus = typeof rawStatus === 'string' ? rawStatus : 'NEUTRAL';
        if (!latest) {
            return {
                indicatorId,
                indicatorName,
                currentValue,
                indicatorStatus,
                hasHistory: false,
                latestHistoryId: null,
                latestHistoryValue: null,
                latestHistoryStatus: null,
                latestHistoryPeriodStart: null,
                latestHistoryPeriodEnd: null,
                inconsistent: false,
            };
        }
        const latestValue = toNumber(latest.value);
        const latestStatus = latest.status;
        const valueConsistent = decimalsEqual(rawCurrentValue, latest.value);
        const statusConsistent = indicatorStatus === latestStatus;
        const inconsistent = !valueConsistent || !statusConsistent;
        if (inconsistent) {
            this.logger.log(`[Reconciliation] Inconsistency found — indicator ${indicatorId} (${indicatorName}): ` +
                `currentValue=${String(currentValue)} → ${String(latestValue)}, ` +
                `status=${indicatorStatus} → ${latestStatus}`);
            await this.currentStateService.syncFromHistory(indicatorId, {
                value: latestValue,
                status: latestStatus,
            });
        }
        return {
            indicatorId,
            indicatorName,
            currentValue,
            indicatorStatus,
            hasHistory: true,
            latestHistoryId: latest.id,
            latestHistoryValue: latestValue,
            latestHistoryStatus: latestStatus,
            latestHistoryPeriodStart: latest.periodStart,
            latestHistoryPeriodEnd: latest.periodEnd,
            inconsistent,
        };
    }
};
exports.IndicatorStateReconciliationService = IndicatorStateReconciliationService;
exports.IndicatorStateReconciliationService = IndicatorStateReconciliationService = IndicatorStateReconciliationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        indicator_current_state_service_1.IndicatorCurrentStateService])
], IndicatorStateReconciliationService);
//# sourceMappingURL=indicator-state-reconciliation.service.js.map