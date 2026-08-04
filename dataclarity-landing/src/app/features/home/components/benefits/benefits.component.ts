import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BENEFITS } from '../../data/benefits.data';
import { BenefitItemComponent } from '../../../../shared/components/benefit-item/benefit-item.component';

@Component({
  selector: 'app-benefits',
  standalone: true,
  imports: [CommonModule, BenefitItemComponent],
  templateUrl: './benefits.component.html',
  styleUrl: './benefits.component.scss',
})
export class BenefitsComponent {
  readonly benefits = BENEFITS;
}
