import { Component } from '@angular/core';
import { CallToActionComponent } from '../../../../shared/components/call-to-action/call-to-action.component';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CallToActionComponent],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
})
export class HeroComponent {}
