import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CallToActionComponent } from '../../../../shared/components/call-to-action/call-to-action.component';
import { DeliverableListComponent } from '../../../../shared/components/deliverable-list/deliverable-list.component';
import { SERVICE_SOLUTIONS } from '../../data/service-solutions.data';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, DeliverableListComponent, CallToActionComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
})
export class ServicesComponent {
  readonly solutions = SERVICE_SOLUTIONS;
}
