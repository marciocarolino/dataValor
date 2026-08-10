import { Injectable } from '@nestjs/common';
import { FormulaSyntaxError } from './formula.errors';
import {
  FormulaTokenizerService,
  Token,
  TokenKind,
} from './formula-tokenizer.service';
import {
  AstNode,
  BinaryExpressionNode,
  FunctionCallNode,
  NumberLiteralNode,
  UnaryExpressionNode,
} from './ast/formula-ast.types';

// ── Serviço ───────────────────────────────────────────────────────────────────

/**
 * FormulaParserService — constrói a AST a partir de uma lista de tokens.
 *
 * Responsabilidade EXCLUSIVA: syntactic analysis (parsing).
 * Não valida semântica (funções permitidas, limites, etc.) — isso é do FormulaValidatorService.
 * Não avalia expressões — isso é do FormulaEvaluatorService.
 *
 * Gramática implementada (descendência recursiva):
 *
 *   expr     → term ( ('+' | '-') term )*
 *   term     → unary ( ('*' | '/' | '%') unary )*
 *   unary    → ('+' | '-') unary | primary
 *   primary  → NUMBER | IDENTIFIER '(' args? ')' | '(' expr ')'
 *   args     → expr (',' expr)*
 *
 * Precedência (do menor para o maior):
 *   1. soma/subtração          (+, -)
 *   2. multiplicação/div/mod   (*, /, %)
 *   3. unário                  (+x, -x)
 *   4. primário                (número, função, parênteses)
 *
 * Exemplos de árvores geradas:
 *
 *   "10 + 5 * 2"
 *   → BinaryExpression('+', NumberLiteral(10),
 *       BinaryExpression('*', NumberLiteral(5), NumberLiteral(2)))
 *
 *   "SUM() / COUNT()"
 *   → BinaryExpression('/', FunctionCall('SUM',[]), FunctionCall('COUNT',[]))
 *
 *   "-AVG()"
 *   → UnaryExpression('-', FunctionCall('AVG',[]))
 *
 * SEGURANÇA:
 * - O parser aceita apenas a gramática acima.
 * - Identificadores sem parênteses são rejeitados (variáveis não existem).
 * - Qualquer token inesperado gera FormulaSyntaxError.
 * - Construções JavaScript como `a.b`, `a[b]`, `a ? b : c` são impossíveis
 *   na gramática — seriam rejeitadas com erro de sintaxe.
 */
@Injectable()
export class FormulaParserService {
  constructor(private readonly tokenizer: FormulaTokenizerService) {}

  /**
   * Faz o parse de uma fórmula e retorna a raiz da AST.
   *
   * @param formula  String da fórmula
   * @returns        Nó raiz da AST
   * @throws FormulaSyntaxError  Se a fórmula for sintaticamente inválida
   */
  parse(formula: string): AstNode {
    const tokens = this.tokenizer.tokenize(formula);
    const ctx = new ParseContext(tokens, formula);
    const ast = ctx.parseExpr();

    // Deve ter consumido todos os tokens (exceto EOF)
    if (ctx.current().kind !== 'EOF') {
      const tok = ctx.current();
      throw new FormulaSyntaxError(
        `Token inesperado "${tok.value || tok.kind}" na posição ${tok.position}. ` +
          `Esperava fim da expressão.`,
        formula,
        tok.position,
      );
    }

    return ast;
  }
}

// ── Contexto de parsing ───────────────────────────────────────────────────────

/**
 * ParseContext encapsula o estado de parsing (lista de tokens + posição atual).
 * Implementa a gramática via métodos de descida recursiva.
 */
