import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopBarComponent } from '../../components/top-bar/top-bar.component';
import { MetricCardComponent } from '../../components/metric-card/metric-card.component';
import { IndicatorHistoryChartComponent } from '../../../indicators/components/indicator-history-chart/indicator-history-chart.component';
import { IndicatorService } from '../../../../core/services/indicator.service';
import {
  INDICATOR_STATUS_LABELS,
  INDICATOR_CATEGORY_LABELS,
  AGGREGATION_TYPE_LABELS,
  INDICATOR_FREQUENCY_LABELS,
  type Indicator,
  type IndicatorHistory,
  type IndicatorStatus,
} from '../../../../core/models/indicator.model';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && v !== null && 'toNumber' in v) {
    return (v as { toNumber(): number }).toNumber();
  }
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function fmtValue(ind: Indicator): string {
  const val = toNum(ind.currentValue);
  if (val === null) return '–';
  const unit = ind.unit ?? '';
  if (unit === 'BRL' || unit === 'R$') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  }
  if (unit === '%') return `${val.toFixed(2).replace('.', ',')}%`;
  if (Math.abs(val) >= 1_000_000)
    return `${(val / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}M`;
  if (Math.abs(val) >= 1_000)
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

function fmtVariation(ind: Indicator): string {
  const v = toNum(ind.variation ?? ind.analytics?.variation ?? null);
  if (v === null) return '–';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function goalPct(ind: Indicator): number {
  const cur = toNum(ind.currentValue);
  const goal = toNum(ind.goalValue);
  if (cur === null || goal === null || goal === 0) return 0;
  return Math.min(Math.max((cur / goal) * 100, 0), 200);
}

// ── Componente ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    TopBarComponent,
    MetricCardComponent,
    IndicatorHistoryChartComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss'],
})
export class DashboardPageComponent implements OnInit {
  private readonly svc = inject(IndicatorService);
  private readonly router = inject(Router);

  readonly statusLabels = INDICATOR_STATUS_LABELS;
  readonly categoryLabels = INDICATOR_CATEGORY_LABELS;
  readonly aggregationLabels = AGGREGATION_TYPE_LABELS;
  readonly frequencyLabels = INDICATOR_FREQUENCY_LABELS;

  // ── Estado ─────────────────────────────────────────────────────────────────
  readonly loading = this.svc.loading;
  readonly error = this.svc.error;

  /** Todos os indicadores carregados */
  readonly allIndicators = signal<Indicator[]>([]);

  /** Indicador selecionado para exibir o gráfico de evolução */
  readonly chartIndicator = signal<Indicator | null>(null);

  /** Histórico do indicador selecionado para o gráfico */
  readonly chartHistory = signal<IndicatorHistory[]>([]);
  readonly chartLoading = signal(false);
  readonly chartError = signal<string | null>(null);

  // ── Computed ────────────────────────────────────────────────────────────────

  /** Contagem por status */
  readonly statusCounts = computed(() => {
    const inds = this.allIndicators();
    const active = inds.filter(i => i.isActive);
    return {
      total: inds.length,
      active: active.length,
      success: active.filter(i => i.status === 'SUCCESS').length,
      warning: active.filter(i => i.status === 'WARNING').length,
      danger: active.filter(i => i.status === 'DANGER').length,
      neutral: active.filter(i => i.status === 'NEUTRAL').length,
    };
  });

  /** Cards de resumo executivo */
  readonly summaryCards = computed(() => {
    const c = this.statusCounts();
    return [
      {
        title: 'Positivos',
        value: String(c.success),
        change: c.active > 0 ? `${((c.success / c.active) * 100).toFixed(0)}% do total` : '–',
        changePositive: true,
        icon: 'check_circle',
        iconBg: '#d3f9d8',
        iconColor: '#2f9e44',
        accentColor: '#2f9e44',
      },
      {
        title: 'Em Atenção',
        value: String(c.warning),
        change: c.active > 0 ? `${((c.warning / c.active) * 100).toFixed(0)}% do total` : '–',
        changePositive: c.warning === 0,
        icon: 'warning',
        iconBg: '#fff3bf',
        iconColor: '#e67700',
        accentColor: '#e67700',
      },
      {
        title: 'Críticos',
        value: String(c.danger),
        change: c.active > 0 ? `${((c.danger / c.active) * 100).toFixed(0)}% do total` : '–',
        changePositive: c.danger === 0,
        icon: 'error',
        iconBg: '#ffe3e3',
        iconColor: '#e03131',
        accentColor: '#e03131',
      },
      {
        title: 'Monitorados',
        value: String(c.active),
        change: `${c.neutral} sem meta`,
        changePositive: true,
        icon: 'monitoring',
        iconBg: '#eef2ff',
        iconColor: '#3b5bdb',
        accentColor: '#3b5bdb',
      },
    ];
  });

