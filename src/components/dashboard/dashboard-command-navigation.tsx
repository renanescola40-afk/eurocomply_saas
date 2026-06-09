import Link from 'next/link';
import { ChevronDown, Settings, UserCircle2 } from 'lucide-react';

const dashboardRoot = '/dashboard/organizations';

type MenuLink = {
  label: string;
  href: string;
};

type MenuItem = MenuLink & {
  sections?: MenuLink[];
};

export const dashboardNavigation: MenuItem[] = [
  {
    label: 'EuroComply',
    href: '/eurocomply-home',
  },
  {
    label: 'Visão Geral',
    href: dashboardRoot,
  },
  {
    label: 'Command Center',
    href: `${dashboardRoot}/command-center`,
    sections: [
      { label: 'Dashboard Executivo', href: `${dashboardRoot}/command-center/executive-dashboard` },
      { label: 'Alertas', href: `${dashboardRoot}/command-center/alerts` },
      { label: 'Minhas Tarefas', href: `${dashboardRoot}/tasks` },
    ],
  },
  {
    label: 'Evidence & Risk',
    href: `${dashboardRoot}/evidence-risk`,
    sections: [
      { label: 'Documentos', href: `${dashboardRoot}/documents` },
      { label: 'Matriz de Risco', href: `${dashboardRoot}/evidence-risk/risk-matrix` },
      { label: 'Auditorias', href: `${dashboardRoot}/evidence-risk/audits` },
    ],
  },
  {
    label: 'Reports & Governance',
    href: `${dashboardRoot}/reports-governance`,
    sections: [
      { label: 'Relatórios Compliance', href: `${dashboardRoot}/reports` },
      { label: 'Políticas', href: `${dashboardRoot}/reports-governance/policies` },
      { label: 'Atas', href: `${dashboardRoot}/reports-governance/minutes` },
    ],
  },
  {
    label: 'Perfil',
    href: '/profile',
    sections: [
      { label: 'Meus Dados', href: '/profile' },
      { label: 'Notificações', href: '/profile/notifications' },
      { label: 'Planos', href: '/profile/billing' },
    ],
  },
  {
    label: 'Configurações',
    href: `${dashboardRoot}/settings`,
    sections: [
      { label: 'Equipe', href: `${dashboardRoot}/settings/team` },
      { label: 'Integrações', href: `${dashboardRoot}/settings/integrations` },
      { label: 'Preferências', href: `${dashboardRoot}/settings/preferences` },
    ],
  },
];

type DashboardCommandNavigationProps = {
  locale: string;
  activePage?: string;
};

function localizeHref(locale: string, href: string) {
  return `/${locale}${href.startsWith('/') ? href : `/${href}`}`;
}

export function DashboardCommandNavigation({ locale, activePage = 'Visão Geral' }: DashboardCommandNavigationProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-8">
        <nav aria-label="Main EuroComply navigation" className="flex w-full items-center gap-2 overflow-x-auto whitespace-nowrap text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {dashboardNavigation.map((item) => {
            const isActive = item.label === activePage;
            const hasSubmenu = Boolean(item.sections?.length);

            return (
              <div key={item.label} className="group relative shrink-0">
                <Link
                  href={localizeHref(locale, item.href)}
                  className={`flex items-center gap-1 rounded-full border px-3.5 py-2 font-medium transition ${
                    isActive
                      ? 'border-primary/50 bg-primary/10 text-primary shadow-sm'
                      : 'border-transparent text-muted-foreground hover:border-primary/30 hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  {item.label}
                  {hasSubmenu ? <ChevronDown className="h-3.5 w-3.5" /> : null}
                </Link>

                {hasSubmenu ? (
                  <div className="invisible absolute left-0 top-full z-50 mt-2 min-w-60 translate-y-1 rounded-2xl border bg-background/96 p-2 opacity-0 shadow-2xl shadow-primary/10 backdrop-blur transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    {item.sections?.map((section) => (
                      <Link
                        key={section.href}
                        href={localizeHref(locale, section.href)}
                        className="block rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary focus:outline-none"
                      >
                        {section.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
