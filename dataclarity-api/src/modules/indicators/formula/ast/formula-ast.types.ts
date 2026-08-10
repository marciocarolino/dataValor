/**
 * formula-ast.types.ts — AST tipada do Formula Engine
 *
 * A AST representa a estrutura da fórmula de forma declarativa.
 * Nunca contém código executável — apenas descritores de operações matemáticas.
 *
 * Gramática suportada (V1):
 *
 *   expr     → term ( ('+' | '-') term )*
 *   term     → unary ( ('*' | '/' | '%') unary )*
 *   unary    → ('+' | '-') unary | primary
 *   primary  → NUMBER | FUNC '(' args? ')' | '(' expr ')'
 *   args     → expr (',' expr)*
 *   NUMBER   → [0-9]+ ('.' [0-9]+)?
 *   FUNC     → SUM | AVG | MIN | MAX | LAST | COUNT | ABS | ROUND | FLOOR | CEIL
 *
 * Exemplos de AST:
 *
 *   "SUM() / COUNT()"
 *   → BinaryExpression('/', FunctionCall('SUM', []), FunctionCall('COUNT', []))
 *
 *   "(SUM() - MIN()) / MAX() * 100"
 *   → BinaryExpression('*',
 *       BinaryExpression('/',
 *         BinaryExpression('-', FunctionCall('SUM',[]), FunctionCall('MIN',[])),
 *         FunctionCall('MAX', [])),
 *       NumberLiteral(100))
 *
 *   "-AVG()"
 *   → UnaryExpression('-', FunctionCall('AVG', []))
 */

// ── Nós da AST ────────────────────────────────────────────────────────────────

/**
 * Literal numérico.
 *
 * Exemplos: `10`, `10.5`, `0.25`, `1000.00`
 */
export interface NumberLiteralNode {
  kind: 'NumberLiteral';
  /** Valor numérico já convertido — finito, não-NaN. */
  value: number;
}

/**
 * Expressão unária (operador aplicado a um operando).
 *
 * Exemplos: `-10`, `+AVG()`, `-(SUM() + 1)`
 */
export interface UnaryExpressionNode {
  kind: 'UnaryExpression';
  operator: '+' | '-';
  operand: AstNode;
}

/**
 * Expressão binária (operador entre dois operandos).
 *
 * Precedência já está embutida na estrutura da AST — não precisa ser
 * re-computada durante a avaliação.
 *
 * Exemplos: `SUM() + 10`, `AVG() / COUNT()`, `(MAX() - MIN()) * 100`
 */
export interface BinaryExpressionNode {
  kind: 'BinaryExpression';
  operator: '+' | '-' | '*' | '/' | '%';
  left: AstNode;
  right: AstNode;
}

/**
 * Chamada de função.
 *
 * Apenas funções da whitelist são permitidas (validado pelo FormulaValidatorService).
 * - Funções agregadas (SUM, AVG, MIN, MAX, LAST, COUNT): args deve ser vazio [].
 * - Funções matemáticas (ABS, ROUND, FLOOR, CEIL): args deve ter exatamente 1 elemento.
 *
 * Exemplos:
 *   `SUM()` → FunctionCall('SUM', [])
 *   `ABS(-10)` → FunctionCall('ABS', [UnaryExpression('-', NumberLiteral(10))])
 */
export interface FunctionCallNode {
  kind: 'FunctionCall';
  /** Nome da função em maiúsculas. */
  name: string;
  /** Lista de argumentos já parseados como sub-árvores. */
  args: AstNode[];
}

/**
 * União discriminada de todos os nós possíveis da AST.
 * Use `node.kind` para narrowing de tipo.
 */
export type AstNode =
  | NumberLiteralNode
  | UnaryExpressionNode
  | BinaryExpressionNode
  | FunctionCallNode;

export type AstNodeKind = AstNode['kind'];
