import Link from 'next/link';
import { Bell, ChevronDown, Menu, UserCircle, X } from 'lucide-react';

import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { locales, type Locale } from '@/lib/i18n/routing';

const dashboardRoot = '/dashboard/organizations';

type MenuLink = {
  label: string;
  href: string;
  description?: string;
};

type MenuItem = MenuLink & {
  aliases?: string[];
  sections?: MenuLink[];
};

type NavigationCopy = {
  overview: string;
  aiSystems: string;
  operations: string;
  governance: string;
  regulatory: string;
  workspace: string;
  profile: string;
  notifications: string;
  tasks: string;
  risks: string;
  evidence: string;
  approvals: string;
  vendors: string;
  reports: string;
  auditPack: string;
  raci: string;
  auditLog: string;
  controlTower: string;
  news: string;
  legalCalendar: string;
  aiLiteracy: string;
  organization: string;
  team: string;
  addOns: string;
  billing: string;
  mainNavigation: string;
  mobileNavigation: string;
  openMenu: string;
};

const navigationCopy: Record<Locale, NavigationCopy> = {
  en: {
    overview: 'Overview', aiSystems: 'AI Systems', operations: 'Operations', governance: 'Governance', regulatory: 'Regulatory', workspace: 'Workspace', profile: 'Profile', notifications: 'Notifications', tasks: 'Tasks', risks: 'Risks', evidence: 'Evidence', approvals: 'Approvals', vendors: 'Vendors', reports: 'Reports', auditPack: 'Evidence Pack', raci: 'RACI', auditLog: 'Audit Log', controlTower: 'Control Tower', news: 'EU AI Act Intelligence', legalCalendar: 'Regulatory Calendar', aiLiteracy: 'AI Literacy', organization: 'Organization settings', team: 'Team & access', addOns: 'Add-ons', billing: 'Billing', mainNavigation: 'Main product navigation', mobileNavigation: 'Mobile product navigation', openMenu: 'Open navigation menu',
  },
  pt: {
    overview: 'Visão geral', aiSystems: 'Sistemas de IA', operations: 'Operações', governance: 'Governança', regulatory: 'Regulatório', workspace: 'Workspace', profile: 'Perfil', notifications: 'Notificações', tasks: 'Tarefas', risks: 'Riscos', evidence: 'Evidências', approvals: 'Aprovações', vendors: 'Fornecedores', reports: 'Relatórios', auditPack: 'Pacote de Evidências', raci: 'RACI', auditLog: 'Log de Auditoria', controlTower: 'Control Tower', news: 'Inteligência EU AI Act', legalCalendar: 'Calendário Regulatório', aiLiteracy: 'Literacia em IA', organization: 'Definições da organização', team: 'Equipa e acessos', addOns: 'Add-ons', billing: 'Faturação', mainNavigation: 'Navegação principal do produto', mobileNavigation: 'Navegação móvel do produto', openMenu: 'Abrir menu de navegação',
  },
  es: {
    overview: 'Resumen', aiSystems: 'Sistemas de IA', operations: 'Operaciones', governance: 'Gobernanza', regulatory: 'Regulación', workspace: 'Workspace', profile: 'Perfil', notifications: 'Notificaciones', tasks: 'Tareas', risks: 'Riesgos', evidence: 'Evidencias', approvals: 'Aprobaciones', vendors: 'Proveedores', reports: 'Informes', auditPack: 'Paquete de Evidencias', raci: 'RACI', auditLog: 'Registro de Auditoría', controlTower: 'Control Tower', news: 'Inteligencia EU AI Act', legalCalendar: 'Calendario Regulatorio', aiLiteracy: 'Alfabetización en IA', organization: 'Configuración de organización', team: 'Equipo y accesos', addOns: 'Add-ons', billing: 'Facturación', mainNavigation: 'Navegación principal del producto', mobileNavigation: 'Navegación móvil del producto', openMenu: 'Abrir menú de navegación',
  },
  fr: {
    overview: 'Vue générale', aiSystems: 'Systèmes IA', operations: 'Opérations', governance: 'Gouvernance', regulatory: 'Réglementaire', workspace: 'Workspace', profile: 'Profil', notifications: 'Notifications', tasks: 'Tâches', risks: 'Risques', evidence: 'Preuves', approvals: 'Approbations', vendors: 'Fournisseurs', reports: 'Rapports', auditPack: 'Pack de Preuves', raci: 'RACI', auditLog: 'Journal d’Audit', controlTower: 'Control Tower', news: 'Intelligence EU AI Act', legalCalendar: 'Calendrier Réglementaire', aiLiteracy: 'Culture IA', organization: 'Paramètres organisation', team: 'Équipe et accès', addOns: 'Modules', billing: 'Facturation', mainNavigation: 'Navigation principale du produit', mobileNavigation: 'Navigation mobile du produit', openMenu: 'Ouvrir le menu de navigation',
  },
  it: {
    overview: 'Panoramica', aiSystems: 'Sistemi IA', operations: 'Operazioni', governance: 'Governance', regulatory: 'Normativa', workspace: 'Workspace', profile: 'Profilo', notifications: 'Notifiche', tasks: 'Attività', risks: 'Rischi', evidence: 'Evidenze', approvals: 'Approvazioni', vendors: 'Fornitori', reports: 'Report', auditPack: 'Pacchetto Evidenze', raci: 'RACI', auditLog: 'Registro Audit', controlTower: 'Control Tower', news: 'Intelligence EU AI Act', legalCalendar: 'Calendario Normativo', aiLiteracy: 'AI Literacy', organization: 'Impostazioni organizzazione', team: 'Team e accessi', addOns: 'Add-on', billing: 'Fatturazione', mainNavigation: 'Navigazione principale del prodotto', mobileNavigation: 'Navigazione mobile del prodotto', openMenu: 'Apri menu di navigazione',
  },
  de: {
    overview: 'Übersicht', aiSystems: 'KI-Systeme', operations: 'Vorgänge', governance: 'Governance', regulatory: 'Regulatorik', workspace: 'Workspace', profile: 'Profil', notifications: 'Benachrichtigungen', tasks: 'Aufgaben', risks: 'Risiken', evidence: 'Nachweise', approvals: 'Freigaben', vendors: 'Anbieter', reports: 'Berichte', auditPack: 'Evidence Pack', raci: 'RACI', auditLog: 'Audit-Protokoll', controlTower: 'Control Tower', news: 'EU AI Act Intelligence', legalCalendar: 'Regulatorischer Kalender', aiLiteracy: 'KI-Kompetenz', organization: 'Organisationseinstellungen', team: 'Team & Zugriff', addOns: 'Add-ons', billing: 'Abrechnung', mainNavigation: 'Hauptnavigation des Produkts', mobileNavigation: 'Mobile Produktnavigation', openMenu: 'Navigationsmenü öffnen',
  },
};