class ParseContext {
  private pos = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly formula: string,
  ) {}

  /** Token atual sem consumir. */
  current(): Token {
    return this.tokens[this.pos];
  }

  /** Consome e retorna o token atual; avança para o próximo. */
  consume(): Token {
    const tok = this.tokens[this.pos];
    this.pos++;
    return tok;
  }

  /**
   * Consome o token atual se for do kind esperado; caso contrário, lança erro.
   */
  expect(kind: TokenKind): Token {
    const tok = this.current();
    if (tok.kind !== kind) {
      throw new FormulaSyntaxError(
        `Esperava "${kind}" mas encontrou "${tok.value || tok.kind}" na posição ${tok.position}.`,
        this.formula,
        tok.position,
      );
    }
    return this.consume();
  }

  // ── Regras da gramática ─────────────────────────────────────────────────────

  /**
   * expr → term ( ('+' | '-') term )*
   *
   * Trata adição e subtração com associatividade à esquerda.
   */
  parseExpr(): AstNode {
    let left: AstNode = this.parseTerm();

    while (this.current().kind === 'PLUS' || this.current().kind === 'MINUS') {
      const op = this.consume();
      const right = this.parseTerm();
      const node: BinaryExpressionNode = {
        kind: 'BinaryExpression',
        operator: op.value as '+' | '-',
        left,
        right,
      };
      left = node;
    }

    return left;
  }

  /**
   * term → unary ( ('*' | '/' | '%') unary )*
   *
   * Trata multiplicação, divisão e módulo com associatividade à esquerda.
   * Precedência maior que adição/subtração.
   */
  parseTerm(): AstNode {
    let left: AstNode = this.parseUnary();

    while (
      this.current().kind === 'STAR' ||
      this.current().kind === 'SLASH' ||
      this.current().kind === 'PERCENT'
    ) {
      const op = this.consume();
      const right = this.parseUnary();
      const node: BinaryExpressionNode = {
        kind: 'BinaryExpression',
        operator: op.value as '*' | '/' | '%',
        left,
        right,
      };
      left = node;
    }

    return left;
  }

  /**
   * unary → ('+' | '-') unary | primary
   *
   * Trata operadores unários com associatividade à direita (recursivo).
   * Permite encadeamento: `--10` → UnaryExpression('-', UnaryExpression('-', 10))
   */
  parseUnary(): AstNode {
    if (this.current().kind === 'PLUS' || this.current().kind === 'MINUS') {
      const op = this.consume();
      const operand = this.parseUnary();
      const node: UnaryExpressionNode = {
        kind: 'UnaryExpression',
        operator: op.value as '+' | '-',
        operand,
      };
      return node;
    }

    return this.parsePrimary();
  }

  /**
   * primary → NUMBER
   *         | IDENTIFIER '(' args? ')'
   *         | '(' expr ')'
   *
   * Nível mais profundo da gramática.
   * Identificadores sem parênteses são REJEITADOS — variáveis não existem.
   */
  parsePrimary(): AstNode {
    const tok = this.current();

    // Número literal
    if (tok.kind === 'NUMBER') {
      this.consume();
      const value = parseFloat(tok.value);
      if (!isFinite(value) || isNaN(value)) {
        throw new FormulaSyntaxError(
          `Número inválido "${tok.value}" na posição ${tok.position}.`,
          this.formula,
          tok.position,
        );
      }
      const node: NumberLiteralNode = {
        kind: 'NumberLiteral',
        value,
      };
      return node;
    }

    // Chamada de função: IDENTIFIER '(' args? ')'
    if (tok.kind === 'IDENTIFIER') {
      this.consume();
      const funcName = tok.value;

      // Identificadores devem ser seguidos de '(' — variáveis não existem
      if (this.current().kind !== 'LPAREN') {
        throw new FormulaSyntaxError(
          `Identificador "${funcName}" na posição ${tok.position} não é uma chamada de função. ` +
            `Variáveis não são suportadas. Use funções como SUM(), AVG(), etc.`,
          this.formula,
          tok.position,
        );
      }

      this.expect('LPAREN');
      const args = this.parseArgs();
      this.expect('RPAREN');

      const node: FunctionCallNode = {
        kind: 'FunctionCall',
        name: funcName,
        args,
      };
      return node;
    }

    // Expressão entre parênteses: '(' expr ')'
    if (tok.kind === 'LPAREN') {
      this.consume(); // consume '('
      const inner = this.parseExpr();
      this.expect('RPAREN');
      return inner;
    }

    // Token inesperado
    if (tok.kind === 'EOF') {
      throw new FormulaSyntaxError(
        `Fim inesperado da fórmula. Esperava um número, função ou '('.`,
        this.formula,
        tok.position,
      );
    }

    throw new FormulaSyntaxError(
      `Token inesperado "${tok.value || tok.kind}" na posição ${tok.position}. ` +
        `Esperava um número, função ou '('.`,
      this.formula,
      tok.position,
    );
  }

  /**
   * args → ε | expr (',' expr)*
   *
   * Retorna lista de argumentos (pode ser vazia).
   */
  parseArgs(): AstNode[] {
    const args: AstNode[] = [];

    // Lista vazia: próximo token é ')'
    if (this.current().kind === 'RPAREN') {
      return args;
    }

    args.push(this.parseExpr());

    while (this.current().kind === 'COMMA') {
      this.consume(); // consume ','
      if (this.current().kind === 'RPAREN') {
        // Trailing comma não é permitida
        const tok = this.current();
        throw new FormulaSyntaxError(
          `Vírgula à direita não é permitida antes de ')' na posição ${tok.position}.`,
          this.formula,
          tok.position,
        );
      }
      args.push(this.parseExpr());
    }

    return args;
  }
}
