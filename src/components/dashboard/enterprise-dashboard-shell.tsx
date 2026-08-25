'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  Bell,
  Bot,
  CircleGauge,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Puzzle,
  Radar,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
  X,
} from 'lucide-react';

type EnterpriseDashboardShellProps = {
  children: ReactNode;
  locale: string;
  organizationName: string;
  userDisplayName: string;
  role: string;
  selectedPlan?: string | null;
};

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

type ShellCopy = {
  commandCenter: string;
  intelligence: string;
  governance: string;
  workspace: string;
  overview: string;
  command: string;
  aiSystems: string;
  fria: string;
  tasks: string;
  risks: string;
  evidence: string;
  documents: string;
  reports: string;
  controlTower: string;
  regulatory: string;
  aiLiteracy: string;
  team: string;
  addOns: string;
  billing: string;
  settings: string;
  profile: string;
  notifications: string;
  protected: string;
  navigation: string;
  mobileNavigation: string;
  menu: string;
  workspaceLabel: string;
  searchPlaceholder: string;
  searchLabel: string;
  noSearchResults: string;
  collapseSidebar: string;
  expandSidebar: string;
};

const copy: Record<string, ShellCopy> = {
  en: {
    commandCenter: 'Command center', intelligence: 'AI & risk', governance: 'Evidence & governance', workspace: 'Workspace',
    overview: 'Overview', command: 'Control center', aiSystems: 'AI systems', fria: 'FRIA', tasks: 'Tasks', risks: 'Risks', evidence: 'Evidence vault', documents: 'Documents', reports: 'Reports', controlTower: 'Regulatory control tower', regulatory: 'EU AI Act intelligence', aiLiteracy: 'AI literacy', team: 'Team & access', addOns: 'Add-ons', billing: 'Billing', settings: 'Organization settings', profile: 'Profile', notifications: 'Notifications', protected: 'Protected', navigation: 'Enterprise dashboard navigation', mobileNavigation: 'Mobile dashboard navigation', menu: 'Open dashboard menu', workspaceLabel: 'Workspace', searchPlaceholder: 'Search or type a command...', searchLabel: 'Search dashboard', noSearchResults: 'No dashboard destination found.', collapseSidebar: 'Collapse sidebar', expandSidebar: 'Expand sidebar',
  },
  pt: {
    commandCenter: 'Centro de comando', intelligence: 'IA e risco', governance: 'Evidências e governança', workspace: 'Workspace',
    overview: 'Visão geral', command: 'Control center', aiSystems: 'Sistemas de IA', fria: 'FRIA', tasks: 'Tarefas', risks: 'Riscos', evidence: 'Cofre de evidências', documents: 'Documentos', reports: 'Relatórios', controlTower: 'Control tower regulatório', regulatory: 'Inteligência EU AI Act', aiLiteracy: 'Literacia em IA', team: 'Equipa e acessos', addOns: 'Add-ons', billing: 'Faturação', settings: 'Definições da organização', profile: 'Perfil', notifications: 'Notificações', protected: 'Protegido', navigation: 'Navegação enterprise da dashboard', mobileNavigation: 'Navegação móvel da dashboard', menu: 'Abrir menu da dashboard', workspaceLabel: 'Workspace', searchPlaceholder: 'Pesquisar ou escrever um comando...', searchLabel: 'Pesquisar na dashboard', noSearchResults: 'Nenhum destino encontrado.', collapseSidebar: 'Recolher menu lateral', expandSidebar: 'Expandir menu lateral',
  },
  es: {
    commandCenter: 'Centro de mando', intelligence: 'IA y riesgo', governance: 'Evidencias y gobernanza', workspace: 'Workspace',
    overview: 'Resumen', command: 'Centro de control', aiSystems: 'Sistemas de IA', fria: 'FRIA', tasks: 'Tareas', risks: 'Riesgos', evidence: 'Bóveda de evidencias', documents: 'Documentos', reports: 'Informes', controlTower: 'Torre de control regulatoria', regulatory: 'Inteligencia EU AI Act', aiLiteracy: 'Alfabetización en IA', team: 'Equipo y accesos', addOns: 'Add-ons', billing: 'Facturación', settings: 'Configuración de organización', profile: 'Perfil', notifications: 'Notificaciones', protected: 'Protegido', navigation: 'Navegación enterprise del dashboard', mobileNavigation: 'Navegación móvil del dashboard', menu: 'Abrir menú del dashboard', workspaceLabel: 'Workspace', searchPlaceholder: 'Buscar o escribir un comando...', searchLabel: 'Buscar en el dashboard', noSearchResults: 'No se encontró ningún destino.', collapseSidebar: 'Contraer barra lateral', expandSidebar: 'Expandir barra lateral',
  },
  fr: {
    commandCenter: 'Centre de commande', intelligence: 'IA et risques', governance: 'Preuves et gouvernance', workspace: 'Workspace',
    overview: 'Vue générale', command: 'Centre de contrôle', aiSystems: 'Systèmes IA', fria: 'FRIA', tasks: 'Tâches', risks: 'Risques', evidence: 'Coffre de preuves', documents: 'Documents', reports: 'Rapports', controlTower: 'Tour de contrôle réglementaire', regulatory: 'Intelligence EU AI Act', aiLiteracy: 'Culture IA', team: 'Équipe et accès', addOns: 'Modules', billing: 'Facturation', settings: 'Paramètres organisation', profile: 'Profil', notifications: 'Notifications', protected: 'Protégé', navigation: 'Navigation enterprise du dashboard', mobileNavigation: 'Navigation mobile du dashboard', menu: 'Ouvrir le menu du dashboard', workspaceLabel: 'Workspace', searchPlaceholder: 'Rechercher ou saisir une commande...', searchLabel: 'Rechercher dans le dashboard', noSearchResults: 'Aucune destination trouvée.', collapseSidebar: 'Réduire la barre latérale', expandSidebar: 'Développer la barre latérale',
  },
  it: {
    commandCenter: 'Centro di comando', intelligence: 'IA e rischio', governance: 'Evidenze e governance', workspace: 'Workspace',
    overview: 'Panoramica', command: 'Centro di controllo', aiSystems: 'Sistemi IA', fria: 'FRIA', tasks: 'Attività', risks: 'Rischi', evidence: 'Archivio evidenze', documents: 'Documenti', reports: 'Report', controlTower: 'Torre di controllo normativa', regulatory: 'Intelligence EU AI Act', aiLiteracy: 'AI literacy', team: 'Team e accessi', addOns: 'Add-on', billing: 'Fatturazione', settings: 'Impostazioni organizzazione', profile: 'Profilo', notifications: 'Notifiche', protected: 'Protetto', navigation: 'Navigazione enterprise della dashboard', mobileNavigation: 'Navigazione mobile della dashboard', menu: 'Apri menu dashboard', workspaceLabel: 'Workspace', searchPlaceholder: 'Cerca o digita un comando...', searchLabel: 'Cerca nella dashboard', noSearchResults: 'Nessuna destinazione trovata.', collapseSidebar: 'Comprimi barra laterale', expandSidebar: 'Espandi barra laterale',
  },
  de: {
    commandCenter: 'Kommandozentrale', intelligence: 'KI und Risiko', governance: 'Nachweise und Governance', workspace: 'Workspace',
    overview: 'Übersicht', command: 'Kontrollzentrum', aiSystems: 'KI-Systeme', fria: 'FRIA', tasks: 'Aufgaben', risks: 'Risiken', evidence: 'Nachweis-Tresor', documents: 'Dokumente', reports: 'Berichte', controlTower: 'Regulatorischer Kontrollturm', regulatory: 'EU AI Act Intelligence', aiLiteracy: 'KI-Kompetenz', team: 'Team & Zugriff', addOns: 'Add-ons', billing: 'Abrechnung', settings: 'Organisationseinstellungen', profile: 'Profil', notifications: 'Benachrichtigungen', protected: 'Geschützt', navigation: 'Enterprise-Dashboard-Navigation', mobileNavigation: 'Mobile Dashboard-Navigation', menu: 'Dashboard-Menü öffnen', workspaceLabel: 'Workspace', searchPlaceholder: 'Suchen oder Befehl eingeben...', searchLabel: 'Dashboard durchsuchen', noSearchResults: 'Kein Ziel gefunden.', collapseSidebar: 'Seitenleiste einklappen', expandSidebar: 'Seitenleiste ausklappen',
  },
};

