import Link from 'next/link';
import { Bell, ChevronDown, Menu, Newspaper, X } from 'lucide-react';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { getLocalizedDashboardNavigation } from '@/components/dashboard/dashboard-navigation-i18n';
import { getAppDictionary } from '@/lib/i18n/app-dictionary';
import { locales, type Locale } from '@/lib/i18n/routing';

const dashboardRoot = '/dashboard/organizations';

type MenuLink = {
  label: string;
  href: string;
  description?: string;
};

type MenuItem = MenuLink & {
  sections?: MenuLink[];
};

export const dashboardNavigation: MenuItem[] = [
  {
    label: 'RISCK COMPLY',
    href: '/risck-comply-home',
    description: 'Home pós-login para clientes pagantes',
  },
  {
    label: 'Command Center',
    href: `${dashboardRoot}/command-center`,
    sections: [
      { label: 'Dashboard Executivo', href: `${dashboardRoot}/command-center`, description: 'Cockpit executivo completo' },
      { label: 'Log de Auditoria', href: '/auditoria', description: 'Quem fez o quê, quando e porquê' },
      { label: 'Calendário Legal', href: '/calendario-compliance', description: 'Prazos e obrigações regulatórias' },
    ],
  },
  {
    label: 'AI Governance',
    href: '/ai-systems',
    sections: [
      { label: 'Inventário de Sistemas de IA', href: '/ai-systems', description: 'Classificação AI Act e obrigações iniciais' },
    ],
  },
  {
    label: 'Evidence & Risk',
    href: `${dashboardRoot}/evidence-risk`,
    sections: [
      { label: 'Documentos Controlados', href: `${dashboardRoot}/documents`, description: 'Políticas, atas, certificados e versões' },
      { label: 'Matriz de Riscos', href: `${dashboardRoot}/risks`, description: 'Risk register com plano de ação' },
      { label: 'Matriz RACI', href: '/raci', description: 'Responsável, aprovador, consultado e informado' },
    ],
  },
  {
    label: 'Reports & Governance',
    href: `${dashboardRoot}/reports-governance`,
    sections: [
      { label: 'Relatórios Compliance', href: `${dashboardRoot}/reports-governance`, description: 'Board reports e audit packs' },
      { label: 'Notícias Europeias', href: `${dashboardRoot}/reports-governance/news`, description: 'Atualizações regulatórias com IA' },
      { label: 'Aprovações', href: '/aprovacoes', description: 'Workflow de aprovação documental' },
      { label: 'Atas e Governança', href: `${dashboardRoot}/reports-governance`, description: 'Decisões e registros executivos' },
    ],
  },
  {
    label: 'Perfil',
    href: '/profile',
    sections: [
      { label: 'Meus Dados', href: '/profile#company-data', description: 'Dados da empresa e operações fiscais' },
      { label: 'Plano', href: '/profile#plan', description: 'Benefícios e upgrade' },
      { label: 'Add-ons & Créditos', href: `${dashboardRoot}/add-ons`, description: 'Veja o que está ativo, incluído ou disponível para comprar' },
      { label: 'Funcionários', href: '/profile#employees', description: 'Convites Enterprise' },
      { label: 'Avatar Enterprise', href: '/profile#enterprise-status', description: 'Status visual premium' },
    ],
  },
  {
    label: 'Notificações',
    href: '/notificacoes',
    description: 'Feed premium de atividades',
  },
  {
    label: 'Notícias',
    href: `${dashboardRoot}/reports-governance/news`,
    description: 'Notícias europeias de compliance',
  },
];

type DashboardCommandNavigationProps = {
  locale: string;
  activePage?: string;
};

function localizeHref(locale: string, href: string) {
  return `/${locale}${href.startsWith('/') ? href : `/${href}`}`;
}

function isActiveNavigationItem(item: MenuItem, activePage: string) {
  return (
    item.label === activePage ||
    (activePage === 'AI Governance' && item.href === '/ai-systems') ||
    dashboardNavigation.some((legacyItem) => legacyItem.label === activePage && legacyItem.href === item.href)
  );
}

function applyBrandNavigation(item: MenuItem): MenuItem {
  if (item.href === '/eurocomply-home') {
    return { ...item, label: 'RISCK COMPLY', href: '/risck-comply-home' };
  }

  return item;
}

