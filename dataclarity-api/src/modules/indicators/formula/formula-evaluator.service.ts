import { Injectable } from '@nestjs/common';
import { DivisionByZeroError, FormulaEvaluationError } from './formula.errors';
import { FormulaEvaluationContext } from './formula.types';
import { AstNode } from './ast/formula-ast.types';

// ── Serviço ───────────────────────────────────────────────────────────────────

/**
 * FormulaEvaluatorService — avalia uma AST validada e retorna um número.
 *
 * Responsabilidade EXCLUSIVA: avaliação da AST contra um contexto de dados.
 * Não faz parsing, não valida funções, não tokeniza.
 *
 * PRÉ-CONDIÇÃO: a AST deve ter sido validada pelo FormulaValidatorService.
 * O evaluator assume que a AST é estruturalmente válida.
 *
 * SEMÂNTICA DOS AGREGADORES:
 *   SUM()   → context.aggregates.SUM   (null se sem medições)
 *   AVG()   → context.aggregates.AVG   (null se sem medições)
 *   MIN()   → context.aggregates.MIN   (null se sem medições)
 *   MAX()   → context.aggregates.MAX   (null se sem medições)
 *   LAST()  → context.aggregates.LAST  (null se sem medições)
 *   COUNT() → context.aggregates.COUNT (0 se sem medições)
 *
 * Quando um agregador retorna null e é usado em uma expressão,
 * a avaliação lança FormulaEvaluationError com mensagem clara.
 *
 * SEMÂNTICA DAS FUNÇÕES MATEMÁTICAS:
 *   ABS(x)   → Math.abs(x)
 *   ROUND(x) → Math.round(x)
 *   FLOOR(x) → Math.floor(x)
 *   CEIL(x)  → Math.ceil(x)
 *
 * GARANTIAS DO RESULTADO:
 *   - O resultado final é sempre `number`
 *   - Nunca retorna NaN ou Infinity
 *   - Divisão por zero → DivisionByZeroError (nunca retorna Infinity)
 *   - Resultado NaN/Infinity → FormulaEvaluationError
 *
 * SEGURANÇA:
 *   Não usa eval(), new Function(), vm.*, child_process, ou qualquer execução
 *   dinâmica de código. A avaliação é feita por um switch tipado sobre os
 *   kinds de nó da AST — apenas os tipos definidos são aceitos.
 */
@Injectable()
export class FormulaEvaluatorService {
  /**
   * Avalia a AST e retorna o valor numérico resultante.
   *
   * @param ast      Nó raiz da AST (deve ter sido validado)
   * @param context  Contexto com agregados pré-calculados do período
   * @param formula  Fórmula original (para mensagens de erro)
   * @returns        Valor numérico finito, não-NaN
   * @throws DivisionByZeroError       Divisão ou módulo por zero
   * @throws FormulaEvaluationError    Agregador null em expressão, resultado inválido
   */
  evaluate(
    ast: AstNode,
    context: FormulaEvaluationContext,
    formula?: string,
  ): number {
    const result = this.evalNode(ast, context, formula);
    this.assertFinite(result, formula);
    return result;
  }

  // ── Avaliação recursiva ───────────────────────────────────────────────────

  private evalNode(
    node: AstNode,
    context: FormulaEvaluationContext,
    formula?: string,
  ): number {
    switch (node.kind) {
      case 'NumberLiteral':
        return node.value;

      case 'UnaryExpression': {
        const operand = this.evalNode(node.operand, context, formula);
        if (node.operator === '-') return -operand;
        return operand; // '+' é identidade
      }

      case 'BinaryExpression': {
        const left = this.evalNode(node.left, context, formula);
        const right = this.evalNode(node.right, context, formula);
        return this.evalBinary(node.operator, left, right, formula);
      }

      case 'FunctionCall':
        return this.evalFunction(node.name, node.args, context, formula);

      default: {
        // Exhaustiveness check
        const _exhaustive: never = node;
        throw new FormulaEvaluationError(
          `Nó de AST desconhecido durante avaliação: ${JSON.stringify(_exhaustive)}`,
          formula,
        );
      }
    }
  }

  // ── Operadores binários ───────────────────────────────────────────────────

  private evalBinary(
    operator: string,
    left: number,
    right: number,
    formula?: string,
  ): number {
    switch (operator) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        if (right === 0) throw new DivisionByZeroError(formula);
        return left / right;
      case '%':
        if (right === 0) throw new DivisionByZeroError(formula);
        return left % right;
      default:
        throw new FormulaEvaluationError(
          `Operador binário desconhecido: "${operator}".`,
          formula,
        );
    }
  }

  // ── Funções ───────────────────────────────────────────────────────────────

  private evalFunction(
    name: string,
    args: AstNode[],
    context: FormulaEvaluationContext,
    formula?: string,
  ): number {
    // Funções agregadas — sem argumentos, lêem do contexto
    switch (name) {
      case 'SUM':
        return this.requireAggregate(context.aggregates.SUM, 'SUM', formula);
      case 'AVG':
        return this.requireAggregate(context.aggregates.AVG, 'AVG', formula);
      case 'MIN':
        return this.requireAggregate(context.aggregates.MIN, 'MIN', formula);
      case 'MAX':
        return this.requireAggregate(context.aggregates.MAX, 'MAX', formula);
      case 'LAST':
        return this.requireAggregate(context.aggregates.LAST, 'LAST', formula);
      case 'COUNT':
        // COUNT sempre retorna number (nunca null) — 0 quando sem medições
        return context.aggregates.COUNT;
    }

    // Funções matemáticas — exatamente 1 argumento (validado pelo validator)
    const arg0 = this.evalNode(args[0], context, formula);

    switch (name) {
      case 'ABS':
        return Math.abs(arg0);
      case 'ROUND':
        return Math.round(arg0);
      case 'FLOOR':
        return Math.floor(arg0);
      case 'CEIL':
        return Math.ceil(arg0);
    }

    // Nunca deve chegar aqui se o validator rodou corretamente
    throw new FormulaEvaluationError(
      `Função desconhecida durante avaliação: "${name}". ` +
        `O validator deve ter sido executado antes da avaliação.`,
      formula,
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Exige que um valor agregado seja não-null.
   * Quando null (sem medições), lança FormulaEvaluationError.
   *
   * Razão: o operador que usa este valor resultaria em NaN se recebesse null.
   * Preferimos um erro claro e tipado.
   */
  private requireAggregate(
    value: number | null,
    functionName: string,
    formula?: string,
  ): number {
    if (value === null) {
      throw new FormulaEvaluationError(
        `A função ${functionName}() retornou null — o período não possui medições válidas. ` +
          `Não é possível calcular a fórmula sem dados.`,
        formula,
      );
    }
    return value;
  }

  /**
   * Garante que o resultado final é finito e não-NaN.
   * Lança FormulaEvaluationError se o resultado for NaN ou Infinity.
   *
   * Isso é uma defesa adicional — os casos de NaN/Infinity mais comuns
   * já são capturados individualmente (divisão por zero, null de agregador).
   */
  private assertFinite(value: number, formula?: string): void {
    if (isNaN(value)) {
      throw new FormulaEvaluationError(
        `O resultado da fórmula é NaN (Not a Number). ` +
          `Verifique se todas as operações da fórmula são válidas com os dados do período.`,
        formula,
      );
    }
    if (!isFinite(value)) {
      throw new FormulaEvaluationError(
        `O resultado da fórmula é Infinity. ` +
          `Verifique se há divisão por zero ou overflow de valores.`,
        formula,
      );
    }
  }
}
