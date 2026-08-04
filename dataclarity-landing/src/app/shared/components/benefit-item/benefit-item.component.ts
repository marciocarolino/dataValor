import { Component, Input } from '@angular/core';
import { Benefit } from '../../models/benefit.model';

@Component({
  selector: 'app-benefit-item',
  standalone: true,
  templateUrl: './benefit-item.component.html',
  styleUrl: './benefit-item.component.scss',
})
export class BenefitItemComponent {
  @Input({ required: true }) benefit!: Benefit;

  iconLabel(icon: Benefit['icon']): string {
    switch (icon) {
      case 'time':
        return 'Ícone de relógio';
      case 'target':
        return 'Ícone de alvo';
      case 'scale':
        return 'Ícone de gráfico';
      default:
        return 'Ícone';
    }
  }
}
