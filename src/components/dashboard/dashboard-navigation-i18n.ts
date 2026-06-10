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

export function getLocalizedDashboardNavigation(locale: string): LocalizedMenuItem[] {
  const nav = getAppDictionary(locale).nav;

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
