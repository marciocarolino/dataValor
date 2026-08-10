import { PrismaService } from '../../prisma/prisma.service';
import { IndicatorPeriodApurationService } from './indicator-period-apuration.service';
import { IndicatorPeriodBackfillService } from './indicator-period-backfill.service';
export interface SchedulerCycleResult {
    processed: number;
    closed: number;
    alreadyClosed: number;
    noData: number;
    formulaRequired: number;
    periodOpen: number;
    skipped: number;
    failed: number;
}
export declare class IndicatorPeriodClosingScheduler {
    private readonly prisma;
    private readonly apuration;
    private readonly backfill;
    private readonly logger;
    private _running;
    constructor(prisma: PrismaService, apuration: IndicatorPeriodApurationService, backfill: IndicatorPeriodBackfillService);
    handleCron(): Promise<void>;
    runCycle(referenceDate?: Date): Promise<SchedulerCycleResult>;
}
