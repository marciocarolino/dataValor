export type AnalysisChartType =
  | 'LINE'
  | 'BAR'
  | 'AREA'
  | 'PIE'
  | 'DONUT'
  | 'TABLE'
  | 'KPI';

export type AnalysisAggregation =
  | 'SUM'
  | 'COUNT'
  | 'AVG'
  | 'MAX'
  | 'MIN'
  | 'DISTINCT';

export type AnalysisCategory =
  | 'FINANCIAL'
  | 'COMMERCIAL'
  | 'CUSTOMER'
  | 'MARKETING'
  | 'OPERATIONAL'
  | 'CUSTOM';

export interface Analysis {
  id: string;
  name: string;
  description: string | null;
  chartType: AnalysisChartType;
  category: AnalysisCategory;
  dataset: string | null;
  metric: string | null;
  aggregation: AnalysisAggregation;
  groupBy: string | null;
  dateField: string | null;
  startDate: string | null;
  endDate: string | null;
  filters: Record<string, unknown> | null;
  isFavorite: boolean;
  isPublic: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisSummary {
  total: number;
  favorites: number;
  isPublic: number;
  isPrivate: number;
  categories: AnalysisCategory[];
}

export interface AnalysisExecuteDataset {
  label: string;
  data: number[];
}

export interface AnalysisExecuteSummary {
  total: number;
  growth: number | null;
  records: number;
}

/**
 * Contrato padronizado de resposta do endpoint POST /analysis/:id/execute.
 * Estável para integração com Chart.js e qualquer lib de gráficos.
 * Quando houver dados reais (Datasets/Indicators), apenas o Service muda — não o frontend.
 */
export interface AnalysisExecuteResult {
  title: string;
  description: string | null;
  chartType: string;
  labels: string[];
  datasets: AnalysisExecuteDataset[];
  summary: AnalysisExecuteSummary;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedAnalysis {
  items: Analysis[];
  pagination: PaginationMeta;
}

export interface AnalysisQueryParams {
  page?: number;
  limit?: number;
  name?: string;
  category?: AnalysisCategory;
  chartType?: AnalysisChartType;
  isFavorite?: boolean;
  isPublic?: boolean;
  createdBy?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'name' | 'category' | 'chartType' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateAnalysisPayload {
  name: string;
  description?: string;
  chartType: AnalysisChartType;
  category: AnalysisCategory;
  dataset?: string;
  metric?: string;
  aggregation: AnalysisAggregation;
  groupBy?: string;
  dateField?: string;
  startDate?: string;
  endDate?: string;
  filters?: string;
  isFavorite?: boolean;
  isPublic?: boolean;
  createdBy?: string;
}

export type UpdateAnalysisPayload = Partial<CreateAnalysisPayload>;

export const ANALYSIS_CATEGORY_LABELS: Record<AnalysisCategory, string> = {
  FINANCIAL: 'Financeiro',
  COMMERCIAL: 'Comercial',
  CUSTOMER: 'Clientes',
  MARKETING: 'Marketing',
  OPERATIONAL: 'Operacional',
  CUSTOM: 'Personalizado',
};

export const ANALYSIS_CHART_TYPE_LABELS: Record<AnalysisChartType, string> = {
  LINE: 'Linha',
  BAR: 'Barra',
  AREA: 'Área',
  PIE: 'Pizza',
  DONUT: 'Rosca',
  TABLE: 'Tabela',
  KPI: 'KPI',
};

export const ANALYSIS_AGGREGATION_LABELS: Record<AnalysisAggregation, string> = {
  SUM: 'Soma',
  COUNT: 'Contagem',
  AVG: 'Média',
  MAX: 'Máximo',
  MIN: 'Mínimo',
  DISTINCT: 'Distintos',
};

export const ANALYSIS_CHART_TYPE_ICONS: Record<AnalysisChartType, string> = {
  LINE: 'show_chart',
  BAR: 'bar_chart',
  AREA: 'area_chart',
  PIE: 'pie_chart',
  DONUT: 'donut_large',
  TABLE: 'table_chart',
  KPI: 'speed',
};
