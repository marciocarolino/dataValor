import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CLIENTS } from '../../data/clients.data';
import { TESTIMONIAL } from '../../data/testimonial.data';
import { TestimonialCardComponent } from '../../../../shared/components/testimonial-card/testimonial-card.component';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, TestimonialCardComponent],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss',
})
export class ClientsComponent {
  readonly clients = CLIENTS;
  readonly testimonial = TESTIMONIAL;
}
