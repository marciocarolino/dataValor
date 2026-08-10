/**
 * AggregationType — define COMO o resultado de um período de apuração
 * deve ser obtido a partir das medições do indicador.
 *
 * Usado em conjunto com IndicatorFrequency (QUANDO apurar).
 *
 * IMPORTANTE:
 * - FORMULA não executa código. O campo `formula` armazena
 *   uma expressão declarativa que será interpretada pelo
 *   futuro Formula Engine em etapas posteriores.
 * - Nunca usar eval(), new Function() ou execução dinâmica.
 */
export enum AggregationType {
  /** Soma dos valores das medições do período */
  SUM = 'SUM',

  /** Média aritmética dos valores das medições do período */
  AVG = 'AVG',

  /** Menor valor registrado no período */
  MIN = 'MIN',

  /** Maior valor registrado no período */
  MAX = 'MAX',

  /** Último valor válido do período (por referenceDate da medição) */
  LAST = 'LAST',

  /** Quantidade de medições/registros válidos no período */
  COUNT = 'COUNT',

  /**
   * O resultado será calculado pelo futuro Formula Engine
   * utilizando o campo `formula` do indicador.
   *
   * Quando selecionado, o campo `formula` deve estar preenchido.
   * A fórmula é tratada como dado declarativo — nunca como código executável.
   */
  FORMULA = 'FORMULA',
}
