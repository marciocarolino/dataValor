import { IndicatorFrequency } from './enums/indicator-frequency.enum';
export declare const BUSINESS_TIMEZONE = "America/Sao_Paulo";
export interface PeriodResolution {
    periodStart: Date;
    periodEnd: Date;
    frequency: IndicatorFrequency;
    referenceDate: Date;
    timezone: string;
}
export interface CustomPeriodResolution {
    frequency: IndicatorFrequency.CUSTOM;
    requiresManualConfiguration: true;
    message: string;
}
export type PeriodResolverResult = PeriodResolution | CustomPeriodResolution;
export declare function isPeriodResolution(r: PeriodResolverResult): r is PeriodResolution;
export declare class PeriodResolverService {
    resolve(frequency: IndicatorFrequency, referenceDate: Date, timezone?: string): PeriodResolverResult;
    private computeStartEnd;
    private getDateParts;
    private toUtcMidnight;
    private getDatePartsWithTime;
    private addCalendarDays;
    private isoDayOfWeek;
}
