export declare class ExecuteDatasetDto {
    label: string;
    data: number[];
}
export declare class ExecuteSummaryDto {
    total: number;
    growth: number | null;
    records: number;
}
export declare class ExecuteAnalysisResultDto {
    title: string;
    description: string | null;
    chartType: string;
    labels: string[];
    datasets: ExecuteDatasetDto[];
    summary: ExecuteSummaryDto;
}
