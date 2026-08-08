import {
  Component,
  Input,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  OnChanges,
} from '@angular/core';
import {
  Chart,
  BarController,
  LineController,
  DoughnutController,
  PieController,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import type { Indicator } from '../../../../core/models/indicator.model';

Chart.register(
  BarController, LineController, DoughnutController, PieController,
  ArcElement, BarElement, LineElement, PointElement,
  LinearScale, CategoryScale, Filler, Tooltip, Legend,
);

@Component({
  selector: 'app-indicator-chart',
  standalone: true,
  imports: [],
  template: `
    <div class="ind-chart-wrap">
      @if (indicator.chartType === 'NUMBER') {
        <div class="kpi-display">
          <span class="kpi-display__label">{{ indicator.name }}</span>
          <span class="kpi-display__value" [style.color]="indicator.color ?? '#3b5bdb'">
            {{ formattedValue }}
          </span>
          @if (indicator.goalValue) {
            <div class="kpi-progress">
              <div class="kpi-progress__bar">
                <div class="kpi-progress__fill" [style.width.%]="progressPct" [style.background]="indicator.color ?? '#3b5bdb'"></div>
              </div>
              <span class="kpi-progress__label">{{ progressPct.toFixed(0) }}% da meta ({{ formattedGoal }})</span>
            </div>
          }
          @if (indicator.variation !== null) {
            <span class="kpi-variation" [class.kpi-variation--pos]="(indicator.variation ?? 0) >= 0" [class.kpi-variation--neg]="(indicator.variation ?? 0) < 0">
              {{ (indicator.variation ?? 0) >= 0 ? '▲' : '▼' }} {{ (Math.abs(indicator.variation ?? 0)).toFixed(1) }}%
              @if (indicator.previousPeriod) {
                vs {{ periodLabel }}
              }
            </span>
          }
        </div>
      } @else {
        <canvas #chartCanvas></canvas>
        <!-- Barra de métricas: exibida em todos os tipos de gráfico exceto NUMBER -->
        <div class="pie-totals">
          <div class="pie-totals__item">
            <span class="pie-totals__label">Realizado</span>
            <span class="pie-totals__value" [style.color]="indicator.color ?? '#4c6ef5'">{{ formattedValueFull }}</span>
          </div>
          @if (indicator.goalValue) {
            <div class="pie-totals__divider"></div>
            <div class="pie-totals__item">
              <span class="pie-totals__label">Meta</span>
              <span class="pie-totals__value">{{ formattedGoalFull }}</span>
            </div>
            <div class="pie-totals__divider"></div>
            <div class="pie-totals__item">
              <span class="pie-totals__label">Atingido</span>
              <span class="pie-totals__value pie-totals__value--pct" [style.color]="indicator.color ?? '#4c6ef5'">{{ progressPct.toFixed(1) }}%</span>
            </div>
          }
          @if (indicator.endDate) {
            <div class="pie-totals__divider"></div>
            <div class="pie-totals__item">
              <span class="pie-totals__label">Prazo</span>
              <span class="pie-totals__value pie-totals__value--days"
                [class.days-ok]="daysLeft !== null && daysLeft > 7"
                [class.days-warn]="daysLeft !== null && daysLeft >= 0 && daysLeft <= 7"
                [class.days-exp]="daysLeft !== null && daysLeft < 0">
                @if (daysLeft === null) { – }
                @else if (daysLeft < 0) { Encerrado }
                @else if (daysLeft === 0) { Hoje! }
                @else { {{ daysLeft }}d }
              </span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .ind-chart-wrap { width: 100%; height: 320px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    canvas { width: 100% !important; flex: 1 1 auto; min-height: 0; }
    .pie-totals {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      padding: 12px 16px 4px;
      width: 100%;
    }
    .pie-totals__item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 0 20px;
    }
    .pie-totals__label {
      font-size: 11px;
      color: #868e96;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .pie-totals__value {
      font-size: 18px;
      font-weight: 700;
      color: #212529;
    }
    .pie-totals__value--pct {
      font-size: 16px;
    }
    .pie-totals__divider {
      width: 1px;
      height: 32px;
      background: #dee2e6;
      flex-shrink: 0;
    }
    .kpi-display { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%; }
    .kpi-display__label { font-size: 14px; color: #66727e; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-display__value { font-size: 56px; font-weight: 800; color: #3b5bdb; line-height: 1; }
    .kpi-progress { width: 100%; max-width: 320px; display: flex; flex-direction: column; gap: 6px; }
    .kpi-progress__bar { height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
    .kpi-progress__fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
    .kpi-progress__label { font-size: 12px; color: #66727e; text-align: center; }
    .kpi-variation { font-size: 15px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
    .kpi-variation--pos { background: #d3f9d8; color: #2f9e44; }
    .kpi-variation--neg { background: #ffe3e3; color: #e03131; }
    .pie-totals__value--days { font-size: 15px; }
    .days-ok   { color: #2f9e44; }
    .days-warn { color: #e67700; }
    .days-exp  { color: #e03131; }
  `],
})
export class IndicatorChartComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() indicator!: Indicator;
  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  readonly Math = Math;

  get formattedValue(): string {
    const v = this.indicator.currentValue;
    if (v === null || v === undefined) return '–';
    const unit = this.indicator.unit ?? '';
    if (unit === 'BRL' || unit === 'R$') {
      if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
      if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
      return `R$ ${v.toLocaleString('pt-BR')}`;
    }
    if (unit === '%') return `${v}%`;
    return v.toLocaleString('pt-BR');
  }

  get formattedGoal(): string {
    const v = this.indicator.goalValue;
    if (v === null || v === undefined) return '–';
    const unit = this.indicator.unit ?? '';
    if (unit === 'BRL' || unit === 'R$') {
      if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
      if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
    }
    return v.toLocaleString('pt-BR');
  }

  get daysLeft(): number | null {
    const d = this.indicator.endDate;
    if (!d) return null;
    const end = new Date(d);
    if (isNaN(end.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - today.getTime()) / 86_400_000);
  }

  get formattedValueFull(): string {
    const v = this.indicator.currentValue;
    if (v === null || v === undefined) return '–';
    const unit = this.indicator.unit ?? '';
    if (unit === 'BRL' || unit === 'R$') {
      return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (unit === '%') return `${v}%`;
    return v.toLocaleString('pt-BR');
  }

  get formattedGoalFull(): string {
    const v = this.indicator.goalValue;
    if (v === null || v === undefined) return '–';
    const unit = this.indicator.unit ?? '';
    if (unit === 'BRL' || unit === 'R$') {
      return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return v.toLocaleString('pt-BR');
  }

  get progressPct(): number {
    const cur = this.indicator.currentValue ?? 0;
    const goal = this.indicator.goalValue;
    if (!goal || goal === 0) return 0;
    return Math.min((cur / goal) * 100, 100);
  }

  get periodLabel(): string {
    const map: Record<string, string> = {
      PREVIOUS_MONTH: 'mês ant.',
      PREVIOUS_QUARTER: 'trim. ant.',
      PREVIOUS_SEMESTER: 'sem. ant.',
      PREVIOUS_YEAR: 'ano ant.',
      CUSTOM: 'período ant.',
    };
    return map[this.indicator.previousPeriod ?? ''] ?? 'período ant.';
  }

  ngAfterViewInit(): void {
    if (this.indicator.chartType !== 'NUMBER') {
      this.renderChart();
    }
  }

  ngOnChanges(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    if (this.indicator.chartType !== 'NUMBER' && this.chartCanvas) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderChart(): void {
    if (!this.chartCanvas) return;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart?.destroy();

    const cur = this.indicator.currentValue ?? 0;
    const prev = this.indicator.previousValue ?? 0;
    const goal = this.indicator.goalValue ?? 0;
    const color = this.indicator.color ?? '#4c6ef5';
    const name = this.indicator.name;
    const prevLabel = this.periodLabel;

    switch (this.indicator.chartType) {
      case 'BAR':
        this.chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Atual', prev ? prevLabel : 'Anterior', goal ? 'Meta' : ''].filter(Boolean),
            datasets: [{
              label: name,
              data: [cur, prev || null, goal || null].filter((v) => v !== null) as number[],
              backgroundColor: [color, `${color}88`, '#e9ecef'],
              borderRadius: 6,
            }],
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
        });
        break;

      case 'LINE':
      case 'AREA':
        this.chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: [prev ? prevLabel : 'Anterior', 'Atual'],
            datasets: [{
              label: name,
              data: [prev, cur],
              borderColor: color,
              backgroundColor: this.indicator.chartType === 'AREA' ? `${color}22` : 'transparent',
              fill: this.indicator.chartType === 'AREA',
              tension: 0.4,
              pointRadius: 6,
              pointBackgroundColor: color,
              borderWidth: 3,
            }],
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
        });
        break;

      case 'PIE':
      case 'DONUT':
        this.chart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Realizado', 'Pendente para meta'],
            datasets: [{
              data: [cur, Math.max(0, goal - cur)],
              backgroundColor: [color, '#e9ecef'],
              borderWidth: 0,
              hoverOffset: 4,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: this.indicator.chartType === 'DONUT' ? '70%' : '0%',
            plugins: {
              legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
              tooltip: { callbacks: { label: (c) => ` ${c.label}: ${(c.parsed as number).toLocaleString('pt-BR')}` } },
            },
          },
        });
        break;

      case 'GAUGE': {
        const pct = goal > 0 ? Math.min((cur / goal) * 100, 100) : 50;
        this.chart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Progresso', 'Restante'],
            datasets: [{
              data: [pct, 100 - pct],
              backgroundColor: [color, '#e9ecef'],
              borderWidth: 0,
              circumference: 180,
              rotation: -90,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (c) => c.dataIndex === 0 ? ` ${pct.toFixed(1)}% da meta` : '' } },
            },
          },
        });
        break;
      }
    }
  }
}
