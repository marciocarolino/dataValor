export type TokenKind = 'NUMBER' | 'IDENTIFIER' | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH' | 'PERCENT' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'EOF';
export interface Token {
    kind: TokenKind;
    value: string;
    position: number;
}
export declare class FormulaTokenizerService {
    tokenize(formula: string): Token[];
}
