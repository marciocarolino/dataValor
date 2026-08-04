export type SolutionTheme = 'light' | 'dark';
export type ImagePosition = 'left' | 'right';

export interface ServiceSolution {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  deliverables: string[];
  benefit: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  imageAlt: string;
  theme: SolutionTheme;
  imagePosition: ImagePosition;
}

export const SERVICE_SOLUTIONS: ServiceSolution[] = [
  {
    id: 'dashboards',
    eyebrow: '01 · DASHBOARDS EXECUTIVOS',
    title: 'Enxergue o desempenho da empresa em poucos segundos',
    description:
      'Centralize vendas, finanças, clientes e operações em painéis objetivos, atualizados e adaptados às decisões mais importantes do seu negócio.',
    deliverables: [
      'Indicadores personalizados',
      'Visão comercial e financeira',
      'Filtros e comparações',
      'Atualização automática',
      'Acompanhamento de metas',
    ],
    benefit: 'Menos tempo procurando números. Mais tempo decidindo.',
    ctaLabel: 'Conhecer dashboards',
    ctaHref: '#contato',
    image: '/images/dashboard-preview.svg',
    imageAlt: 'Preview de dashboard executivo (mockup ilustrativo)',
    theme: 'light',
    imagePosition: 'right',
  },
  {
    id: 'automacao',
    eyebrow: '02 · AUTOMAÇÃO',
    title: 'Relatórios prontos sem depender de tarefas repetitivas',
    description:
      'Automatize a coleta, consolidação e distribuição de informações para que sua equipe pare de copiar dados manualmente entre planilhas e sistemas.',
    deliverables: [
      'Relatórios programados',
      'Consolidação automática',
      'Envio por e-mail',
      'Padronização de indicadores',
      'Redução de retrabalho',
    ],
    benefit: 'Transforme horas de trabalho manual em um processo previsível.',
    ctaLabel: 'Automatizar relatórios',
    ctaHref: '#contato',
    image: '/images/report-automation.svg',
    imageAlt: 'Ilustração de automação de relatórios (mockup ilustrativo)',
    theme: 'light',
    imagePosition: 'left',
  },
  {
    id: 'engenharia',
    eyebrow: '03 · ENGENHARIA DE DADOS',
    title: 'Construa uma base confiável para crescer',
    description:
      'Organizamos a coleta, transformação, armazenamento e disponibilidade dos dados para que análises e automações funcionem com segurança e consistência.',
    deliverables: [
      'Pipelines de dados',
      'Tratamento e validação',
      'Bancos de dados',
      'Integração de fontes',
      'Monitoramento de processos',
    ],
    benefit: 'Dados confiáveis começam por uma estrutura bem construída.',
    ctaLabel: 'Estruturar meus dados',
    ctaHref: '#contato',
    image: '/images/data-engineering.svg',
    imageAlt: 'Ilustração de engenharia de dados e pipelines (mockup ilustrativo)',
    theme: 'dark',
    imagePosition: 'right',
  },
  {
    id: 'integracao',
    eyebrow: '04 · INTEGRAÇÃO',
    title: 'Conecte sistemas, planilhas e bancos em uma única visão',
    description:
      'Unifique informações de ERP, CRM, planilhas, APIs e bancos de dados para eliminar silos e reduzir divergências entre áreas.',
    deliverables: [
      'Integração com ERP',
      'Integração com CRM',
      'APIs e bancos de dados',
      'Importação de planilhas',
      'Sincronização de informações',
    ],
    benefit: 'Uma fonte de verdade para toda a empresa.',
    ctaLabel: 'Integrar meus sistemas',
    ctaHref: '#contato',
    image: '/images/system-integration.svg',
    imageAlt: 'Ilustração de integração de sistemas com múltiplas fontes (mockup ilustrativo)',
    theme: 'light',
    imagePosition: 'left',
  },
];
