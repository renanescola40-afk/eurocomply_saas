import { getAppDictionary } from '@/lib/i18n/app-dictionary';

const dashboardRoot = '/dashboard/organizations';

export type LocalizedMenuLink = {
  label: string;
  href: string;
  description?: string;
};

export type LocalizedMenuItem = LocalizedMenuLink & {
  sections?: LocalizedMenuLink[];
};

const aiGovernanceCopy: Record<string, { label: string; description: string; inventory: string; inventoryDescription: string }> = {
  en: {
    label: 'AI Governance',
    description: 'AI systems inventory and AI Act classification',
    inventory: 'AI Systems Inventory',
    inventoryDescription: 'Register AI tools, roles, risk domains and obligations',
  },
  pt: {
    label: 'Governação de IA',
    description: 'Inventário de sistemas de IA e classificação AI Act',
    inventory: 'Inventário de Sistemas de IA',
    inventoryDescription: 'Registe ferramentas, papéis, domínios de risco e obrigações',
  },
  es: {
    label: 'Gobierno de IA',
    description: 'Inventario de sistemas de IA y clasificación AI Act',
    inventory: 'Inventario de Sistemas de IA',
    inventoryDescription: 'Registra herramientas, roles, dominios de riesgo y obligaciones',
  },
  fr: {
    label: 'Gouvernance IA',
    description: 'Inventaire des systèmes IA et classification AI Act',
    inventory: 'Inventaire des Systèmes IA',
    inventoryDescription: 'Recenser outils, rôles, domaines de risque et obligations',
  },
  it: {
    label: 'Governance IA',
    description: 'Inventario sistemi IA e classificazione AI Act',
    inventory: 'Inventario Sistemi IA',
    inventoryDescription: 'Registra strumenti, ruoli, domini di rischio e obblighi',
  },
  de: {
    label: 'KI-Governance',
    description: 'KI-Systeminventar und AI-Act-Klassifizierung',
    inventory: 'KI-Systeminventar',
    inventoryDescription: 'Tools, Rollen, Risikobereiche und Pflichten erfassen',
  },
};

function getAiGovernanceCopy(locale: string) {
  return aiGovernanceCopy[locale] ?? aiGovernanceCopy.en;
}

export function getLocalizedDashboardNavigation(locale: string): LocalizedMenuItem[] {
  const nav = getAppDictionary(locale).nav;
  const aiNav = getAiGovernanceCopy(locale);

  return [
    { label: nav.eurocomply, href: '/eurocomply-home', description: nav.eurocomplyDescription },
    {
      label: nav.commandCenter,
      href: `${dashboardRoot}/command-center`,
      sections: [
        { label: nav.executiveDashboard, href: `${dashboardRoot}/command-center`, description: nav.executiveDashboardDescription },
        { label: nav.auditLog, href: '/auditoria', description: nav.auditLogDescription },
        { label: nav.legalCalendar, href: '/calendario-compliance', description: nav.legalCalendarDescription },
      ],
    },
    {
      label: aiNav.label,
      href: '/ai-systems',
      description: aiNav.description,
      sections: [
        { label: aiNav.inventory, href: '/ai-systems', description: aiNav.inventoryDescription },
        { label: nav.riskMatrix, href: '/riscos', description: nav.riskMatrixDescription },
        { label: nav.raciMatrix, href: '/raci', description: nav.raciMatrixDescription },
      ],
    },
    {
      label: nav.evidenceRisk,
      href: `${dashboardRoot}/evidence-risk`,
      sections: [
        { label: nav.controlledDocuments, href: '/documentos', description: nav.controlledDocumentsDescription },
        { label: nav.riskMatrix, href: '/riscos', description: nav.riskMatrixDescription },
        { label: nav.raciMatrix, href: '/raci', description: nav.raciMatrixDescription },
      ],
    },
    {
      label: nav.reportsGovernance,
      href: `${dashboardRoot}/reports-governance`,
      sections: [
        { label: nav.complianceReports, href: `${dashboardRoot}/reports-governance`, description: nav.complianceReportsDescription },
        { label: nav.europeanNews, href: `${dashboardRoot}/reports-governance/news`, description: nav.europeanNewsDescription },
        { label: nav.approvals, href: '/aprovacoes', description: nav.approvalsDescription },
        { label: nav.minutesGovernance, href: `${dashboardRoot}/reports-governance`, description: nav.minutesGovernanceDescription },
      ],
    },
    {
      label: nav.profile,
      href: '/profile',
      sections: [
        { label: nav.myData, href: '/profile#company-data', description: nav.myDataDescription },
        { label: nav.plan, href: '/profile#plan', description: nav.planDescription },
        { label: nav.employees, href: '/profile#employees', description: nav.employeesDescription },
        { label: nav.enterpriseAvatar, href: '/profile#enterprise-status', description: nav.enterpriseAvatarDescription },
      ],
    },
    { label: nav.notifications, href: '/notificacoes', description: nav.notificationsDescription },
    { label: nav.news, href: `${dashboardRoot}/reports-governance/news`, description: nav.newsDescription },
  ];
}
