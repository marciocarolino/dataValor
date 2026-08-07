import { IndicatorCategory } from '../enums/indicator-category.enum';
import { IndicatorDesiredDirection } from '../enums/indicator-desired-direction.enum';
import { IndicatorStatus } from '../enums/indicator-status.enum';
type SortBy = 'name' | 'category' | 'status' | 'createdAt' | 'currentValue';
type SortOrder = 'asc' | 'desc';
export declare class ListIndicatorsQueryDto {
    page?: number;
    limit?: number;
    category?: IndicatorCategory;
    status?: IndicatorStatus;
    desiredDirection?: IndicatorDesiredDirection;
    isActive?: boolean;
    showOnDashboard?: boolean;
    name?: string;
    sortBy?: SortBy;
    sortOrder?: SortOrder;
}
export {};
