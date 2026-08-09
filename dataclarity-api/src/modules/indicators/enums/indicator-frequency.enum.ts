/**
 * Periodicidade de Apuração — define com que frequência o indicador gera
 * um novo resultado (que futuramente poderá ser armazenado no Histórico).
 *
 * Não confundir com IndicatorPeriod (Período de Referência), que define
 * o período utilizado como referência/comparação pelo indicador.
 */
export enum IndicatorFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMESTERLY = 'SEMESTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}
