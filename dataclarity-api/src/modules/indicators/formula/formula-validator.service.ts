import { Injectable } from '@nestjs/common';
import {
  FormulaLimitExceededError,
  FormulaValidationError,
  UnsupportedFormulaFunctionError,
} from './formula.errors';
import {
  AGGREGATE_FUNCTIONS,
  ALLOWED_FUNCTIONS,
  FORMULA_LIMITS,
  MATH_FUNCTIONS,
} from './formula.types';
import { AstNode } from './ast/formula-ast.types';

// ── Serviço ───────────────────────────────────────────────────────────────────

/**
 * FormulaValidatorService — valida a AST antes da avaliação.
 *
 * Responsabilidade EXCLUSIVA: validação semântica da AST.
 * Não faz parsing, não avalia expressões.
 *
 * Validações realizadas:
 *
 * 1. WHITELIST DE FUNÇÕES
 *    Apenas funções explicitamente permitidas são aceitas.
 *    Qualquer outra → UnsupportedFormulaFunctionError.
 *
 * 2. ARIDADE DE FUNÇÕES
 *    Funções agregadas (SUM, AVG, MIN, MAX, LAST, COUNT): 0 argumentos.
 *    Funções matemáticas (ABS, ROUND, FLOOR, CEIL): exatamente 1 argumento.
 *    Aridade incorreta → FormulaValidationError.
 *
 * 3. PROFUNDIDADE DA AST
 *    Máximo: FORMULA_LIMITS.MAX_AST_DEPTH (20).
 *    Excedido → FormulaLimitExceededError.
 *
 * 4. QUANTIDADE DE NÓS
 *    Máximo: FORMULA_LIMITS.MAX_AST_NODES (100).
 *    Excedido → FormulaLimitExceededError.
 *
 * 5. OPERADORES PERMITIDOS
 *    Apenas: +, -, *, /, %
 *    (Garantido pela gramática, mas validado como defesa em profundidade.)
 *
 * DESIGN DE SEGURANÇA:
 * A validação da whitelist é por NOME DA FUNÇÃO, não por blacklist.
 * Qualquer função não explicitamente adicionada à whitelist é rejeitada.
 * Isso significa que novos identificadores não autorizam execução de código.
 */
@Injectable()
export class FormulaValidatorService {
  /**
   * Valida a AST contra todas as regras de segurança e semântica.
   *
   * @param ast      Nó raiz da AST
   * @param formula  Fórmula original (para mensagens de erro)
   * @throws UnsupportedFormulaFunctionError  Função não está na whitelist
   * @throws FormulaValidationError           Aridade incorreta ou operador inválido
   * @throws FormulaLimitExceededError        Limite de profundidade ou nós excedido
   */
  validate(ast: AstNode, formula?: string): void {
    const state: ValidationState = {
      nodeCount: 0,
      formula,
    };

    this.validateNode(ast, 0, state);
  }

  // ── Validação recursiva ───────────────────────────────────────────────────

  private validateNode(
    node: AstNode,
    depth: number,
    state: ValidationState,
  ): void {
    // Incrementa contagem de nós
    state.nodeCount++;

    // Limite: quantidade de nós
    if (state.nodeCount > FORMULA_LIMITS.MAX_AST_NODES) {
      throw new FormulaLimitExceededError(
        'MAX_AST_NODES',
        FORMULA_LIMITS.MAX_AST_NODES,
        state.nodeCount,
        state.formula,
      );
    }

    // Limite: profundidade da AST
    if (depth > FORMULA_LIMITS.MAX_AST_DEPTH) {
      throw new FormulaLimitExceededError(
        'MAX_AST_DEPTH',
        FORMULA_LIMITS.MAX_AST_DEPTH,
        depth,
        state.formula,
      );
    }

    switch (node.kind) {
      case 'NumberLiteral':
        // Nenhuma validação adicional além da garantia do parser (já é finito/não-NaN)
        break;

      case 'UnaryExpression':
        this.validateUnaryOperator(node.operator, state.formula);
        this.validateNode(node.operand, depth + 1, state);
        break;

      case 'BinaryExpression':
        this.validateBinaryOperator(node.operator, state.formula);
        this.validateNode(node.left, depth + 1, state);
        this.validateNode(node.right, depth + 1, state);
        break;

      case 'FunctionCall':
        this.validateFunctionCall(node.name, node.args.length, state.formula);
        for (const arg of node.args) {
          this.validateNode(arg, depth + 1, state);
        }
        break;

      default: {
        // Exhaustiveness check — nunca deve ser alcançado
        const _exhaustive: never = node;
        throw new FormulaValidationError(
          `Nó de AST desconhecido: ${JSON.stringify(_exhaustive)}`,
          state.formula,
        );
      }
    }
  }

  // ── Validações específicas ────────────────────────────────────────────────

  /**
   * Valida que uma função está na whitelist e possui a aridade correta.
   */
  private validateFunctionCall(
    name: string,
    argCount: number,
    formula?: string,
  ): void {
    // 1. Whitelist: função deve estar na lista de permitidas
    if (!ALLOWED_FUNCTIONS.has(name as never)) {
      throw new UnsupportedFormulaFunctionError(name, formula);
    }

    // 2. Aridade: funções agregadas não recebem argumentos
    if (AGGREGATE_FUNCTIONS.has(name as never)) {
      if (argCount !== 0) {
        throw new FormulaValidationError(
          `Função agregada "${name}" não aceita argumentos. ` +
            `Use ${name}() sem argumentos — ela opera sobre os dados do período.`,
          formula,
        );
      }
      return;
    }

    // 3. Aridade: funções matemáticas recebem exatamente 1 argumento
    if (MATH_FUNCTIONS.has(name as never)) {
      if (argCount !== 1) {
        throw new FormulaValidationError(
          `Função matemática "${name}" requer exatamente 1 argumento, ` +
            `mas recebeu ${argCount}.`,
          formula,
        );
      }
      return;
    }

    // Não deveria chegar aqui (ALLOWED_FUNCTIONS = AGGREGATE + MATH)
    throw new UnsupportedFormulaFunctionError(name, formula);
  }

  /**
   * Valida que um operador binário é permitido.
   * Defesa em profundidade: a gramática já garante isso, mas validamos por segurança.
   */
  private validateBinaryOperator(operator: string, formula?: string): void {
    const allowed = new Set(['+', '-', '*', '/', '%']);
    if (!allowed.has(operator)) {
      throw new FormulaValidationError(
        `Operador binário "${operator}" não é permitido. ` +
          `Operadores válidos: +, -, *, /, %.`,
        formula,
      );
    }
  }

  /**
   * Valida que um operador unário é permitido.
   */
  private validateUnaryOperator(operator: string, formula?: string): void {
    const allowed = new Set(['+', '-']);
    if (!allowed.has(operator)) {
      throw new FormulaValidationError(
        `Operador unário "${operator}" não é permitido. ` +
          `Operadores válidos: +, -.`,
        formula,
      );
    }
  }
}

// ── Tipos internos ────────────────────────────────────────────────────────────

interface ValidationState {
  /** Contador cumulativo de nós visitados. */
  nodeCount: number;
  /** Fórmula original para mensagens de erro. */
  formula?: string;
}
