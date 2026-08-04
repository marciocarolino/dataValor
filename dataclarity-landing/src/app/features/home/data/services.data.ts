import { Service } from '../../../shared/models/service.model';

export const SERVICES: Service[] = [
  {
    title: 'Dashboards Interativos',
    description:
      'Visualize seus indicadores-chave (KPIs) em tempo real com painéis customizados que contam a história do seu negócio.',
    imageAlt: 'Prévia de dashboards interativos',
    imageSrc: '/images/dashboard-preview.svg',
    variant: 'default',
  },
  {
    title: 'Automação de Relatórios',
    description:
      'Elimine horas de trabalho manual. Deixe que nossos robôs processem e enviem seus relatórios automaticamente.',
    imageAlt: 'Automação de relatórios',
    imageSrc: '/images/report-automation.svg',
    variant: 'default',
  },
  {
    title: 'Engenharia de Dados',
    description:
      'Estruturamos seu pipeline de dados desde a coleta até o armazenamento seguro e escalável.',
    imageAlt: 'Engenharia de dados',
    imageSrc: '/images/data-engineering.svg',
    variant: 'dark',
  },
  {
    title: 'Integração de Sistemas',
    description:
      'Conectamos seu ERP, CRM e planilhas em uma única fonte da verdade, eliminando silos de informação.',
    imageAlt: 'Integração de sistemas',
    imageSrc: '/images/system-integration.svg',
    variant: 'default',
  },
];
