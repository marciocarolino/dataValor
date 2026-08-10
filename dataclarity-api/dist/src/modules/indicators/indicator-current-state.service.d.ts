import { PrismaService } from '../../prisma/prisma.service';
import { IndicatorStatus } from './enums/indicator-status.enum';
export interface HistorySyncInput {
    value: unknown;
    status: string;
}
export interface CurrentStateSyncResult {
    indicatorId: string;
    currentValue: unknown;
    status: IndicatorStatus;
    synced: boolean;
}
export declare class IndicatorCurrentStateService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    syncFromHistory(indicatorId: string, history: HistorySyncInput): Promise<CurrentStateSyncResult>;
    private toCurrentValue;
}
