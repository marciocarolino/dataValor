import { IndicatorCategory } from '../enums/indicator-category.enum';
import { IndicatorChartType } from '../enums/indicator-chart-type.enum';
import { IndicatorPeriod } from '../enums/indicator-period.enum';
import { IndicatorStatus } from '../enums/indicator-status.enum';
export declare class CreateIndicatorDto {
    name: string;
    description?: string;
    category: IndicatorCategory;
    formula?: string;
    unit?: string;
    goalValue?: number;
    currentValue?: number;
    previousValue?: number;
    previousPeriod?: IndicatorPeriod;
    variation?: number;
    status: IndicatorStatus;
    color?: string | null;
    icon?: string | null;
    chartType: IndicatorChartType;
    startDate?: string | null;
    endDate?: string | null;
    isActive?: boolean;
    showOnDashboard?: boolean;
}
