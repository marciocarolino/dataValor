import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/pages/home-page/home-page.component').then(
        (m) => m.HomePageComponent,
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/pages/login-page/login-page.component').then(
        (m) => m.LoginPageComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
