import { Injectable } from '@nestjs/common';
import { FormulaSyntaxError } from './formula.errors';
import { FORMULA_LIMITS } from './formula.types';

// ── Tipos de token ────────────────────────────────────────────────────────────

export type TokenKind =
  | 'NUMBER'
  | 'IDENTIFIER'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'PERCENT'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF';

export interface Token {
  kind: TokenKind;
  value: string;
  /** Posição de início no input (0-based). Útil para mensagens de erro. */
  position: number;
}

// ── Serviço ───────────────────────────────────────────────────────────────────

/**
 * FormulaTokenizerService — converte uma string de fórmula em uma lista de tokens.
 *
 * Responsabilidade EXCLUSIVA: lexical analysis (tokenização).
 * Não interpreta semântica, não valida funções, não constrói AST.
 *
 * Tokens reconhecidos:
 *   NUMBER     → [0-9]+ ('.' [0-9]+)?    (ex: 10, 10.5, 0.25)
 *   IDENTIFIER → [A-Za-z_][A-Za-z0-9_]* (ex: SUM, AVG, ABS)
 *   PLUS       → '+'
 *   MINUS      → '-'
 *   STAR       → '*'
 *   SLASH      → '/'
 *   PERCENT    → '%'
 *   LPAREN     → '('
 *   RPAREN     → ')'
 *   COMMA      → ','
 *   EOF        → fim da string
 *
 * Qualquer outro caractere gera FormulaSyntaxError imediatamente.
 * Espaços em branco (espaço, tab, \n, \r) são ignorados.
 *
 * SEGURANÇA:
 * - Não há tokens para strings (""), arrays ([]), objetos ({}), ou ponto (.)
 * - Caracteres como `.`, `[`, `]`, `{`, `}`, `"`, `'`, `;`, `\` causam erro
 * - Isso garante que construções como `process.env`, `require(...)`, `eval()`
 *   nunca chegam ao parser como código válido
 */
@Injectable()
export class FormulaTokenizerService {
  /**
   * Converte uma fórmula em lista de tokens.
   *
   * @param formula  String da fórmula declarativa
   * @returns        Array de tokens (inclui EOF como último token)
   * @throws FormulaSyntaxError  Se a fórmula for vazia, muito longa ou contiver
   *                             caracteres inválidos
   */
  tokenize(formula: string): Token[] {
    if (!formula || formula.trim().length === 0) {
      throw new FormulaSyntaxError('Fórmula não pode ser vazia.', formula);
    }

    if (formula.length > FORMULA_LIMITS.MAX_FORMULA_LENGTH) {
      throw new FormulaSyntaxError(
        `Fórmula excede o comprimento máximo de ${FORMULA_LIMITS.MAX_FORMULA_LENGTH} caracteres ` +
          `(atual: ${formula.length}).`,
        formula,
      );
    }

    const tokens: Token[] = [];
    let pos = 0;

    while (pos < formula.length) {
      const ch = formula[pos];

      // Whitespace: ignorar
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        pos++;
        continue;
      }

      // Operadores e pontuação de um caractere
      if (ch === '+') {
        tokens.push({ kind: 'PLUS', value: '+', position: pos });
        pos++;
        continue;
      }
      if (ch === '-') {
        tokens.push({ kind: 'MINUS', value: '-', position: pos });
        pos++;
        continue;
      }
      if (ch === '*') {
        tokens.push({ kind: 'STAR', value: '*', position: pos });
        pos++;
        continue;
      }
      if (ch === '/') {
        tokens.push({ kind: 'SLASH', value: '/', position: pos });
        pos++;
        continue;
      }
      if (ch === '%') {
        tokens.push({ kind: 'PERCENT', value: '%', position: pos });
        pos++;
        continue;
      }
      if (ch === '(') {
        tokens.push({ kind: 'LPAREN', value: '(', position: pos });
        pos++;
        continue;
      }
      if (ch === ')') {
        tokens.push({ kind: 'RPAREN', value: ')', position: pos });
        pos++;
        continue;
      }
      if (ch === ',') {
        tokens.push({ kind: 'COMMA', value: ',', position: pos });
        pos++;
        continue;
      }

      // Número: [0-9]+ ('.' [0-9]+)?
      if (ch >= '0' && ch <= '9') {
        const start = pos;
        while (
          pos < formula.length &&
          formula[pos] >= '0' &&
          formula[pos] <= '9'
        ) {
          pos++;
        }
        // Parte decimal opcional
        if (pos < formula.length && formula[pos] === '.') {
          pos++; // consume '.'
          if (
            pos >= formula.length ||
            formula[pos] < '0' ||
            formula[pos] > '9'
          ) {
            throw new FormulaSyntaxError(
              `Número inválido na posição ${start}: dígito esperado após '.'.`,
              formula,
              start,
            );
          }
          while (
            pos < formula.length &&
            formula[pos] >= '0' &&
            formula[pos] <= '9'
          ) {
            pos++;
          }
        }
        // Garante que um número não é seguido imediatamente por uma letra
        // (ex: "10abc" seria ambíguo — rejeitamos)
        if (pos < formula.length && isIdentifierStart(formula[pos])) {
          throw new FormulaSyntaxError(
            `Caractere inválido na posição ${pos}: letra imediatamente após número.`,
            formula,
            pos,
          );
        }
        tokens.push({
          kind: 'NUMBER',
          value: formula.slice(start, pos),
          position: start,
        });
        continue;
      }

      // Identificador: [A-Za-z_][A-Za-z0-9_]*
      if (isIdentifierStart(ch)) {
        const start = pos;
        while (pos < formula.length && isIdentifierPart(formula[pos])) {
          pos++;
        }
        tokens.push({
          kind: 'IDENTIFIER',
          value: formula.slice(start, pos),
          position: start,
        });
        continue;
      }

      // Caractere inválido — inclui: . [ ] { } " ' ; \ @ # $ ^ & | ~ ` ? : < > = ! etc.
      throw new FormulaSyntaxError(
        `Caractere inválido "${ch}" na posição ${pos}. ` +
          `A fórmula aceita apenas números, operadores (+, -, *, /, %), parênteses e funções.`,
        formula,
        pos,
      );
    }

    tokens.push({ kind: 'EOF', value: '', position: pos });
    return tokens;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Verifica se um caractere pode iniciar um identificador: [A-Za-z_]
 * Sublinhado permitido para nomes como `_foo` (rejeitados depois pelo validator).
 */
function isIdentifierStart(ch: string): boolean {
  return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch === '_';
}

/**
 * Verifica se um caractere pode continuar um identificador: [A-Za-z0-9_]
 */
function isIdentifierPart(ch: string): boolean {
  return (
    (ch >= 'A' && ch <= 'Z') ||
    (ch >= 'a' && ch <= 'z') ||
    (ch >= '0' && ch <= '9') ||
    ch === '_'
  );
}
