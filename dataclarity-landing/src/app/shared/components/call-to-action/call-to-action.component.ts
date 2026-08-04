import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-call-to-action',
  standalone: true,
  templateUrl: './call-to-action.component.html',
  styleUrl: './call-to-action.component.scss',
})
export class CallToActionComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) href!: string;
  @Input() variant: 'primary' | 'secondary' | 'dark' = 'primary';
}