export function DashboardCommandNavigation({ locale, activePage = 'RISCK COMPLY' }: DashboardCommandNavigationProps) {
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const navigation = getLocalizedDashboardNavigation(activeLocale).map(applyBrandNavigation);
  const navCopy = getAppDictionary(activeLocale).nav;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/92 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/78">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-8">
        <input id="risck-comply-mobile-menu" type="checkbox" className="peer sr-only" aria-hidden="true" />

        <Link
          href={localizeHref(activeLocale, '/risck-comply-home')}
          className="shrink-0 rounded-full bg-black px-4 py-2 text-sm font-semibold tracking-tight text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          RISCK COMPLY
        </Link>

        <nav aria-label={navCopy.mainNavigation} className="hidden w-full items-center gap-2 whitespace-nowrap text-sm md:flex md:overflow-visible">
          {navigation.filter((item) => item.href !== '/risck-comply-home').map((item) => {
            const isActive = isActiveNavigationItem(item, activePage);
            const hasSubmenu = Boolean(item.sections?.length);

            return (
              <div key={item.label} className="group relative shrink-0">
                <Link
                  href={localizeHref(activeLocale, item.href)}
                  className={`flex items-center gap-1 rounded-full border px-3.5 py-2 font-medium transition ${
                    isActive
                      ? 'border-primary/50 bg-primary/10 text-primary shadow-sm'
                      : 'border-transparent text-muted-foreground hover:border-primary/30 hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  {item.href === '/notificacoes' ? <Bell className="h-3.5 w-3.5" /> : null}
                  {item.href === `${dashboardRoot}/reports-governance/news` && !item.sections?.length ? <Newspaper className="h-3.5 w-3.5" /> : null}
                  {item.label}
                  {hasSubmenu ? <ChevronDown className="h-3.5 w-3.5 transition group-hover:rotate-180" /> : null}
                </Link>

                {hasSubmenu ? (
                  <div className="invisible absolute left-0 top-full z-50 mt-2 min-w-72 translate-y-2 rounded-2xl border bg-background/98 p-2 opacity-0 shadow-2xl shadow-primary/10 backdrop-blur transition duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    {item.sections?.map((section) => (
                      <Link
                        key={section.href + section.label}
                        href={localizeHref(activeLocale, section.href)}
                        className="block rounded-xl px-3 py-2.5 transition hover:bg-primary/10 focus:bg-primary/10 focus:outline-none"
                      >
                        <span className="block text-sm font-medium text-foreground">{section.label}</span>
                        {section.description ? <span className="mt-0.5 block text-xs text-muted-foreground">{section.description}</span> : null}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="ml-auto hidden md:block">
          <LanguageSwitcher currentLocale={activeLocale} compact />
        </div>

        <label
          htmlFor="risck-comply-mobile-menu"
          className="ml-auto inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border bg-background text-muted-foreground transition hover:bg-muted md:hidden"
          aria-label={navCopy.openMenu}
        >
          <Menu className="h-5 w-5 peer-checked:hidden" />
          <X className="hidden h-5 w-5 peer-checked:block" />
        </label>
      </div>

      <div className="hidden border-t bg-background/98 px-4 py-3 shadow-lg peer-checked:block md:hidden">
        <div className="mb-3">
          <LanguageSwitcher currentLocale={activeLocale} compact />
        </div>
        <nav className="space-y-2" aria-label={navCopy.mobileNavigation}>
          {navigation.map((item) => (
            <details key={item.label} className="group rounded-2xl border bg-muted/20 p-2 open:bg-muted/40">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2 font-medium">
                <Link href={localizeHref(activeLocale, item.href)}>{item.label}</Link>
                {item.sections?.length ? <ChevronDown className="h-4 w-4 transition group-open:rotate-180" /> : null}
              </summary>
              {item.sections?.length ? (
                <div className="mt-1 space-y-1 border-t pt-2">
                  {item.sections.map((section) => (
                    <Link key={section.href + section.label} href={localizeHref(activeLocale, section.href)} className="block rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary">
                      {section.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </details>
          ))}
        </nav>
      </div>
    </header>
  );
}
