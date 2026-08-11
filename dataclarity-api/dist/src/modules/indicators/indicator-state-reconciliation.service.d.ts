import { PrismaService } from '../../prisma/prisma.service';
import { IndicatorCurrentStateService } from './indicator-current-state.service';
export interface IndicatorAuditEntry {
    indicatorId: string;
    indicatorName: string;
    currentValue: number | null;
    indicatorStatus: string;
    hasHistory: boolean;
    latestHistoryId: string | null;
    latestHistoryValue: number | null;
    latestHistoryStatus: string | null;
    latestHistoryPeriodStart: Date | null;
    latestHistoryPeriodEnd: Date | null;
    inconsistent: boolean;
}
export interface ReconciliationResult {
    total: number;
    consistent: number;
    corrected: number;
    withoutHistory: number;
    failed: number;
    entries: IndicatorAuditEntry[];
}
export declare class IndicatorStateReconciliationService {
    private readonly prisma;
    private readonly currentStateService;
    private readonly logger;
    constructor(prisma: PrismaService, currentStateService: IndicatorCurrentStateService);
    reconcileAll(): Promise<ReconciliationResult>;
    reconcileOne(indicatorId: string, indicatorName: string, rawCurrentValue: unknown, rawStatus: unknown): Promise<IndicatorAuditEntry>;
}
