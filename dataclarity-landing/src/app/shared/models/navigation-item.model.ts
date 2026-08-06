export interface NavigationItem {
  label: string;
  href: string;
  /** Quando true, usa routerLink em vez de href (para rotas Angular) */
  isRoute?: boolean;
}
