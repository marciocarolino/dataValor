import { IndicatorFrequency } from './enums/indicator-frequency.enum';
import { PeriodResolverService } from './period-resolver.service';
export interface IndicatorForClosing {
    id: string;
    frequency: IndicatorFrequency;
    isActive: boolean;
}
export interface PeriodClosingResult {
    indicatorId: string;
    frequency: IndicatorFrequency;
    periodStart: Date;
    periodEnd: Date;
    isClosed: boolean;
    isReadyForClosing: boolean;
    isActive: boolean;
    referenceDate: Date;
    timezone: string;
}
export interface CustomPeriodClosingResult {
    indicatorId: string;
    frequency: IndicatorFrequency.CUSTOM;
    isClosed: false;
    isReadyForClosing: false;
    isActive: boolean;
    requiresManualConfiguration: true;
    message: string;
    referenceDate: Date;
}
export type PeriodClosingCheckResult = PeriodClosingResult | CustomPeriodClosingResult;
export declare function isResolvedPeriodClosing(r: PeriodClosingCheckResult): r is PeriodClosingResult;
export declare class IndicatorPeriodClosingService {
    private readonly periodResolver;
    constructor(periodResolver: PeriodResolverService);
    check(indicator: IndicatorForClosing, referenceDate?: Date, timezone?: string): PeriodClosingCheckResult;
    checkMany(indicators: IndicatorForClosing[], referenceDate?: Date, timezone?: string): PeriodClosingCheckResult[];
    private evaluateClosure;
}
