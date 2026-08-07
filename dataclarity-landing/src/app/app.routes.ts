import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  // ── Página pública (landing) ─────────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./features/home/pages/home-page/home-page.component').then(
        (m) => m.HomePageComponent,
      ),
  },

  // ── Rotas de autenticação (apenas para não-autenticados) ──────────────────
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/login/pages/login-page/login-page.component').then(
        (m) => m.LoginPageComponent,
      ),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import(
        './features/register/pages/register-page/register-page.component'
      ).then((m) => m.RegisterPageComponent),
  },

  // ── Verificação de e-mail (pública) ───────────────────────────────────────
  {
    path: 'verify-email-sent',
    loadComponent: () =>
      import(
        './features/auth/pages/verify-email-sent/verify-email-sent.component'
      ).then((m) => m.VerifyEmailSentComponent),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import(
        './features/auth/pages/verify-email/verify-email.component'
      ).then((m) => m.VerifyEmailComponent),
  },

  // ── Rotas protegidas (exigem autenticação) ────────────────────────────────
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/dashboard/pages/dashboard-page/dashboard-page.component'
      ).then((m) => m.DashboardPageComponent),
  },
  {
    path: 'dashboard/indicadores',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/indicators/pages/indicators-page/indicators-page.component'
      ).then((m) => m.IndicatorsPageComponent),
  },
  {
    path: 'dashboard/analises',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/analysis/pages/analysis-list/analysis-list.component'
      ).then((m) => m.AnalysisListComponent),
  },
  {
    path: 'dashboard/ajuda',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/help-center/pages/help-center/help-center.component'
      ).then((m) => m.HelpCenterComponent),
  },

  // ── Fallback ──────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '' },
];