function buildNavigation(copy: NavigationCopy): MenuItem[] {
  return [
    {
      label: copy.overview,
      href: dashboardRoot,
      aliases: ['RISCK COMPLY', 'Command Center'],
      description: 'Organization command center',
    },
    {
      label: copy.aiSystems,
      href: '/ai-systems',
      aliases: ['AI Governance'],
      description: 'AI inventory and governance',
    },
    {
      label: copy.operations,
      href: `${dashboardRoot}/tasks`,
      sections: [
        { label: copy.tasks, href: `${dashboardRoot}/tasks`, description: 'Execution backlog and ownership' },
        { label: copy.risks, href: `${dashboardRoot}/risks`, description: 'Risk register and mitigations' },
        { label: copy.evidence, href: `${dashboardRoot}/documents`, description: 'Controlled evidence and documents' },
        { label: copy.approvals, href: '/aprovacoes', description: 'Approval workflows' },
        { label: copy.vendors, href: `${dashboardRoot}/vendors`, description: 'Third-party governance' },
      ],
    },
    {
      label: copy.governance,
      href: `${dashboardRoot}/reports-governance`,
      sections: [
        { label: copy.reports, href: `${dashboardRoot}/reports-governance`, description: 'Executive and governance outputs' },
        { label: copy.auditPack, href: '/audit-pack', description: 'Structured audit evidence package' },
        { label: copy.raci, href: '/raci', description: 'Ownership and accountability matrix' },
        { label: copy.auditLog, href: '/auditoria', description: 'Recorded governance activity' },
      ],
    },
    {
      label: copy.regulatory,
      href: `${dashboardRoot}/regulatory-control-tower`,
      sections: [
        { label: copy.controlTower, href: `${dashboardRoot}/regulatory-control-tower`, description: 'Regulatory readiness and deadlines' },
        { label: copy.news, href: `${dashboardRoot}/reports-governance/news`, description: 'Sourced European AI regulation updates' },
        { label: copy.legalCalendar, href: '/calendario-compliance', description: 'Upcoming obligations and dates' },
        { label: copy.aiLiteracy, href: `${dashboardRoot}/ai-literacy`, description: 'Article 4 training evidence' },
      ],
    },
    {
      label: copy.workspace,
      href: '/settings/organization',
      sections: [
        { label: copy.organization, href: '/settings/organization', description: 'Workspace identity and access context' },
        { label: copy.team, href: `${dashboardRoot}/team`, description: 'Members, roles and invitations' },
        { label: copy.addOns, href: `${dashboardRoot}/add-ons`, description: 'Included and available capabilities' },
        { label: copy.billing, href: `${dashboardRoot}/billing`, description: 'Subscription and payment administration' },
      ],
    },
  ];
}