  /** Top 5 melhores performers (SUCCESS primeiro, depois menor % vs goal, depois variação) */
  readonly topPerformers = computed(() => {
    return this.allIndicators()
      .filter(i => i.isActive && (i.status === 'SUCCESS' || i.status === 'WARNING'))
      .sort((a, b) => {
        // SUCCESS antes de WARNING
        if (a.status !== b.status) return a.status === 'SUCCESS' ? -1 : 1;
        // maior goalPct primeiro
        return goalPct(b) - goalPct(a);
      })
      .slice(0, 5);
  });

  /** Indicadores que precisam de atenção (DANGER primeiro, depois WARNING) */
  readonly needsAttention = computed(() => {
    return this.allIndicators()
      .filter(i => i.isActive && (i.status === 'DANGER' || i.status === 'WARNING'))
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'DANGER' ? -1 : 1;
        return goalPct(a) - goalPct(b); // menor pct primeiro
      })
      .slice(0, 5);
  });

  /** Indicadores com meta definida para o painel vs meta */
  readonly withGoal = computed(() => {
    return this.allIndicators()
      .filter(i => i.isActive && toNum(i.goalValue) !== null && toNum(i.goalValue) !== 0)
      .sort((a, b) => goalPct(a) - goalPct(b)) // menor pct primeiro
      .slice(0, 8);
  });

  /** Helpers expostos para o template */
  readonly fmtValue = fmtValue;
  readonly fmtVariation = fmtVariation;
  readonly goalPct = goalPct;
  readonly Math = Math;

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadAll();
  }

  // ── Métodos ─────────────────────────────────────────────────────────────────

  private loadAll(): void {
    this.svc.loading.set(true);
    this.svc.error.set(null);
    this.svc.getAll({ limit: 100, isActive: true, sortBy: 'createdAt', sortOrder: 'asc' }).subscribe({
      next: (data) => {
        this.allIndicators.set(data.items);
        this.svc.loading.set(false);
        // Seleciona automaticamente o primeiro indicador ativo com histórico para o gráfico
        this.selectFirstChartIndicator(data.items);
      },
      error: (err: Error) => {
        this.svc.error.set(err.message);
        this.svc.loading.set(false);
      },
    });
  }

  /** Seleciona o primeiro indicador com histórico para o gráfico */
  private selectFirstChartIndicator(indicators: Indicator[]): void {
    // Preferência: SUCCESS > WARNING > DANGER > NEUTRAL
    const order: IndicatorStatus[] = ['SUCCESS', 'WARNING', 'DANGER', 'NEUTRAL'];
    let selected: Indicator | null = null;
    for (const status of order) {
      selected = indicators.find(i => i.status === status) ?? null;
      if (selected) break;
    }
    if (!selected && indicators.length > 0) selected = indicators[0];
    if (!selected) return;

    this.chartIndicator.set(selected);
    this.loadChartHistory(selected.id);
  }

  /** Carrega o histórico para o gráfico de evolução */
  loadChartHistory(indicatorId: string): void {
    this.chartLoading.set(true);
    this.chartError.set(null);
    this.svc.getHistory(indicatorId, { page: 1, limit: 24 }).subscribe({
      next: (data) => {
        this.chartHistory.set(data.items);
        this.chartLoading.set(false);
      },
      error: (err: Error) => {
        this.chartError.set(err.message);
        this.chartLoading.set(false);
      },
    });
  }

  /** Troca o indicador do gráfico de evolução */
  selectChartIndicator(ind: Indicator): void {
    this.chartIndicator.set(ind);
    this.loadChartHistory(ind.id);
  }

  /** Retorna a classe CSS do badge de status */
  statusClass(status: IndicatorStatus | string): string {
    const map: Record<string, string> = {
      SUCCESS: 'badge--success',
      WARNING: 'badge--warning',
      DANGER: 'badge--danger',
      NEUTRAL: 'badge--neutral',
    };
    return map[status] ?? 'badge--neutral';
  }

  /** Formata valor numérico puro sem unidade */
  fmtNumber(v: number | null | undefined): string {
    if (v === null || v === undefined) return '–';
    const n = toNum(v);
    if (n === null) return '–';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  navigateTo(path: string): void {
    void this.router.navigate([path]);
  }

  reload(): void {
    this.loadAll();
  }
}
