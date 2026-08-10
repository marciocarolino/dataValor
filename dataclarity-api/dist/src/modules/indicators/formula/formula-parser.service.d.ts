import { FormulaTokenizerService } from './formula-tokenizer.service';
import { AstNode } from './ast/formula-ast.types';
export declare class FormulaParserService {
    private readonly tokenizer;
    constructor(tokenizer: FormulaTokenizerService);
    parse(formula: string): AstNode;
}
