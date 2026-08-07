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

export interface Indicator {
  id: string;
  name: string;
  description: string | null;
  category: IndicatorCategory;
  formula: string | null;
  unit: string | null;
  goalValue: number | null;
  currentValue: number | null;
  previousValue: number | null;
  variation: number | null;
  status: IndicatorStatus;
  color: string | null;
  icon: string | null;
  chartType: IndicatorChartType;
  isActive: boolean;
  showOnDashboard: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IndicatorSummary {
  total: number;
  active: number;
  inactive: number;
  categories: IndicatorCategory[];
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
  currentValue?: number;
  previousValue?: number;
  variation?: number;
  status: IndicatorStatus;
  color?: string;
  icon?: string;
  chartType: IndicatorChartType;
  isActive?: boolean;
  showOnDashboard?: boolean;
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
