import { Injectable } from '@nestjs/common';
import { FormulaParserService } from './formula-parser.service';
import { FormulaValidatorService } from './formula-validator.service';
import { FormulaEvaluatorService } from './formula-evaluator.service';
import { FormulaSyntaxError } from './formula.errors';
import {
  FORMULA_LIMITS,
  FormulaEvaluationContext,
  FormulaEvaluationResult,
} from './formula.types';
import { MeasurementInput } from '../aggregation-engine.service';

// ── Serviço orquestrador ──────────────────────────────────────────────────────

/**
 * FormulaEngineService — orquestrador do pipeline de avaliação de fórmulas.
 *
 * Pipeline de execução:
 *
 *   formula (string)
 *     ↓ FormulaTokenizerService (via FormulaParserService)
 *   tokens
 *     ↓ FormulaParserService
 *   AST
 *     ↓ FormulaValidatorService
 *   AST validada
 *     ↓ FormulaEvaluatorService
 *   number
 *
 * Responsabilidades deste serviço:
 *   1. Coordenar os quatro estágios do pipeline
 *   2. Construir o FormulaEvaluationContext a partir de medições brutas
 *   3. Retornar FormulaEvaluationResult tipado
 *
 * GARANTIAS:
 *   - Nunca usa eval(), new Function(), vm.*, child_process ou execução dinâmica.
 *   - Fórmula null ou vazia → FormulaSyntaxError antes de qualquer processamento.
 *   - Fórmula muito longa → FormulaSyntaxError (verificado no tokenizer).
 *   - Função não suportada → UnsupportedFormulaFunctionError.
 *   - Divisão por zero → DivisionByZeroError.
 *   - Resultado NaN/Infinity → FormulaEvaluationError.
 *   - Nenhum dado (medições vazias) → FormulaEvaluationError quando agregador necessário.
 *
 * SEPARAÇÃO DE RESPONSABILIDADES:
 *   Este serviço NÃO busca dados no banco.
 *   Este serviço NÃO resolve períodos.
 *   Este serviço NÃO cria IndicatorHistory.
 *   Ele apenas avalia uma fórmula contra um contexto de dados já preparado.
 */
@Injectable()
export class FormulaEngineService {
  constructor(
    private readonly parser: FormulaParserService,
    private readonly validator: FormulaValidatorService,
    private readonly evaluator: FormulaEvaluatorService,
  ) {}

  // ── API principal ─────────────────────────────────────────────────────────

  /**
   * Avalia uma fórmula contra um contexto de dados pré-calculados.
   *
   * @param formula  Expressão declarativa (ex: "SUM() / COUNT()")
   * @param context  Contexto com agregados pré-calculados do período
   * @returns        { value: number, formula: string }
   * @throws FormulaSyntaxError             Fórmula malformada
   * @throws FormulaValidationError         Função não suportada, aridade incorreta, limite excedido
   * @throws UnsupportedFormulaFunctionError Função não está na whitelist
   * @throws DivisionByZeroError            Divisão por zero
   * @throws FormulaEvaluationError         Resultado NaN/Infinity, agregador sem dados
   */
  evaluate(
    formula: string,
    context: FormulaEvaluationContext,
  ): FormulaEvaluationResult {
    // Validação antecipada do comprimento (antes de qualquer processamento)
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

    // 1. Parse: formula → AST
    const ast = this.parser.parse(formula);

    // 2. Validate: AST → AST validada (ou exceção)
    this.validator.validate(ast, formula);

    // 3. Evaluate: AST validada + contexto → number
    const value = this.evaluator.evaluate(ast, context, formula);

    return { value, formula };
  }

  // ── Construção do contexto ────────────────────────────────────────────────

  /**
   * Constrói um FormulaEvaluationContext a partir de uma lista de medições brutas.
   *
   * Este método pré-calcula os seis agregadores padrão (SUM, AVG, MIN, MAX, LAST, COUNT)
   * a partir das medições já filtradas pelo período.
   *
   * NOTA: As medições recebidas devem já estar filtradas para o período correto.
   * O FormulaEngineService não filtra por período — isso é responsabilidade do
   * AggregationEngineService (que usa [periodStart, periodEnd)).
   *
   * @param measurements  Medições do período (já filtradas, valores já convertidos)
   */
  buildContext(
    measurements: Array<{ value: number; referenceDate: Date }>,
  ): FormulaEvaluationContext {
    if (measurements.length === 0) {
      return {
        aggregates: {
          SUM: null,
          AVG: null,
          MIN: null,
          MAX: null,
          LAST: null,
          COUNT: 0,
        },
      };
    }

    const values = measurements.map((m) => m.value);
    const count = values.length;
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // LAST: medição com referenceDate mais recente; desempate por menor valor (determinístico)
    const sorted = [...measurements].sort((a, b) => {
      const diff = b.referenceDate.getTime() - a.referenceDate.getTime();
      if (diff !== 0) return diff;
      return a.value - b.value; // desempate determinístico
    });
    const last = sorted[0].value;

    return {
      aggregates: {
        SUM: sum,
        AVG: avg,
        MIN: min,
        MAX: max,
        LAST: last,
        COUNT: count,
      },
    };
  }

  /**
   * Versão conveniente que aceita MeasurementInput (com DecimalLike) e
   * filtra/converte para valores numéricos válidos antes de construir o contexto.
   *
   * Utilizado pelo AggregationEngineService que já faz a filtragem por período
   * internamente e passa medições convertidas.
   */
  buildContextFromFiltered(
    filtered: Array<{ value: number; referenceDate: Date }>,
  ): FormulaEvaluationContext {
    return this.buildContext(filtered);
  }

  /**
   * Avalia uma fórmula diretamente a partir de medições brutas do período.
   *
   * Método de conveniência que combina buildContextFromFiltered + evaluate.
   * Utilizado pelo AggregationEngineService.
   *
   * @param formula      Expressão declarativa
   * @param filtered     Medições do período (já filtradas e convertidas para number)
   */
  evaluateWithMeasurements(
    formula: string,
    filtered: Array<{ value: number; referenceDate: Date }>,
  ): FormulaEvaluationResult {
    const context = this.buildContextFromFiltered(filtered);
    return this.evaluate(formula, context);
  }
}

// Re-export para que consumidores do FormulaEngineService não precisem
// importar MeasurementInput separadamente quando usado com medições brutas
export type { MeasurementInput };
