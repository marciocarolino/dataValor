import { PrismaService } from '../../prisma/prisma.service';
import { PeriodResolverService } from './period-resolver.service';
import { IndicatorPeriodApurationService } from './indicator-period-apuration.service';
import { IndicatorFrequency } from './enums/indicator-frequency.enum';
export interface BackfillIndicatorResult {
    indicatorId: string;
    periodsFound: number;
    processed: number;
    closed: number;
    alreadyClosed: number;
    noData: number;
    formulaRequired: number;
    failed: number;
    aborted: boolean;
    firstPeriodStart: Date | null;
    lastPeriodEnd: Date | null;
}
export interface BackfillCycleResult {
    indicatorsProcessed: number;
    indicatorsSkipped: number;
    totalPeriodsFound: number;
    totalClosed: number;
    totalAlreadyClosed: number;
    totalNoData: number;
    totalFormulaRequired: number;
    totalFailed: number;
    indicatorsAborted: number;
}
export declare const MAX_PERIODS_PER_INDICATOR = 100;
export declare class IndicatorPeriodBackfillService {
    private readonly prisma;
    private readonly periodResolver;
    private readonly apuration;
    private readonly logger;
    constructor(prisma: PrismaService, periodResolver: PeriodResolverService, apuration: IndicatorPeriodApurationService);
    runBackfill(referenceDate?: Date, timezone?: string, includeInactive?: boolean): Promise<BackfillCycleResult>;
    backfillIndicator(indicatorId: string, frequency: IndicatorFrequency, startFrom: Date, referenceDate?: Date, timezone?: string): Promise<BackfillIndicatorResult>;
    findPendingPeriods(indicatorId: string, frequency: IndicatorFrequency, startFrom: Date, referenceDate: Date, timezone?: string): Promise<Array<{
        periodStart: Date;
        periodEnd: Date;
    }>>;
}
