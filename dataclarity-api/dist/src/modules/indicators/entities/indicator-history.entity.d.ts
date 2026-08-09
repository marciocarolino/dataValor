import { IndicatorStatus } from '../enums/indicator-status.enum';
export declare class IndicatorHistoryEntity {
    id: string;
    indicatorId: string;
    periodStart: Date;
    periodEnd: Date;
    value: number | null;
    goalValue: number | null;
    previousValue: number | null;
    variationPercent: number | null;
    status: IndicatorStatus;
    notes: string | null;
    calculatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
