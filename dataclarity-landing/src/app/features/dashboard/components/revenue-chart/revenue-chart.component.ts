import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
);

@Component({
  selector: 'app-revenue-chart',
  standalone: true,
  imports: [],
  templateUrl: './revenue-chart.component.html',
  styleUrls: ['./revenue-chart.component.scss'],
})
export class RevenueChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  private labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  private currentYear = [180, 220, 260, 240, 300, 350, 320, 380, 420, 400, 460, 500];
  private lastYear = [120, 140, 160, 150, 180, 200, 190, 210, 230, 220, 250, 270];

  ngAfterViewInit(): void {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.labels,
        datasets: [
          {
            label: 'Ano Atual',
            data: this.currentYear,
            borderColor: '#4c6ef5',
            backgroundColor: 'rgba(76, 110, 245, 0.08)',
            borderWidth: 3,
            tension: 0.45,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#4c6ef5',
          },
          {
            label: 'Ano Anterior',
            data: this.lastYear,
            borderColor: '#c5c8ff',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [6, 4],
            tension: 0.45,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#c5c8ff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#fff',
            titleColor: '#091017',
            bodyColor: '#66727e',
            borderColor: '#d5dde3',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (ctx) => ` R$ ${ctx.parsed.y}k`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#66727e', font: { size: 12 } },
          },
          y: {
            grid: { color: '#f1f3f5' },
            border: { display: false, dash: [4, 4] },
            ticks: {
              color: '#66727e',
              font: { size: 12 },
              callback: (val) => `${val}k`,
            },
          },
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
      },
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
