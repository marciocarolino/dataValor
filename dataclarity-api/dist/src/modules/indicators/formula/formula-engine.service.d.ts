import { FormulaParserService } from './formula-parser.service';
import { FormulaValidatorService } from './formula-validator.service';
import { FormulaEvaluatorService } from './formula-evaluator.service';
import { FormulaEvaluationContext, FormulaEvaluationResult } from './formula.types';
import { MeasurementInput } from '../aggregation-engine.service';
export declare class FormulaEngineService {
    private readonly parser;
    private readonly validator;
    private readonly evaluator;
    constructor(parser: FormulaParserService, validator: FormulaValidatorService, evaluator: FormulaEvaluatorService);
    evaluate(formula: string, context: FormulaEvaluationContext): FormulaEvaluationResult;
    buildContext(measurements: Array<{
        value: number;
        referenceDate: Date;
    }>): FormulaEvaluationContext;
    buildContextFromFiltered(filtered: Array<{
        value: number;
        referenceDate: Date;
    }>): FormulaEvaluationContext;
    evaluateWithMeasurements(formula: string, filtered: Array<{
        value: number;
        referenceDate: Date;
    }>): FormulaEvaluationResult;
}
export type { MeasurementInput };
