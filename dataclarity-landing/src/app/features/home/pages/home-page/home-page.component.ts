import { Component } from '@angular/core';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { NAVIGATION_ITEMS } from '../../data/navigation.data';
import { SOCIAL_LINKS } from '../../data/social-links.data';
import { HeroComponent } from '../../components/hero/hero.component';
import { ServicesComponent } from '../../components/services/services.component';
import { BenefitsComponent } from '../../components/benefits/benefits.component';
import { ClientsComponent } from '../../components/clients/clients.component';
import { FinalCtaComponent } from '../../components/final-cta/final-cta.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    HeaderComponent,
    HeroComponent,
    ServicesComponent,
    BenefitsComponent,
    ClientsComponent,
    FinalCtaComponent,
    FooterComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  readonly brand = 'DataClarity';
  readonly nav = NAVIGATION_ITEMS;
  readonly socialLinks = SOCIAL_LINKS;
}
