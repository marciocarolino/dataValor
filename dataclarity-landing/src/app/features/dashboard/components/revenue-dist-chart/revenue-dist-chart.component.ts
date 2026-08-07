import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import {
  Chart,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

@Component({
  selector: 'app-revenue-dist-chart',
  standalone: true,
  imports: [],
  templateUrl: './revenue-dist-chart.component.html',
  styleUrls: ['./revenue-dist-chart.component.scss'],
})
export class RevenueDistChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('donutCanvas') donutCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  items = [
    { label: 'Product A', value: 45, color: '#4c6ef5' },
    { label: 'Product B', value: 30, color: '#7048e8' },
    { label: 'Services', value: 15, color: '#c0392b' },
    { label: 'Outros', value: 10, color: '#e9ecef' },
  ];

  ngAfterViewInit(): void {
    const ctx = this.donutCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.items.map((i) => i.label),
        datasets: [
          {
            data: this.items.map((i) => i.value),
            backgroundColor: this.items.map((i) => i.color),
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#fff',
            titleColor: '#091017',
            bodyColor: '#66727e',
            borderColor: '#d5dde3',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`,
            },
          },
        },
      },
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
