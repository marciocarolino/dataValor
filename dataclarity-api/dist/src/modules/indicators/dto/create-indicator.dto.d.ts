import { DashboardSlot } from '../enums/dashboard-slot.enum';
import { IndicatorCategory } from '../enums/indicator-category.enum';
import { IndicatorChartType } from '../enums/indicator-chart-type.enum';
import { IndicatorDesiredDirection } from '../enums/indicator-desired-direction.enum';
import { IndicatorFrequency } from '../enums/indicator-frequency.enum';
import { IndicatorPeriod } from '../enums/indicator-period.enum';
import { IndicatorStatus } from '../enums/indicator-status.enum';
export declare class CreateIndicatorDto {
    name: string;
    description?: string;
    category: IndicatorCategory;
    formula?: string;
    unit?: string;
    goalValue?: number;
    minimumGoalValue?: number;
    maximumGoalValue?: number;
    desiredDirection?: IndicatorDesiredDirection;
    frequency?: IndicatorFrequency;
    previousPeriod?: IndicatorPeriod;
    chartType: IndicatorChartType;
    color?: string | null;
    icon?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    isActive?: boolean;
    showOnDashboard?: boolean;
    dashboardSlot?: DashboardSlot | null;
    status?: IndicatorStatus;
}
