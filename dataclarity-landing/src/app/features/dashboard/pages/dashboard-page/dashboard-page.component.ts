import { Component } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopBarComponent } from '../../components/top-bar/top-bar.component';
import { MetricCardComponent } from '../../components/metric-card/metric-card.component';
import { RevenueChartComponent } from '../../components/revenue-chart/revenue-chart.component';
import { RevenueDistChartComponent } from '../../components/revenue-dist-chart/revenue-dist-chart.component';
import { TopClientsTableComponent } from '../../components/top-clients-table/top-clients-table.component';
import { AiInsightCardComponent } from '../../components/ai-insight-card/ai-insight-card.component';

interface MetricCard {
  title: string;
  value: string;
  change: string;
  changePositive: boolean;
  icon: string;
  iconBg: string;
  iconColor: string;
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
export class DashboardPageComponent {
  metrics: MetricCard[] = [
    {
      title: 'Receita Total',
      value: 'R$ 2.4M',
      change: '12.5%',
      changePositive: true,
      icon: 'account_balance_wallet',
      iconBg: '#eef2ff',
      iconColor: '#4c6ef5',
    },
    {
      title: 'Lucro',
      value: 'R$ 840k',
      change: '8.2%',
      changePositive: true,
      icon: 'savings',
      iconBg: '#f0fff4',
      iconColor: '#2f9e44',
    },
    {
      title: 'Clientes',
      value: '1,248',
      change: '1.4%',
      changePositive: false,
      icon: 'group',
      iconBg: '#fff5f5',
      iconColor: '#e03131',
    },
    {
      title: 'Crescimento %',
      value: '24%',
      change: '4.1%',
      changePositive: true,
      icon: 'trending_up',
      iconBg: '#fff9db',
      iconColor: '#e67700',
    },
  ];
}
