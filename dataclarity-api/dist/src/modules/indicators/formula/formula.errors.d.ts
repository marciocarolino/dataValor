export declare class FormulaError extends Error {
    readonly formula?: string | undefined;
    constructor(message: string, formula?: string | undefined);
}
export declare class FormulaSyntaxError extends FormulaError {
    readonly position?: number | undefined;
    constructor(message: string, formula?: string, position?: number | undefined);
}
export declare class FormulaValidationError extends FormulaError {
    constructor(message: string, formula?: string);
}
export declare class UnsupportedFormulaFunctionError extends FormulaValidationError {
    readonly functionName: string;
    constructor(functionName: string, formula?: string);
}
export declare class FormulaLimitExceededError extends FormulaValidationError {
    readonly limitName: string;
    readonly limitValue: number;
    readonly actualValue: number;
    constructor(limitName: string, limitValue: number, actualValue: number, formula?: string);
}
export declare class FormulaEvaluationError extends FormulaError {
    constructor(message: string, formula?: string);
}
export declare class DivisionByZeroError extends FormulaEvaluationError {
    constructor(formula?: string);
}
