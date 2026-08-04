import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NavigationItem } from '../../models/navigation-item.model';
import { SocialLink } from '../../models/social-link.model';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  @Input({ required: true }) brand!: string;
  @Input({ required: true }) navItems!: NavigationItem[];
  @Input({ required: true }) socialLinks!: SocialLink[];
}
