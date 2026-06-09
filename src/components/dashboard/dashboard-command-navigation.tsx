import Link from 'next/link';
import { ChevronDown, Settings, UserCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const dashboardNavigation = [
  {
    label: 'Home',
    href: '',
    sections: [
      { label: 'Overview', id: 'overview' },
      { label: 'Experience Map', id: 'experience-map' },
      { label: 'Experience Index', id: 'experience-index' },
      { label: 'Recommended Focus', id: 'recommended-focus' },
      { label: 'Calendar', id: 'calendar' },
    ],
  },
  {
    label: 'Command Center',
    href: '/command-center',
    sections: [
      { label: 'Executive Summary', id: 'executive-summary' },
      { label: 'KPI Strip', id: 'kpi-strip' },
      { label: 'Health Center', id: 'health-center' },
      { label: 'AI Copilot', id: 'ai-copilot' },
      { label: 'Operational Feed', id: 'operational-feed' },
    ],
  },
  {
    label: 'Evidence & Risk',
    href: '/evidence-risk',
    sections: [
      { label: 'Risk Heatmap', id: 'risk-heatmap' },
      { label: 'Relationship Graph', id: 'relationship-graph' },
      { label: 'Evidence Graph', id: 'evidence-graph' },
      { label: 'Risk Radar', id: 'risk-radar' },
      { label: 'Tasks', id: 'tasks' },
      { label: 'Risks', id: 'risks' },
      { label: 'Vendors', id: 'vendors' },
      { label: 'Documents', id: 'documents' },
    ],
  },
  {
    label: 'Reports & Governance',
    href: '/reports-governance',
    sections: [
      { label: 'Board Mode', id: 'board-mode' },
      { label: 'Scenario Simulator', id: 'scenario-simulator' },
      { label: 'Board Report Center', id: 'board-report-center' },
      { label: 'White-label Reports', id: 'white-label-reports' },
      { label: 'Approval Workflow', id: 'approval-workflow' },
      { label: 'Department Ownership', id: 'department-ownership' },
      { label: 'Audit Timeline', id: 'audit-timeline' },
      { label: 'Framework Coverage', id: 'framework-coverage' },
      { label: 'Value Ladder', id: 'value-ladder' },
    ],
  },
] as const;

type DashboardCommandNavigationProps = {
  locale: string;
  basePath: string;
  activePage?: string;
  complianceHealth: string;
};

export function DashboardCommandNavigation({ locale, basePath, activePage = 'Home', complianceHealth }: DashboardCommandNavigationProps) {
  const normalizedBasePath = `/${locale}${basePath}`;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/88 backdrop-blur-xl supports-[backdrop-filter]:bg-background/72">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Badge className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">EuroComply Command Center</Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">{complianceHealth}</Badge>
        </div>

        <nav className="flex flex-wrap items-center gap-2 text-sm">
          {dashboardNavigation.map((item) => {
            const isActive = item.label === activePage;
            const pageHref = `${normalizedBasePath}${item.href}`;

            return (
              <div key={item.label} className="group relative">
                <Link
                  href={pageHref}
                  className={`flex items-center gap-1 rounded-full border px-3 py-2 transition ${
                    isActive ? 'border-primary/50 bg-primary/10 text-primary' : 'border-transparent text-muted-foreground hover:border-primary/30 hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {item.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Link>
                <div className="invisible absolute left-0 top-full z-50 mt-2 w-64 translate-y-1 rounded-2xl border bg-background/95 p-2 opacity-0 shadow-2xl shadow-primary/10 backdrop-blur transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  {item.sections.map((section) => (
                    <Link
                      key={section.id}
                      href={`${pageHref}#${section.id}`}
                      className="block rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                    >
                      {section.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="group relative">
            <button className="flex items-center gap-1 rounded-full border border-transparent px-3 py-2 text-muted-foreground transition hover:border-primary/30 hover:bg-muted/50 hover:text-foreground">
              <UserCircle2 className="h-4 w-4" /> Perfil
            </button>
            <div className="invisible absolute right-0 top-full z-50 mt-2 w-56 translate-y-1 rounded-2xl border bg-background/95 p-2 opacity-0 shadow-2xl shadow-primary/10 backdrop-blur transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              {['Organization profile', 'User role', 'Team', 'Subscription / plan', 'Security & sessions'].map((label) => (
                <span key={label} className="block rounded-xl px-3 py-2 text-sm text-muted-foreground">{label}</span>
              ))}
            </div>
          </div>

          <div className="group relative">
            <button className="flex items-center gap-1 rounded-full border border-transparent px-3 py-2 text-muted-foreground transition hover:border-primary/30 hover:bg-muted/50 hover:text-foreground">
              <Settings className="h-4 w-4" /> Configurações
            </button>
            <div className="invisible absolute right-0 top-full z-50 mt-2 w-56 translate-y-1 rounded-2xl border bg-background/95 p-2 opacity-0 shadow-2xl shadow-primary/10 backdrop-blur transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              {['Workspace settings', 'Branding', 'Notifications', 'Integrations', 'Data export', 'Permissions'].map((label) => (
                <span key={label} className="block rounded-xl px-3 py-2 text-sm text-muted-foreground">{label}</span>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
