import { AnalysisAggregation } from '../enums/analysis-aggregation.enum';
import { AnalysisCategory } from '../enums/analysis-category.enum';
import { AnalysisChartType } from '../enums/analysis-chart-type.enum';
export declare class CreateAnalysisDto {
    name: string;
    description?: string;
    chartType: AnalysisChartType;
    category: AnalysisCategory;
    dataset?: string;
    metric?: string;
    aggregation: AnalysisAggregation;
    groupBy?: string;
    dateField?: string;
    startDate?: Date;
    endDate?: Date;
    filters?: string;
    isFavorite?: boolean;
    isPublic?: boolean;
    createdBy?: string;
}
