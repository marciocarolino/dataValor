import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';

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
export class SidebarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  @Output() navItemClick = new EventEmitter<void>();

  activeItem = 'Dashboard';

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Indicadores', icon: 'bar_chart' },
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
