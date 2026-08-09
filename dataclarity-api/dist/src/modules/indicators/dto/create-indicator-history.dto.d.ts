import { IndicatorStatus } from '../enums/indicator-status.enum';
export declare class CreateIndicatorHistoryDto {
    periodStart: string;
    periodEnd: string;
    value?: number;
    goalValue?: number;
    previousValue?: number;
    variationPercent?: number;
    status: IndicatorStatus;
    notes?: string;
}
