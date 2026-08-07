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
    color?: string;
    icon?: string;
    chartType: IndicatorChartType;
    isActive?: boolean;
    showOnDashboard?: boolean;
}
