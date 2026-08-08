import { Component, inject, OnInit, computed } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopBarComponent } from '../../components/top-bar/top-bar.component';
import { MetricCardComponent } from '../../components/metric-card/metric-card.component';
import { RevenueChartComponent } from '../../components/revenue-chart/revenue-chart.component';
import { RevenueDistChartComponent } from '../../components/revenue-dist-chart/revenue-dist-chart.component';
import { TopClientsTableComponent } from '../../components/top-clients-table/top-clients-table.component';
import { AiInsightCardComponent } from '../../components/ai-insight-card/ai-insight-card.component';
import { IndicatorService } from '../../../../core/services/indicator.service';
import type {
  DashboardSlot,
  Indicator,
} from '../../../../core/models/indicator.model';

interface MetricCard {
  title: string;
  value: string;
  change: string;
  changePositive: boolean;
  icon: string;
  iconBg: string;
  iconColor: string;
  accentColor?: string;
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
  const raw = indicator.currentValue;
  if (raw === null || raw === undefined) return '–';
  // Prisma Decimal chega como string no JSON — converter para number
  const val = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
  if (isNaN(val)) return '–';

  const unit = indicator.unit ?? '';

  if (unit === 'BRL' || unit === 'R$') {
    // Sempre exibe valor completo com centavos — sem arredondamento
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  }
  if (unit === '%') return `${val.toFixed(2).replace('.', ',')}%`;
  // Valores numéricos sem unidade
  if (Math.abs(val) >= 1_000) return val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
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

  // Slots fixos do dashboard — sempre exibidos, preenchidos pela API quando disponível.
  // A ordem aqui define a ordem visual dos 4 cards; o `slot` é a chave usada
  // para vincular ao campo `dashboardSlot` do indicador retornado pela API.
  private readonly FIXED_SLOTS: (MetricCard & { slot: DashboardSlot })[] = [
    {
      slot: 'REVENUE',
      title: 'Receita Total',
      value: '–',
      change: '0%',
      changePositive: true,
      icon: 'account_balance_wallet',
      iconBg: '#eef2ff',
      iconColor: '#4c6ef5',
    },
    {
      slot: 'PROFIT',
      title: 'Lucro',
      value: '–',
      change: '0%',
      changePositive: true,
      icon: 'savings',
      iconBg: '#f0fff4',
      iconColor: '#2f9e44',
    },
    {
      slot: 'CUSTOMERS',
      title: 'Clientes',
      value: '–',
      change: '0%',
      changePositive: true,
      icon: 'group',
      iconBg: '#fff5f5',
      iconColor: '#e03131',
    },
    {
      slot: 'GROWTH',
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

    // Preenche os slots fixos com dados da API pelo campo dashboardSlot
    // (fonte de verdade definida no cadastro do indicador — sem matching por nome).
    return this.FIXED_SLOTS.map((slot) => {
      const apiMatch = indicators.find(
        (ind) => ind.dashboardSlot === slot.slot,
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
        accentColor: apiMatch.color ?? '',
      };
    });
  });

  ngOnInit(): void {
    this.indicatorService.loadDashboardIndicators();
  }
}
