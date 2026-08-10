/**
 * formula.errors.ts — Erros tipados do Formula Engine
 *
 * Hierarquia:
 *   FormulaError (base)
 *   ├── FormulaSyntaxError        — fórmula malformada (tokenização/parsing)
 *   ├── FormulaValidationError    — fórmula estruturalmente inválida
 *   │   ├── UnsupportedFormulaFunctionError — função não está na whitelist
 *   │   └── FormulaLimitExceededError       — limite de segurança excedido
 *   └── FormulaEvaluationError    — erro em tempo de avaliação
 *       └── DivisionByZeroError             — divisão por zero
 */

// ── Base ──────────────────────────────────────────────────────────────────────

export class FormulaError extends Error {
  constructor(
    message: string,
    public readonly formula?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Preserva o stack trace no V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ── Erros de sintaxe ──────────────────────────────────────────────────────────

/**
 * Fórmula malformada: erro durante tokenização ou parsing.
 *
 * Exemplos:
 *   - Caractere inválido: `process.env`
 *   - Parênteses não fechados: `SUM( + 1`
 *   - Token inesperado: `SUM() SUM()`
 */
export class FormulaSyntaxError extends FormulaError {
  constructor(
    message: string,
    formula?: string,
    public readonly position?: number,
  ) {
    super(message, formula);
  }
}

// ── Erros de validação ────────────────────────────────────────────────────────

/**
 * Fórmula estruturalmente inválida (AST válida mas semântica proibida).
 */
export class FormulaValidationError extends FormulaError {
  constructor(message: string, formula?: string) {
    super(message, formula);
  }
}

/**
 * Função chamada na fórmula não está na whitelist de funções permitidas.
 *
 * Exemplo: `SQRT(100)` → SQRT não é suportada na V1.
 */
export class UnsupportedFormulaFunctionError extends FormulaValidationError {
  constructor(
    public readonly functionName: string,
    formula?: string,
  ) {
    super(
      `Função "${functionName}" não é suportada. ` +
        `Funções permitidas: SUM, AVG, MIN, MAX, LAST, COUNT, ABS, ROUND, FLOOR, CEIL.`,
      formula,
    );
  }
}

/**
 * Um limite de segurança foi excedido.
 *
 * Exemplos:
 *   - Fórmula > 500 caracteres
 *   - AST com mais de 100 nós
 *   - AST com profundidade > 20
 */
export class FormulaLimitExceededError extends FormulaValidationError {
  constructor(
    public readonly limitName: string,
    public readonly limitValue: number,
    public readonly actualValue: number,
    formula?: string,
  ) {
    super(
      `Limite "${limitName}" excedido: máximo ${limitValue}, atual ${actualValue}.`,
      formula,
    );
  }
}

// ── Erros de avaliação ────────────────────────────────────────────────────────

/**
 * Erro em tempo de avaliação: a fórmula é válida, mas o cálculo falhou.
 */
export class FormulaEvaluationError extends FormulaError {
  constructor(message: string, formula?: string) {
    super(message, formula);
  }
}

/**
 * Divisão por zero detectada durante a avaliação.
 *
 * Exemplos:
 *   - `10 / 0`
 *   - `SUM() / COUNT()` quando COUNT() = 0
 */
export class DivisionByZeroError extends FormulaEvaluationError {
  constructor(formula?: string) {
    super('Divisão por zero detectada na fórmula.', formula);
  }
}
