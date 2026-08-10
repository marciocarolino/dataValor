import { AggregationType } from './enums/aggregation-type.enum';
export interface MeasurementInput {
    value: DecimalLike;
    referenceDate: Date;
}
type DecimalLike = {
    toNumber(): number;
} | number | string | null | undefined;
export interface IndicatorAggregationInput {
    aggregationType: AggregationType;
    formula?: string | null;
}
export interface AggregationResult {
    aggregationType: AggregationType;
    value: number | null;
    measurementCount: number;
    periodStart: Date;
    periodEnd: Date;
}
export interface FormulaAggregationResult {
    aggregationType: AggregationType.FORMULA;
    value: null;
    measurementCount: number;
    periodStart: Date;
    periodEnd: Date;
    requiresFormulaEngine: true;
    formula: string | null;
}
export type AggregationEngineResult = AggregationResult | FormulaAggregationResult;
export declare function isFormulaResult(r: AggregationEngineResult): r is FormulaAggregationResult;
export declare class AggregationEngineService {
    aggregate(indicator: IndicatorAggregationInput, periodStart: Date, periodEnd: Date, measurements: MeasurementInput[]): AggregationEngineResult;
    private filterAndConvert;
    private compute;
    private toNumber;
}
export {};
