import { Component, inject, OnInit, computed } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopBarComponent } from '../../components/top-bar/top-bar.component';
import { MetricCardComponent } from '../../components/metric-card/metric-card.component';
import { RevenueChartComponent } from '../../components/revenue-chart/revenue-chart.component';
import { RevenueDistChartComponent } from '../../components/revenue-dist-chart/revenue-dist-chart.component';
import { TopClientsTableComponent } from '../../components/top-clients-table/top-clients-table.component';
import { AiInsightCardComponent } from '../../components/ai-insight-card/ai-insight-card.component';
import { IndicatorService } from '../../../../core/services/indicator.service';
import type { Indicator } from '../../../../core/models/indicator.model';

interface MetricCard {
  title: string;
  value: string;
  change: string;
  changePositive: boolean;
  icon: string;
  iconBg: string;
  iconColor: string;
}

// Configuração visual por nome do indicador (para mapear API → cards visuais)
const METRIC_VISUAL_CONFIG: Record<
  string,
  { icon: string; iconBg: string; iconColor: string }
> = {
  default: { icon: 'bar_chart', iconBg: '#eef2ff', iconColor: '#4c6ef5' },
  receita: {
    icon: 'account_balance_wallet',
    iconBg: '#eef2ff',
    iconColor: '#4c6ef5',
  },
  lucro: { icon: 'savings', iconBg: '#f0fff4', iconColor: '#2f9e44' },
  cliente: { icon: 'group', iconBg: '#fff5f5', iconColor: '#e03131' },
  crescimento: {
    icon: 'trending_up',
    iconBg: '#fff9db',
    iconColor: '#e67700',
  },
};

function getVisualConfig(name: string) {
  const lower = name.toLowerCase();
  for (const [key, cfg] of Object.entries(METRIC_VISUAL_CONFIG)) {
    if (key !== 'default' && lower.includes(key)) return cfg;
  }
  return METRIC_VISUAL_CONFIG['default'];
}

function formatValue(indicator: Indicator): string {
  const val = indicator.currentValue;
  if (val === null || val === undefined) return '–';
  const unit = indicator.unit ?? '';

  if (unit === 'BRL' || unit === 'R$') {
    if (Math.abs(val) >= 1_000_000)
      return `R$ ${(val / 1_000_000).toFixed(1)}M`;
    if (Math.abs(val) >= 1_000) return `R$ ${(val / 1_000).toFixed(0)}k`;
    return `R$ ${val.toLocaleString('pt-BR')}`;
  }
  if (unit === '%') return `${val}%`;
  if (Math.abs(val) >= 1_000) return val.toLocaleString('pt-BR');
  return String(val);
}

function formatChange(indicator: Indicator): string {
  const v = indicator.variation;
  if (v === null || v === undefined) return '0%';
  return `${Math.abs(v).toFixed(1)}%`;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    SidebarComponent,
    TopBarComponent,
    MetricCardComponent,
    RevenueChartComponent,
    RevenueDistChartComponent,
    TopClientsTableComponent,
    AiInsightCardComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss'],
})
export class DashboardPageComponent implements OnInit {
  readonly indicatorService = inject(IndicatorService);

  readonly loading = this.indicatorService.loading;
  readonly error = this.indicatorService.error;

  // Slots fixos do dashboard — sempre exibidos, preenchidos pela API quando disponível
  private readonly FIXED_SLOTS: MetricCard[] = [
    {
      title: 'Receita Total',
      value: '–',
      change: '0%',
      changePositive: true,
      icon: 'account_balance_wallet',
      iconBg: '#eef2ff',
      iconColor: '#4c6ef5',
    },
    {
      title: 'Lucro',
      value: '–',
      change: '0%',
      changePositive: true,
      icon: 'savings',
      iconBg: '#f0fff4',
      iconColor: '#2f9e44',
    },
    {
      title: 'Clientes',
      value: '–',
      change: '0%',
      changePositive: true,
      icon: 'group',
      iconBg: '#fff5f5',
      iconColor: '#e03131',
    },
    {
      title: 'Crescimento %',
      value: '–',
      change: '0%',
      changePositive: true,
      icon: 'trending_up',
      iconBg: '#fff9db',
      iconColor: '#e67700',
    },
  ];

  readonly metrics = computed<MetricCard[]>(() => {
    const indicators = this.indicatorService.dashboardIndicators();

    // Preenche os slots fixos com dados da API quando disponível
    return this.FIXED_SLOTS.map((slot) => {
      const apiMatch = indicators.find((ind) =>
        ind.name.toLowerCase().includes(slot.title.toLowerCase().split(' ')[0]),
      );
      if (!apiMatch) return slot;

      const visual = getVisualConfig(apiMatch.name);
      return {
        title: apiMatch.name,
        value: formatValue(apiMatch),
        change: formatChange(apiMatch),
        changePositive: (apiMatch.variation ?? 0) >= 0,
        icon: apiMatch.icon ?? visual.icon,
        iconBg: apiMatch.color ? `${apiMatch.color}22` : visual.iconBg,
        iconColor: apiMatch.color ?? visual.iconColor,
      };
    });
  });

  ngOnInit(): void {
    this.indicatorService.loadDashboardIndicators();
  }
}
