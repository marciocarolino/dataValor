import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-deliverable-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deliverable-list.component.html',
  styleUrl: './deliverable-list.component.scss',
})
export class DeliverableListComponent {
  @Input({ required: true }) items!: string[];
  @Input() theme: 'light' | 'dark' = 'light';
}
