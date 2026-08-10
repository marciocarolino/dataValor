/**
 * formula.types.ts — Tipos centrais do Formula Engine
 *
 * O Formula Engine interpreta uma linguagem matemática declarativa própria.
 * NUNCA executa JavaScript, TypeScript ou qualquer código arbitrário.
 */

// ── Contexto de avaliação ─────────────────────────────────────────────────────

/**
 * Valores pré-calculados pelos agregadores padrão para o período corrente.
 * O FormulaEngine NÃO busca dados no banco — recebe este contexto já preparado.
 *
 * SUM/AVG/MIN/MAX/LAST → null quando não há medições no período.
 * COUNT → 0 quando não há medições no período.
 */
export interface FormulaAggregates {
  SUM: number | null;
  AVG: number | null;
  MIN: number | null;
  MAX: number | null;
  LAST: number | null;
  COUNT: number;
}

export interface FormulaEvaluationContext {
  aggregates: FormulaAggregates;
}

// ── Resultado de avaliação ────────────────────────────────────────────────────

export interface FormulaEvaluationResult {
  /** Valor numérico resultante — sempre finito, nunca NaN/Infinity. */
  value: number;
  /** Fórmula original avaliada (apenas para rastreabilidade). */
  formula: string;
}

// ── Limites de segurança ──────────────────────────────────────────────────────

export const FORMULA_LIMITS = {
  /** Comprimento máximo da string da fórmula. */
  MAX_FORMULA_LENGTH: 500,
  /** Profundidade máxima da AST. */
  MAX_AST_DEPTH: 20,
  /** Quantidade máxima de nós na AST. */
  MAX_AST_NODES: 100,
  /** Quantidade máxima de argumentos por função. */
  MAX_FUNCTION_ARGUMENTS: 10,
} as const;

// ── Funções permitidas ────────────────────────────────────────────────────────

/**
 * Funções agregadas: representam os dados pré-calculados do período.
 * Não recebem argumentos (os dados vêm do contexto de avaliação).
 */
export const AGGREGATE_FUNCTIONS = new Set([
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'LAST',
  'COUNT',
] as const);

/**
 * Funções matemáticas: recebem exatamente 1 argumento numérico.
 */
export const MATH_FUNCTIONS = new Set([
  'ABS',
  'ROUND',
  'FLOOR',
  'CEIL',
] as const);

/**
 * Conjunto completo de funções permitidas (whitelist).
 */
export const ALLOWED_FUNCTIONS = new Set([
  ...AGGREGATE_FUNCTIONS,
  ...MATH_FUNCTIONS,
]);

export type AggregateFunctionName =
  'SUM' | 'AVG' | 'MIN' | 'MAX' | 'LAST' | 'COUNT';

export type MathFunctionName = 'ABS' | 'ROUND' | 'FLOOR' | 'CEIL';

export type AllowedFunctionName = AggregateFunctionName | MathFunctionName;

// ── Operadores permitidos ─────────────────────────────────────────────────────

export type BinaryOperator = '+' | '-' | '*' | '/' | '%';
export type UnaryOperator = '+' | '-';