function localized(locale: string, path: string) {
  return `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
}

function compactLabel(value: string | null | undefined) {
  if (!value) return null;
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'RC';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function itemIsActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function EnterpriseDashboardShell({
  children,
  locale,
  organizationName,
  userDisplayName,
  role,
  selectedPlan,
}: EnterpriseDashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const text = copy[locale] ?? copy.en;
  const root = localized(locale, '/dashboard/organizations');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const groups: NavGroup[] = useMemo(() => [
    {
      label: text.commandCenter,
      items: [
        { label: text.overview, href: root, icon: LayoutDashboard, exact: true },
        { label: text.command, href: localized(locale, '/dashboard/organizations/command-center'), icon: CircleGauge },
      ],
    },
    {
      label: text.intelligence,
      items: [
        { label: text.aiSystems, href: localized(locale, '/ai-systems'), icon: Bot },
        { label: text.fria, href: localized(locale, '/dashboard/fria'), icon: ClipboardCheck },
        { label: text.tasks, href: localized(locale, '/dashboard/organizations/tasks'), icon: FileCheck2 },
        { label: text.risks, href: localized(locale, '/dashboard/organizations/risks'), icon: Radar },
      ],
    },
    {
      label: text.governance,
      items: [
        { label: text.evidence, href: localized(locale, '/dashboard/evidence'), icon: Archive },
        { label: text.documents, href: localized(locale, '/dashboard/organizations/documents'), icon: FileText },
        { label: text.reports, href: localized(locale, '/dashboard/organizations/reports-governance'), icon: ShieldCheck },
        { label: text.controlTower, href: localized(locale, '/dashboard/organizations/regulatory-control-tower'), icon: Scale },
        { label: text.regulatory, href: localized(locale, '/dashboard/organizations/reports-governance/news'), icon: Newspaper },
        { label: text.aiLiteracy, href: localized(locale, '/dashboard/organizations/ai-literacy'), icon: GraduationCap },
      ],
    },
    {
      label: text.workspace,
      items: [
        { label: text.team, href: localized(locale, '/dashboard/organizations/team'), icon: Users },
        { label: text.addOns, href: localized(locale, '/dashboard/organizations/add-ons'), icon: Puzzle },
        { label: text.billing, href: localized(locale, '/dashboard/organizations/billing'), icon: CreditCard },
        { label: text.settings, href: localized(locale, '/settings/organization'), icon: Settings },
      ],
    },
  ], [locale, root, text]);

  const flatItems = useMemo(
    () => groups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label }))),
    [groups],
  );

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase(locale);
    if (!query) return flatItems.slice(0, 7);
    return flatItems
      .filter((item) => `${item.label} ${item.group}`.toLocaleLowerCase(locale).includes(query))
      .slice(0, 7);
  }, [flatItems, locale, searchQuery]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        requestAnimationFrame(() => {
          if (window.innerWidth >= 1024) desktopSearchRef.current?.focus();
          else mobileSearchRef.current?.focus();
        });
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setIsMobileOpen(false);
        desktopSearchRef.current?.blur();
        mobileSearchRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
  }, [pathname]);

  const roleLabel = compactLabel(role) ?? 'Member';
  const planLabel = compactLabel(selectedPlan);
  const sidebarOpen = isExpanded || isHovered;
  const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07100e]';

  const openSearchResult = (href: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(href);
  };

  const renderNavigation = (mobile = false) => (
    <nav aria-label={mobile ? text.mobileNavigation : text.navigation} className="space-y-5">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <div className={`mb-2 flex h-5 items-center ${sidebarOpen || mobile ? 'justify-start px-3' : 'justify-center'}`}>
            {sidebarOpen || mobile ? (
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.17em] text-white/32">{group.label}</p>
            ) : (
              <span className="text-xs font-bold tracking-[0.18em] text-white/24" aria-hidden="true">•••</span>
            )}
          </div>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = itemIsActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={!sidebarOpen && !mobile ? item.label : undefined}
                  title={!sidebarOpen && !mobile ? item.label : undefined}
                  className={`group relative flex min-h-11 items-center rounded-xl border text-sm font-medium transition-colors duration-200 ${focusRing} ${
                    sidebarOpen || mobile ? 'gap-3 px-3' : 'justify-center px-0'
                  } ${
                    active
                      ? 'border-emerald-300/25 bg-emerald-300/[0.12] text-emerald-100'
                      : 'border-transparent text-white/55 hover:bg-white/[0.055] hover:text-white'
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-emerald-300' : 'text-white/45 group-hover:text-white/80'}`} aria-hidden="true" />
                  {sidebarOpen || mobile ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
                  {active && (sidebarOpen || mobile) ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" /> : null}
                  {!sidebarOpen && !mobile ? (
                    <span className="pointer-events-none absolute left-[calc(100%+12px)] z-[90] hidden whitespace-nowrap rounded-lg border border-white/10 bg-[#111817] px-2.5 py-1.5 text-xs font-medium text-white shadow-2xl group-hover:block group-focus-visible:block">
                      {item.label}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#0b100f] text-white selection:bg-emerald-300 selection:text-[#06100d] print:bg-white print:text-black">
      {isMobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation backdrop"
          className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-[2px] lg:hidden print:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-[80] flex h-screen flex-col border-r border-white/[0.07] bg-[#07100e] transition-all duration-300 ease-in-out print:!hidden ${
          sidebarOpen ? 'lg:w-[290px]' : 'lg:w-[90px]'
        } ${isMobileOpen ? 'w-[290px] translate-x-0' : 'w-[290px] -translate-x-full lg:translate-x-0'}`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`flex h-[72px] shrink-0 items-center border-b border-white/[0.07] ${sidebarOpen || isMobileOpen ? 'justify-between px-4' : 'justify-center px-0'}`}>
          <Link href={root} aria-label="RISCK COMPLY — Dashboard" className={`flex min-w-0 items-center gap-3 rounded-xl ${focusRing}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300 text-[11px] font-black tracking-[-0.06em] text-[#06100d]">RC</span>
            {sidebarOpen || isMobileOpen ? (
              <span className="min-w-0 leading-none">
                <span className="block truncate text-[12px] font-black tracking-[0.13em] text-white">RISCK COMPLY</span>
                <span className="mt-1.5 block truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30">Enterprise governance</span>
              </span>
            ) : null}
          </Link>
          {isMobileOpen ? (
            <button type="button" onClick={() => setIsMobileOpen(false)} className={`flex h-9 w-9 items-center justify-center rounded-lg text-white/55 hover:bg-white/[0.06] hover:text-white lg:hidden ${focusRing}`} aria-label={text.menu}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {renderNavigation(isMobileOpen)}
        </div>

        <div className="shrink-0 border-t border-white/[0.07] p-3">
          <Link
            href={localized(locale, '/profile')}
            aria-label={text.profile}
            className={`group flex min-h-12 items-center rounded-xl border border-white/[0.08] bg-white/[0.025] transition hover:bg-white/[0.055] ${focusRing} ${
              sidebarOpen || isMobileOpen ? 'gap-3 px-3 py-2' : 'justify-center px-0 py-2'
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-300 text-[10px] font-black text-[#06100d]">{initials(userDisplayName)}</span>
            {sidebarOpen || isMobileOpen ? (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-white/85">{userDisplayName}</span>
                <span className="mt-0.5 block truncate text-[10px] text-white/35">{roleLabel}{planLabel ? ` · ${planLabel}` : ''}</span>
              </span>
            ) : null}
          </Link>
        </div>
      </aside>

      <div className={`min-h-screen transition-[margin] duration-300 ease-in-out ${isExpanded ? 'lg:ml-[290px]' : 'lg:ml-[90px]'}`}>
        <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0d1412]/96 backdrop-blur-xl print:hidden">
          <div className="flex min-h-[72px] items-center gap-3 px-4 md:px-6 xl:px-8">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/60 transition hover:bg-white/[0.07] hover:text-white lg:hidden ${focusRing}`}
              aria-label={text.menu}
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsExpanded((value) => !value);
                setIsHovered(false);
              }}
              className={`hidden h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/55 transition hover:bg-white/[0.07] hover:text-white lg:flex ${focusRing}`}
              aria-label={isExpanded ? text.collapseSidebar : text.expandSidebar}
              title={isExpanded ? text.collapseSidebar : text.expandSidebar}
            >
              {isExpanded ? <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden="true" /> : <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden="true" />}
            </button>

            <div className="hidden min-w-0 lg:block xl:hidden">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/32">{text.workspaceLabel}</p>
              <p className="mt-0.5 max-w-[190px] truncate text-sm font-semibold text-white/88">{organizationName}</p>
            </div>

            <div className="relative hidden min-w-0 flex-1 lg:block xl:max-w-[430px]">
              <form
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (searchResults[0]) openSearchResult(searchResults[0].href);
                }}
              >
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/32" aria-hidden="true" />
                  <input
                    ref={desktopSearchRef}
                    type="search"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    aria-label={text.searchLabel}
                    aria-expanded={searchOpen}
                    aria-controls="dashboard-command-results"
                    placeholder={text.searchPlaceholder}
                    className={`h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] py-2.5 pl-11 pr-16 text-sm text-white/85 placeholder:text-white/30 transition focus:border-emerald-300/30 focus:bg-white/[0.04] ${focusRing}`}
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-[10px] font-semibold text-white/35">
                    <span>⌘</span><span>K</span>
                  </span>
                </div>
              </form>

              {searchOpen ? (
                <div id="dashboard-command-results" className="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0a1110] p-2 shadow-2xl shadow-black/45">
                  {searchResults.length ? (
                    <div className="space-y-1">
                      {searchResults.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.href}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => openSearchResult(item.href)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.055] ${focusRing}`}
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-emerald-300">
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-white/85">{item.label}</span>
                              <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.12em] text-white/30">{item.group}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="px-3 py-4 text-sm text-white/45">{text.noSearchResults}</p>
                  )}
                </div>
              ) : null}
            </div>

            <div className="ml-auto flex min-w-0 items-center gap-2">
              <div className="hidden min-w-0 xl:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/32">{text.workspaceLabel}</p>
                <p className="mt-0.5 max-w-[220px] truncate text-sm font-semibold text-white/88">{organizationName}</p>
              </div>
              <div className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[11px] text-white/48 2xl:flex">
                <span>{roleLabel}</span>
                {planLabel ? <><span className="h-1 w-1 rounded-full bg-white/25" /><span>{planLabel}</span></> : null}
              </div>
              <div className="hidden items-center gap-2 text-[11px] font-medium text-emerald-200/75 md:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {text.protected}
              </div>
              <Link href={localized(locale, '/notificacoes')} className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/55 transition hover:bg-white/[0.07] hover:text-white ${focusRing}`} aria-label={text.notifications}>
                <Bell className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href={localized(locale, '/profile')} className={`hidden h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-2.5 text-white/70 transition hover:bg-white/[0.07] hover:text-white sm:flex ${focusRing}`} aria-label={text.profile}>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-300 text-[9px] font-black text-[#06100d]">{initials(userDisplayName)}</span>
                <span className="hidden max-w-28 truncate text-xs font-semibold 2xl:block">{userDisplayName}</span>
                <UserCircle className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="border-t border-white/[0.05] px-4 py-3 lg:hidden">
            <button
              type="button"
              onClick={() => {
                setSearchOpen(true);
                requestAnimationFrame(() => mobileSearchRef.current?.focus());
              }}
              className={`flex h-10 w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-left text-sm text-white/35 ${focusRing}`}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="truncate">{text.searchPlaceholder}</span>
              <span className="ml-auto rounded-md border border-white/[0.08] px-1.5 py-0.5 text-[10px]">⌘K</span>
            </button>
          </div>
        </header>

        {searchOpen ? (
          <div className="fixed inset-0 z-[95] bg-black/60 p-4 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true" aria-label={text.searchLabel}>
            <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-white/[0.09] bg-[#0a1110] p-3 shadow-2xl">
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/32" aria-hidden="true" />
                  <input
                    ref={mobileSearchRef}
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    aria-label={text.searchLabel}
                    placeholder={text.searchPlaceholder}
                    className={`h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-3 text-sm text-white/85 placeholder:text-white/30 ${focusRing}`}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && searchResults[0]) openSearchResult(searchResults[0].href);
                    }}
                  />
                </div>
                <button type="button" onClick={() => setSearchOpen(false)} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] text-white/55 hover:bg-white/[0.055] hover:text-white ${focusRing}`} aria-label="Close search">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-3 max-h-[60vh] overflow-y-auto">
                {searchResults.length ? searchResults.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.href} type="button" onClick={() => openSearchResult(item.href)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/[0.055] ${focusRing}`}>
                      <Icon className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-sm text-white/82">{item.label}</span>
                      <span className="truncate text-[10px] uppercase tracking-[0.12em] text-white/28">{item.group}</span>
                    </button>
                  );
                }) : <p className="px-3 py-5 text-sm text-white/45">{text.noSearchResults}</p>}
              </div>
            </div>
          </div>
        ) : null}

        <div className="relative min-h-[calc(100vh-72px)] bg-[#0b100f] print:min-h-0 print:bg-white">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/18 to-transparent print:hidden" />
          <div className="mx-auto w-full max-w-[1680px] p-4 md:p-6 2xl:p-8 print:max-w-none print:p-0">
            <div className="min-w-0 [&>main]:!min-h-0 [&>main]:!overflow-visible print:block">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
