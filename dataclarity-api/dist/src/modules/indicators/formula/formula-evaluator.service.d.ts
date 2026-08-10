import { FormulaEvaluationContext } from './formula.types';
import { AstNode } from './ast/formula-ast.types';
export declare class FormulaEvaluatorService {
    evaluate(ast: AstNode, context: FormulaEvaluationContext, formula?: string): number;
    private evalNode;
    private evalBinary;
    private evalFunction;
    private requireAggregate;
    private assertFinite;
}
