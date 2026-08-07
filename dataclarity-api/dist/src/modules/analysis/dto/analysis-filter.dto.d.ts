import { AnalysisCategory } from '../enums/analysis-category.enum';
import { AnalysisChartType } from '../enums/analysis-chart-type.enum';
type SortBy = 'name' | 'category' | 'chartType' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';
export declare class AnalysisFilterDto {
    page?: number;
    limit?: number;
    name?: string;
    category?: AnalysisCategory;
    chartType?: AnalysisChartType;
    isFavorite?: boolean;
    isPublic?: boolean;
    createdBy?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: SortBy;
    sortOrder?: SortOrder;
}
export {};
