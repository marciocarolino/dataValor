import { Component, Input } from '@angular/core';
import { Testimonial } from '../../models/testimonial.model';

@Component({
  selector: 'app-testimonial-card',
  standalone: true,
  templateUrl: './testimonial-card.component.html',
  styleUrl: './testimonial-card.component.scss',
})
export class TestimonialCardComponent {
  @Input({ required: true }) testimonial!: Testimonial;
}
