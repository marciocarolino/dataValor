export type IndicatorCategory =
  | 'FINANCIAL'
  | 'COMMERCIAL'
  | 'OPERATIONAL'
  | 'MARKETING'
  | 'CUSTOMER'
  | 'CUSTOM';

export type IndicatorChartType =
  | 'LINE'
  | 'BAR'
  | 'AREA'
  | 'DONUT'
  | 'PIE'
  | 'GAUGE'
  | 'NUMBER';

export type IndicatorStatus = 'SUCCESS' | 'WARNING' | 'DANGER' | 'NEUTRAL';

export type IndicatorDesiredDirection =
  | 'HIGHER_IS_BETTER'
  | 'LOWER_IS_BETTER'
  | 'RANGE_IS_BETTER';

export type IndicatorPeriod =
  | 'PREVIOUS_MONTH'
  | 'PREVIOUS_QUARTER'
  | 'PREVIOUS_SEMESTER'
  | 'PREVIOUS_YEAR'
  | 'CUSTOM';

export const INDICATOR_PERIOD_LABELS: Record<IndicatorPeriod, string> = {
  PREVIOUS_MONTH: 'Mês anterior',
  PREVIOUS_QUARTER: 'Trimestre anterior',
  PREVIOUS_SEMESTER: 'Semestre anterior',
  PREVIOUS_YEAR: 'Ano anterior',
  CUSTOM: 'Personalizado',
};

/**
 * Periodicidade de Apuração — frequência com que o indicador gera um novo
 * resultado (que futuramente poderá ser armazenado no Histórico).
 *
 * Não confundir com IndicatorPeriod (Período de Referência), que define
 * o período utilizado como referência/comparação pelo indicador.
 */
export type IndicatorFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMESTERLY'
  | 'YEARLY'
  | 'CUSTOM';

export const INDICATOR_FREQUENCY_LABELS: Record<IndicatorFrequency, string> = {
  DAILY: 'Diário',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMESTERLY: 'Semestral',
  YEARLY: 'Anual',
  CUSTOM: 'Personalizado',
};

/** Slot fixo do card no Dashboard principal (4 cards fixos). */
export type DashboardSlot = 'REVENUE' | 'PROFIT' | 'CUSTOMERS' | 'GROWTH';

export interface IndicatorAnalytics {
  currentValue: number | null;
  previousValue: number | null;
  variation: number | null;
  variationCalculationStatus: string;
  targetAchievementPercentage: number | null;
  targetDifference: number | null;
  targetStatus: string;
  daysRemaining: number | null;
  isOverdue: boolean;
  lastMeasurementDate: string | null;
}

export interface Indicator {
  id: string;
  name: string;
  description: string | null;
  category: IndicatorCategory;
  formula: string | null;
  unit: string | null;
  goalValue: number | null;
  minimumGoalValue: number | null;
  maximumGoalValue: number | null;
  desiredDirection: IndicatorDesiredDirection;
  /** Periodicidade de Apuração: frequência com que o indicador gera um novo resultado. */
  frequency: IndicatorFrequency;
  currentValue: number | null;
  previousValue: number | null;
  previousPeriod: IndicatorPeriod | null;
  variation: number | null;
  status: IndicatorStatus;
  color: string | null;
  icon: string | null;
  chartType: IndicatorChartType;
  startDate: string | null;
  endDate: string | null;
  daysRemaining: number | null;
  isActive: boolean;
  showOnDashboard: boolean;
  /** Slot fixo do card no Dashboard (REVENUE, PROFIT, CUSTOMERS, GROWTH) — null se não vinculado. */
  dashboardSlot: DashboardSlot | null;
  createdAt: string;
  updatedAt: string;
  /** Analytics calculados em tempo real a partir das medições (fonte de verdade) */
  analytics?: IndicatorAnalytics;
}

export interface IndicatorSummary {
  total: number;
  active: number;
  inactive: number;
  /** Número de categorias distintas com indicadores */
  categories: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedIndicators {
  items: Indicator[];
  pagination: PaginationMeta;
}

export interface IndicatorQueryParams {
  page?: number;
  limit?: number;
  category?: IndicatorCategory;
  status?: IndicatorStatus;
  isActive?: boolean;
  name?: string;
  sortBy?: 'name' | 'category' | 'status' | 'createdAt' | 'currentValue';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateIndicatorPayload {
  name: string;
  description?: string;
  category: IndicatorCategory;
  formula?: string;
  unit?: string;
  goalValue?: number;
  minimumGoalValue?: number;
  maximumGoalValue?: number;
  desiredDirection?: IndicatorDesiredDirection;
  /** Periodicidade de Apuração: frequência com que o indicador gera um novo resultado. */
  frequency?: IndicatorFrequency;
  previousPeriod?: IndicatorPeriod;
  /** Status do resultado: SUCCESS, WARNING, DANGER ou NEUTRAL */
  status?: IndicatorStatus;
  color?: string | null | undefined;
  icon?: string | null | undefined;
  chartType: IndicatorChartType;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  showOnDashboard?: boolean;
  /** Slot fixo do card no Dashboard: REVENUE, PROFIT, CUSTOMERS ou GROWTH. */
  dashboardSlot?: DashboardSlot | null;
}

export type UpdateIndicatorPayload = Partial<CreateIndicatorPayload>;

export const INDICATOR_CATEGORY_LABELS: Record<IndicatorCategory, string> = {
  FINANCIAL: 'Financeiro',
  COMMERCIAL: 'Comercial',
  OPERATIONAL: 'Operacional',
  MARKETING: 'Marketing',
  CUSTOMER: 'Clientes',
  CUSTOM: 'Personalizado',
};

export const INDICATOR_STATUS_LABELS: Record<IndicatorStatus, string> = {
  SUCCESS: 'Positivo',
  WARNING: 'Atenção',
  DANGER: 'Crítico',
  NEUTRAL: 'Neutro',
};

export const INDICATOR_CHART_TYPE_LABELS: Record<IndicatorChartType, string> = {
  LINE: 'Linha',
  BAR: 'Barra',
  AREA: 'Área',
  DONUT: 'Rosca',
  PIE: 'Pizza',
  GAUGE: 'Velocímetro',
  NUMBER: 'Número',
};
