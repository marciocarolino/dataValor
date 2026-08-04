import { Component } from '@angular/core';
import { CallToActionComponent } from '../../../../shared/components/call-to-action/call-to-action.component';

@Component({
  selector: 'app-final-cta',
  standalone: true,
  imports: [CallToActionComponent],
  templateUrl: './final-cta.component.html',
  styleUrl: './final-cta.component.scss',
})
export class FinalCtaComponent {}
