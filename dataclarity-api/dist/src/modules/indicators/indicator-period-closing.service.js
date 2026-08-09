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
exports.IndicatorPeriodClosingService = void 0;
exports.isResolvedPeriodClosing = isResolvedPeriodClosing;
const common_1 = require("@nestjs/common");
const indicator_frequency_enum_1 = require("./enums/indicator-frequency.enum");
const period_resolver_service_1 = require("./period-resolver.service");
function isResolvedPeriodClosing(r) {
    return r.periodStart !== undefined;
}
let IndicatorPeriodClosingService = class IndicatorPeriodClosingService {
    periodResolver;
    constructor(periodResolver) {
        this.periodResolver = periodResolver;
    }
    check(indicator, referenceDate = new Date(), timezone = period_resolver_service_1.BUSINESS_TIMEZONE) {
        const resolverDate = new Date(referenceDate.getTime() - 1);
        const resolution = this.periodResolver.resolve(indicator.frequency, resolverDate, timezone);
        if (!(0, period_resolver_service_1.isPeriodResolution)(resolution)) {
            return {
                indicatorId: indicator.id,
                frequency: indicator_frequency_enum_1.IndicatorFrequency.CUSTOM,
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
    checkMany(indicators, referenceDate = new Date(), timezone = period_resolver_service_1.BUSINESS_TIMEZONE) {
        return indicators.map((ind) => this.check(ind, referenceDate, timezone));
    }
    evaluateClosure(indicator, resolution, referenceDate, timezone) {
        const isClosed = resolution.periodEnd.getTime() <= referenceDate.getTime();
        return {
            indicatorId: indicator.id,
            frequency: indicator.frequency,
            periodStart: resolution.periodStart,
            periodEnd: resolution.periodEnd,
            isClosed,
            isReadyForClosing: isClosed,
            isActive: indicator.isActive,
            referenceDate,
            timezone,
        };
    }
};
exports.IndicatorPeriodClosingService = IndicatorPeriodClosingService;
exports.IndicatorPeriodClosingService = IndicatorPeriodClosingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [period_resolver_service_1.PeriodResolverService])
], IndicatorPeriodClosingService);
//# sourceMappingURL=indicator-period-closing.service.js.map