import { Component, inject, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface NavItem {
  label: string;
  icon: string;
  route?: string; // opcional — só os que têm rota real
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  @Output() navItemClick = new EventEmitter<void>();

  activeItem = 'Dashboard';

  ngOnInit(): void {
    // Define o item ativo com base na rota atual (incluindo navegações futuras)
    this.updateActiveFromUrl(this.router.url);
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.updateActiveFromUrl((e as NavigationEnd).urlAfterRedirects);
      });
  }

  private updateActiveFromUrl(url: string): void {
    const allItems = [...this.navItems, ...this.bottomItems];
    // Ordena pelo route mais longo primeiro para garantir match mais específico
    const sorted = allItems
      .filter((item) => item.route)
      .sort((a, b) => (b.route?.length ?? 0) - (a.route?.length ?? 0));
    const matched = sorted.find((item) => url.startsWith(item.route!));
    if (matched) {
      this.activeItem = matched.label;
    }
  }

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Indicadores', icon: 'bar_chart', route: '/dashboard/indicadores' },
    { label: 'Análises', icon: 'trending_up' },
    { label: 'Bases de Dados', icon: 'storage' },
    { label: 'Relatórios', icon: 'description' },
    { label: 'IA Insights', icon: 'auto_awesome' },
  ];

  bottomItems: NavItem[] = [
    { label: 'Configurações', icon: 'settings' },
    { label: 'Perfil', icon: 'person' },
  ];

  selectItem(item: NavItem): void {
    this.activeItem = item.label;
    if (item.route) {
      this.router.navigate([item.route]);
    }
    this.navItemClick.emit();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
