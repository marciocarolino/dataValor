export interface FormulaAggregates {
    SUM: number | null;
    AVG: number | null;
    MIN: number | null;
    MAX: number | null;
    LAST: number | null;
    COUNT: number;
}
export interface FormulaEvaluationContext {
    aggregates: FormulaAggregates;
}
export interface FormulaEvaluationResult {
    value: number;
    formula: string;
}
export declare const FORMULA_LIMITS: {
    readonly MAX_FORMULA_LENGTH: 500;
    readonly MAX_AST_DEPTH: 20;
    readonly MAX_AST_NODES: 100;
    readonly MAX_FUNCTION_ARGUMENTS: 10;
};
export declare const AGGREGATE_FUNCTIONS: Set<"MIN" | "SUM" | "AVG" | "MAX" | "LAST" | "COUNT">;
export declare const MATH_FUNCTIONS: Set<"ABS" | "ROUND" | "FLOOR" | "CEIL">;
export declare const ALLOWED_FUNCTIONS: Set<"MIN" | "SUM" | "AVG" | "MAX" | "LAST" | "COUNT" | "ABS" | "ROUND" | "FLOOR" | "CEIL">;
export type AggregateFunctionName = 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'LAST' | 'COUNT';
export type MathFunctionName = 'ABS' | 'ROUND' | 'FLOOR' | 'CEIL';
export type AllowedFunctionName = AggregateFunctionName | MathFunctionName;
export type BinaryOperator = '+' | '-' | '*' | '/' | '%';
export type UnaryOperator = '+' | '-';
