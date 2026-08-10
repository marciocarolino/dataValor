import { AstNode } from './ast/formula-ast.types';
export declare class FormulaValidatorService {
    validate(ast: AstNode, formula?: string): void;
    private validateNode;
    private validateFunctionCall;
    private validateBinaryOperator;
    private validateUnaryOperator;
}
