export interface NumberLiteralNode {
    kind: 'NumberLiteral';
    value: number;
}
export interface UnaryExpressionNode {
    kind: 'UnaryExpression';
    operator: '+' | '-';
    operand: AstNode;
}
export interface BinaryExpressionNode {
    kind: 'BinaryExpression';
    operator: '+' | '-' | '*' | '/' | '%';
    left: AstNode;
    right: AstNode;
}
export interface FunctionCallNode {
    kind: 'FunctionCall';
    name: string;
    args: AstNode[];
}
export type AstNode = NumberLiteralNode | UnaryExpressionNode | BinaryExpressionNode | FunctionCallNode;
export type AstNodeKind = AstNode['kind'];
