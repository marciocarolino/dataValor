import {
  Component,
  Input,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  ViewChild,
  ElementRef,
} from '@angular/core';
import {
  Chart,
  LineController,
  BarController,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
  type ChartDataset,
} from 'chart.js';
import type { Indicator, IndicatorHistory } from '../../../../core/models/indicator.model';

Chart.register(
  LineController, BarController,
  LineElement, BarElement, PointElement,
  LinearScale, CategoryScale,
  Filler, Tooltip, Legend,
);

/** Formata periodStart em label legível para o eixo X */
function periodLabel(h: IndicatorHistory, frequency: string): string {
  const d = new Date(h.periodStart);
  if (isNaN(d.getTime())) return h.periodStart.substring(0, 10);

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const m = monthNames[d.getUTCMonth()];
  const y = d.getUTCFullYear();

  switch (frequency) {
    case 'DAILY':
      return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}`;
    case 'WEEKLY':
      return `Sem ${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}`;
    case 'MONTHLY':
      return `${m}/${y}`;
    case 'QUARTERLY': {
      const q = Math.floor(d.getUTCMonth() / 3) + 1;
      return `Q${q}/${y}`;
    }
    case 'SEMESTERLY': {
      const s = d.getUTCMonth() < 6 ? 1 : 2;
      return `S${s}/${y}`;
    }
    case 'YEARLY':
      return `${y}`;
    default:
      return `${m}/${y}`;
  }
}

@Component({
  selector: 'app-indicator-history-chart',
  standalone: true,
  imports: [],
  template: `
    <div class="history-chart">
      @if (history.length === 0) {
        <div class="history-chart__empty">
          <span class="material-icons">show_chart</span>
          <p>Sem dados para exibir no gráfico.</p>
        </div>
      } @else {
        <canvas #historyCanvas aria-label="Gráfico de evolução do indicador" role="img"></canvas>
      }
    </div>
  `,
  styles: [`
    .history-chart {
      width: 100%;
      height: 260px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
    .history-chart__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: #adb5bd;
      font-size: 13px;
      text-align: center;
    }
    .history-chart__empty .material-icons {
      font-size: 40px;
    }
    .history-chart__empty p {
      margin: 0;
    }
  `],
})
export class IndicatorHistoryChartComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input({ required: true }) indicator!: Indicator;
  @Input({ required: true }) history: IndicatorHistory[] = [];

  @ViewChild('historyCanvas') canvas?: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnChanges(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    // Aguarda o próximo ciclo para que o canvas exista se history mudou de [] para [...]
    setTimeout(() => this.renderChart(), 0);
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderChart(): void {
    if (!this.canvas || this.history.length === 0) return;

    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart?.destroy();

    // Histórico em ordem cronológica (mais antigo primeiro) para o eixo X
    const ordered = [...this.history].reverse();

    const freq = this.indicator.frequency ?? 'MONTHLY';
    const color = this.indicator.color ?? '#3b5bdb';
    const labels = ordered.map(h => periodLabel(h, freq));
    const values = ordered.map(h => h.value);
    const goals = ordered.map(h => h.goalValue);

    const datasets: ChartDataset<'line'>[] = [
      {
        label: this.indicator.name,
        data: values,
        borderColor: color,
        backgroundColor: `${color}18`,
        fill: true,
        tension: 0.35,
        pointRadius: 5,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 7,
        borderWidth: 2.5,
      },
    ];

    // Linha de meta — apenas se pelo menos um período possui goalValue
    const hasGoal = goals.some(g => g !== null && g !== undefined);
    if (hasGoal) {
      datasets.push({
        label: 'Meta',
        data: goals as number[],
        borderColor: '#e03131',
        backgroundColor: 'transparent',
        borderDash: [5, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: false,
        tension: 0,
      });
    }

    this.chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: hasGoal,
            position: 'top',
            labels: {
              font: { size: 11, weight: 600 },
              color: '#495057',
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 10,
            },
          },
          tooltip: {
            backgroundColor: '#fff',
            titleColor: '#212529',
            bodyColor: '#495057',
            borderColor: '#dee2e6',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed.y;
                if (v === null || v === undefined) return ' —';
                const formatted = v.toLocaleString('pt-BR', {
                  minimumFractionDigits: 0, maximumFractionDigits: 2,
                });
                const unit = this.indicator.unit ?? '';
                const prefix = (unit === 'BRL' || unit === 'R$') ? 'R$ ' : '';
                const suffix = unit === '%' ? '%' : (unit && unit !== 'BRL' && unit !== 'R$') ? ` ${unit}` : '';
                return ` ${ctx.dataset.label}: ${prefix}${formatted}${suffix}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#f1f3f5' },
            ticks: {
              font: { size: 11 },
              color: '#868e96',
              maxRotation: 45,
              autoSkip: true,
              maxTicksLimit: 12,
            },
          },
          y: {
            grid: { color: '#f1f3f5' },
            ticks: {
              font: { size: 11 },
              color: '#868e96',
              callback: (value) => {
                const v = Number(value);
                const unit = this.indicator.unit ?? '';
                if (unit === 'BRL' || unit === 'R$') {
                  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
                  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
                  return `R$ ${v.toLocaleString('pt-BR')}`;
                }
                if (unit === '%') return `${v}%`;
                if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                return v.toLocaleString('pt-BR');
              },
            },
          },
        },
      },
    });
  }
}
