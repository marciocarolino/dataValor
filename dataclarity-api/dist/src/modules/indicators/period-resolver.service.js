"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeriodResolverService = exports.BUSINESS_TIMEZONE = void 0;
exports.isPeriodResolution = isPeriodResolution;
const common_1 = require("@nestjs/common");
const indicator_frequency_enum_1 = require("./enums/indicator-frequency.enum");
exports.BUSINESS_TIMEZONE = 'America/Sao_Paulo';
function isPeriodResolution(r) {
    return r.periodStart !== undefined;
}
let PeriodResolverService = class PeriodResolverService {
    resolve(frequency, referenceDate, timezone = exports.BUSINESS_TIMEZONE) {
        if (frequency === indicator_frequency_enum_1.IndicatorFrequency.CUSTOM) {
            return {
                frequency: indicator_frequency_enum_1.IndicatorFrequency.CUSTOM,
                requiresManualConfiguration: true,
                message: 'A periodicidade CUSTOM requer que periodStart e periodEnd sejam ' +
                    'fornecidos explicitamente pelo usuário. O sistema não pode inferir ' +
                    'automaticamente a janela temporal para períodos personalizados.',
            };
        }
        const parts = this.getDateParts(referenceDate, timezone);
        const { startParts, endParts } = this.computeStartEnd(frequency, parts);
        return {
            periodStart: this.toUtcMidnight(startParts, timezone),
            periodEnd: this.toUtcMidnight(endParts, timezone),
            frequency,
            referenceDate,
            timezone,
        };
    }
    computeStartEnd(frequency, parts) {
        switch (frequency) {
            case indicator_frequency_enum_1.IndicatorFrequency.DAILY: {
                return {
                    startParts: { year: parts.year, month: parts.month, day: parts.day },
                    endParts: this.addCalendarDays(parts.year, parts.month, parts.day, 1),
                };
            }
            case indicator_frequency_enum_1.IndicatorFrequency.WEEKLY: {
                const dow = this.isoDayOfWeek(parts.year, parts.month, parts.day);
                const daysToMonday = dow - 1;
                const mondayParts = this.addCalendarDays(parts.year, parts.month, parts.day, -daysToMonday);
                const nextMondayParts = this.addCalendarDays(mondayParts.year, mondayParts.month, mondayParts.day, 7);
                return { startParts: mondayParts, endParts: nextMondayParts };
            }
            case indicator_frequency_enum_1.IndicatorFrequency.MONTHLY: {
                const startParts = {
                    year: parts.year,
                    month: parts.month,
                    day: 1,
                };
                const endParts = parts.month === 12
                    ? { year: parts.year + 1, month: 1, day: 1 }
                    : { year: parts.year, month: parts.month + 1, day: 1 };
                return { startParts, endParts };
            }
            case indicator_frequency_enum_1.IndicatorFrequency.QUARTERLY: {
                const qStartMonth = Math.floor((parts.month - 1) / 3) * 3 + 1;
                const startParts = {
                    year: parts.year,
                    month: qStartMonth,
                    day: 1,
                };
                const qEndMonth = qStartMonth + 3;
                const endParts = qEndMonth > 12
                    ? { year: parts.year + 1, month: 1, day: 1 }
                    : { year: parts.year, month: qEndMonth, day: 1 };
                return { startParts, endParts };
            }
            case indicator_frequency_enum_1.IndicatorFrequency.SEMESTERLY: {
                const sStartMonth = parts.month <= 6 ? 1 : 7;
                const startParts = {
                    year: parts.year,
                    month: sStartMonth,
                    day: 1,
                };
                const endParts = sStartMonth === 1
                    ? { year: parts.year, month: 7, day: 1 }
                    : { year: parts.year + 1, month: 1, day: 1 };
                return { startParts, endParts };
            }
            case indicator_frequency_enum_1.IndicatorFrequency.YEARLY: {
                const startParts = { year: parts.year, month: 1, day: 1 };
                const endParts = { year: parts.year + 1, month: 1, day: 1 };
                return { startParts, endParts };
            }
            default: {
                const _exhaustive = frequency;
                throw new Error(`IndicatorFrequency não suportado: ${String(_exhaustive)}`);
            }
        }
    }
    getDateParts(date, timezone) {
        const fmt = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        const parts = fmt.formatToParts(date);
        const get = (t) => parseInt(parts.find((p) => p.type === t)?.value ?? '0', 10);
        return { year: get('year'), month: get('month'), day: get('day') };
    }
    toUtcMidnight(parts, timezone) {
        const pad = (n) => String(n).padStart(2, '0');
        const { year, month, day } = parts;
        const placeholder = new Date(`${year}-${pad(month)}-${pad(day)}T00:00:00.000Z`);
        const noonUtc = new Date(`${year}-${pad(month)}-${pad(day)}T12:00:00.000Z`);
        const noonParts = this.getDatePartsWithTime(noonUtc, timezone);
        const noonAsUtcString = `${pad(noonParts.year)}-${pad(noonParts.month)}-${pad(noonParts.day)}` +
            `T${pad(noonParts.hour)}:${pad(noonParts.minute)}:${pad(noonParts.second)}.000Z`;
        const noonAsUtc = new Date(noonAsUtcString);
        const offsetMs = noonUtc.getTime() - noonAsUtc.getTime();
        return new Date(placeholder.getTime() + offsetMs);
    }
    getDatePartsWithTime(date, timezone) {
        const fmt = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
        const parts = fmt.formatToParts(date);
        const get = (t) => {
            const val = parseInt(parts.find((p) => p.type === t)?.value ?? '0', 10);
            return t === 'hour' && val === 24 ? 0 : val;
        };
        return {
            year: get('year'),
            month: get('month'),
            day: get('day'),
            hour: get('hour'),
            minute: get('minute'),
            second: get('second'),
        };
    }
    addCalendarDays(year, month, day, days) {
        const pad = (n) => String(n).padStart(2, '0');
        const base = new Date(`${year}-${pad(month)}-${pad(day)}T12:00:00.000Z`);
        base.setUTCDate(base.getUTCDate() + days);
        return {
            year: base.getUTCFullYear(),
            month: base.getUTCMonth() + 1,
            day: base.getUTCDate(),
        };
    }
    isoDayOfWeek(year, month, day) {
        const pad = (n) => String(n).padStart(2, '0');
        const d = new Date(`${year}-${pad(month)}-${pad(day)}T12:00:00.000Z`);
        const dow = d.getUTCDay();
        return dow === 0 ? 7 : dow;
    }
};
exports.PeriodResolverService = PeriodResolverService;
exports.PeriodResolverService = PeriodResolverService = __decorate([
    (0, common_1.Injectable)()
], PeriodResolverService);
//# sourceMappingURL=period-resolver.service.js.map