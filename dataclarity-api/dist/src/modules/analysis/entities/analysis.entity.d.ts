import { AnalysisAggregation } from '../enums/analysis-aggregation.enum';
import { AnalysisCategory } from '../enums/analysis-category.enum';
import { AnalysisChartType } from '../enums/analysis-chart-type.enum';
export declare class AnalysisEntity {
    id: string;
    name: string;
    description: string | null;
    chartType: AnalysisChartType;
    category: AnalysisCategory;
    dataset: string | null;
    metric: string | null;
    aggregation: AnalysisAggregation;
    groupBy: string | null;
    dateField: string | null;
    startDate: Date | null;
    endDate: Date | null;
    filters: Record<string, unknown> | null;
    isFavorite: boolean;
    isPublic: boolean;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}
