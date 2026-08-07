import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [],
  templateUrl: './metric-card.component.html',
  styleUrls: ['./metric-card.component.scss'],
})
export class MetricCardComponent {
  @Input() title = '';
  @Input() value = '';
  @Input() change = '';
  @Input() changePositive = true;
  @Input() icon = 'payments';
  @Input() iconBg = '#eef2ff';
  @Input() iconColor = '#4c6ef5';
}
