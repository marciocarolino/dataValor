import { IndicatorCategory } from '../enums/indicator-category.enum';
import { IndicatorChartType } from '../enums/indicator-chart-type.enum';
import { IndicatorPeriod } from '../enums/indicator-period.enum';
import { IndicatorStatus } from '../enums/indicator-status.enum';
export declare class IndicatorEntity {
    id: string;
    name: string;
    description: string | null;
    category: IndicatorCategory;
    formula: string | null;
    unit: string | null;
    goalValue: number | null;
    currentValue: number | null;
    previousValue: number | null;
    previousPeriod: IndicatorPeriod | null;
    variation: number | null;
    status: IndicatorStatus;
    color: string | null;
    icon: string | null;
    chartType: IndicatorChartType;
    startDate: string | null;
    endDate: string | null;
    daysRemaining: number | null;
    isActive: boolean;
    showOnDashboard: boolean;
    createdAt: Date;
    updatedAt: Date;
}
