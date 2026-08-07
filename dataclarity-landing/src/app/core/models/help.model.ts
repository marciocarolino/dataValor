export interface HelpItem {
  name: string;
  description: string;
}

export interface HelpSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  items?: HelpItem[];
  tips?: string[];
}

export interface HelpTopic {
  id: string;
  title: string;
  icon: string;
  description: string;
  objective: string;
  sections: HelpSection[];
}

export interface HelpMenuItem {
  id: string;
  label: string;
  icon: string;
  jsonFile: string;
  available: boolean;
}

export const HELP_MENU_ITEMS: HelpMenuItem[] = [
  { id: 'getting-started', label: 'Primeiros Passos', icon: 'rocket_launch', jsonFile: 'getting-started.json', available: false },
  { id: 'dashboard',       label: 'Dashboard',        icon: 'dashboard',      jsonFile: 'dashboard.json',       available: false },
  { id: 'indicators',      label: 'Indicadores',      icon: 'bar_chart',      jsonFile: 'indicators.json',      available: true  },
  { id: 'analysis',        label: 'Análises',          icon: 'trending_up',    jsonFile: 'analysis.json',        available: false },
  { id: 'datasets',        label: 'Bases de Dados',    icon: 'storage',        jsonFile: 'datasets.json',        available: false },
  { id: 'reports',         label: 'Relatórios',        icon: 'description',    jsonFile: 'reports.json',         available: false },
  { id: 'ai-insights',     label: 'IA Insights',       icon: 'auto_awesome',   jsonFile: 'ai-insights.json',     available: false },
  { id: 'settings',        label: 'Configurações',     icon: 'settings',       jsonFile: 'settings.json',        available: false },
  { id: 'glossary',        label: 'Glossário',         icon: 'menu_book',      jsonFile: 'glossary.json',        available: false },
];