// Kept as an exported canonical map for route-contract tests and other product tooling.
export const dashboardNavigation: MenuItem[] = buildNavigation(navigationCopy.en);

type DashboardCommandNavigationProps = {
  locale: string;
  activePage?: string;
};

function localizeHref(locale: string, href: string) {
  return `/${locale}${href.startsWith('/') ? href : `/${href}`}`;
}

function isActiveNavigationItem(item: MenuItem, activePage: string) {
  return item.label === activePage || item.aliases?.includes(activePage) === true;
}

export function DashboardCommandNavigation({ locale, activePage = 'RISCK COMPLY' }: DashboardCommandNavigationProps) {
  const activeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const copy = navigationCopy[activeLocale];
  const navigation = buildNavigation(copy);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/92 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/78">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 md:px-6 xl:px-8">
        <input id="risck-comply-mobile-menu" type="checkbox" className="peer sr-only" aria-hidden="true" />

        <Link
          href={localizeHref(activeLocale, dashboardRoot)}
          className="group flex shrink-0 items-center gap-2 rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary/70"
          aria-label="RISCK COMPLY — Overview"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-black tracking-[-0.08em] text-black shadow-sm transition group-hover:-translate-y-0.5">RC</span>
          <span className="hidden text-sm font-bold tracking-[0.08em] text-foreground lg:inline">RISCK COMPLY</span>
        </Link>

        <nav aria-label={copy.mainNavigation} className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
          {navigation.map((item) => {
            const isActive = isActiveNavigationItem(item, activePage);
            const hasSubmenu = Boolean(item.sections?.length);

            return (
              <div key={item.label} className="group relative shrink-0">
                <Link
                  href={localizeHref(activeLocale, item.href)}
                  className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  {item.label}
                  {hasSubmenu ? <ChevronDown className="h-3.5 w-3.5 transition group-hover:rotate-180" /> : null}
                </Link>

                {hasSubmenu ? (
                  <div className="invisible absolute left-0 top-full z-50 mt-2 w-80 translate-y-2 rounded-2xl border border-white/10 bg-background/98 p-2 opacity-0 shadow-2xl shadow-black/30 backdrop-blur-xl transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    {item.sections?.map((section) => (
                      <Link
                        key={section.href + section.label}
                        href={localizeHref(activeLocale, section.href)}
                        className="block rounded-xl px-3 py-2.5 transition hover:bg-primary/10 focus:bg-primary/10 focus:outline-none"
                      >
                        <span className="block text-sm font-medium text-foreground">{section.label}</span>
                        {section.description ? <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{section.description}</span> : null}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-1 lg:flex">
          <Link
            href={localizeHref(activeLocale, '/notificacoes')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/70"
            aria-label={copy.notifications}
          >
            <Bell className="h-4 w-4" />
          </Link>
          <Link
            href={localizeHref(activeLocale, '/profile')}
            className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition ${activePage === 'Perfil' || activePage === 'Profile' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <UserCircle className="h-4 w-4" />
            <span className="hidden xl:inline">{copy.profile}</span>
          </Link>
          <LanguageSwitcher currentLocale={activeLocale} compact />
        </div>

        <label
          htmlFor="risck-comply-mobile-menu"
          className="ml-auto inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border bg-background text-muted-foreground transition hover:bg-muted lg:hidden"
          aria-label={copy.openMenu}
        >
          <Menu className="h-5 w-5 peer-checked:hidden" />
          <X className="hidden h-5 w-5 peer-checked:block" />
        </label>
      </div>

      <div className="hidden max-h-[calc(100vh-4rem)] overflow-y-auto border-t bg-background/98 px-4 py-4 shadow-xl peer-checked:block lg:hidden">
        <div className="mb-4 flex items-center justify-between gap-3">
          <LanguageSwitcher currentLocale={activeLocale} compact />
          <div className="flex items-center gap-1">
            <Link href={localizeHref(activeLocale, '/notificacoes')} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground" aria-label={copy.notifications}><Bell className="h-4 w-4" /></Link>
            <Link href={localizeHref(activeLocale, '/profile')} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground" aria-label={copy.profile}><UserCircle className="h-4 w-4" /></Link>
          </div>
        </div>
        <nav className="space-y-2" aria-label={copy.mobileNavigation}>
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
