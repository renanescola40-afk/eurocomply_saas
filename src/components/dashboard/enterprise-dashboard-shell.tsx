'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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

type NavItem = { label: string; href: string; icon: LucideIcon; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

type ShellCopy = {
  overviewGroup: string;
  governanceGroup: string;
  organizationGroup: string;
  overview: string;
  controlCenter: string;
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
  searchPlaceholder: string;
  searchLabel: string;
  noSearchResults: string;
  workspace: string;
  collapseSidebar: string;
  expandSidebar: string;
  openMenu: string;
  closeMenu: string;
};

const en: ShellCopy = {
  overviewGroup: 'Overview', governanceGroup: 'Governance', organizationGroup: 'Organization',
  overview: 'Overview', controlCenter: 'Control center', aiSystems: 'AI systems', fria: 'FRIA', tasks: 'Tasks & actions', risks: 'Risk & assessments', evidence: 'Evidence vault', documents: 'Documents', reports: 'Reports', controlTower: 'Regulatory control tower', regulatory: 'Regulatory intelligence', aiLiteracy: 'AI literacy', team: 'Team & access', addOns: 'Integrations', billing: 'Billing', settings: 'Settings', profile: 'Profile', notifications: 'Notifications', protected: 'Protected workspace', searchPlaceholder: 'Search anything...', searchLabel: 'Search dashboard', noSearchResults: 'No destination found.', workspace: 'Workspace', collapseSidebar: 'Collapse sidebar', expandSidebar: 'Expand sidebar', openMenu: 'Open navigation', closeMenu: 'Close navigation',
};

const pt: ShellCopy = {
  overviewGroup: 'Visão geral', governanceGroup: 'Governança', organizationGroup: 'Organização',
  overview: 'Visão geral', controlCenter: 'Centro de controlo', aiSystems: 'Sistemas de IA', fria: 'FRIA', tasks: 'Tarefas e ações', risks: 'Risco e avaliações', evidence: 'Cofre de evidências', documents: 'Documentos', reports: 'Relatórios', controlTower: 'Control tower regulatório', regulatory: 'Inteligência regulatória', aiLiteracy: 'Literacia em IA', team: 'Equipa e acessos', addOns: 'Integrações', billing: 'Faturação', settings: 'Definições', profile: 'Perfil', notifications: 'Notificações', protected: 'Workspace protegido', searchPlaceholder: 'Pesquisar...', searchLabel: 'Pesquisar na dashboard', noSearchResults: 'Nenhum destino encontrado.', workspace: 'Workspace', collapseSidebar: 'Recolher menu lateral', expandSidebar: 'Expandir menu lateral', openMenu: 'Abrir navegação', closeMenu: 'Fechar navegação',
};

const copy: Record<string, ShellCopy> = { en, pt, es: en, fr: en, it: en, de: en };

function localized(locale: string, path: string) {
  return `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
}

function compactLabel(value: string | null | undefined) {
  if (!value) return null;
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function itemIsActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function EnterpriseDashboardShell({ children, locale, organizationName, userDisplayName, role, selectedPlan }: EnterpriseDashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const text = copy[locale] ?? en;
  const root = localized(locale, '/dashboard/organizations');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const groups = useMemo<NavGroup[]>(() => [
    {
      label: text.overviewGroup,
      items: [
        { label: text.overview, href: root, icon: LayoutDashboard, exact: true },
        { label: text.controlCenter, href: localized(locale, '/dashboard/organizations/command-center'), icon: CircleGauge },
        { label: text.aiSystems, href: localized(locale, '/ai-systems'), icon: Bot },
        { label: text.risks, href: localized(locale, '/dashboard/organizations/risks'), icon: Radar },
        { label: text.fria, href: localized(locale, '/dashboard/fria'), icon: ClipboardCheck },
        { label: text.tasks, href: localized(locale, '/dashboard/organizations/tasks'), icon: FileCheck2 },
        { label: text.evidence, href: localized(locale, '/dashboard/evidence'), icon: Archive },
        { label: text.documents, href: localized(locale, '/dashboard/organizations/documents'), icon: FileText },
        { label: text.reports, href: localized(locale, '/dashboard/organizations/reports-governance'), icon: ShieldCheck },
      ],
    },
    {
      label: text.governanceGroup,
      items: [
        { label: text.controlTower, href: localized(locale, '/dashboard/regulatory-control-tower'), icon: Scale },
        { label: text.regulatory, href: localized(locale, '/dashboard/organizations/reports-governance/news'), icon: Newspaper },
        { label: text.aiLiteracy, href: localized(locale, '/dashboard/ai-literacy'), icon: GraduationCap },
      ],
    },
    {
      label: text.organizationGroup,
      items: [
        { label: text.team, href: localized(locale, '/dashboard/organizations/team'), icon: Users },
        { label: text.addOns, href: localized(locale, '/dashboard/organizations/add-ons'), icon: Puzzle },
        { label: text.billing, href: localized(locale, '/dashboard/organizations/billing'), icon: CreditCard },
        { label: text.settings, href: localized(locale, '/settings/organization'), icon: Settings },
      ],
    },
  ], [locale, root, text]);

  const flatItems = useMemo(() => groups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label }))), [groups]);
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase(locale);
    if (!query) return flatItems.slice(0, 8);
    return flatItems.filter((item) => `${item.label} ${item.group}`.toLocaleLowerCase(locale).includes(query)).slice(0, 8);
  }, [flatItems, locale, searchQuery]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        requestAnimationFrame(() => (window.innerWidth >= 1024 ? desktopSearchRef.current?.focus() : mobileSearchRef.current?.focus()));
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setIsMobileOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setIsMobileOpen(false);
  }, [pathname]);

  const openSearchResult = (href: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(href);
  };

  const roleLabel = compactLabel(role) ?? 'Member';
  const planLabel = compactLabel(selectedPlan);
  const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b12]';

  const renderNavigation = (mobile = false) => (
    <nav aria-label="Enterprise dashboard navigation" className="space-y-6">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          {(isExpanded || mobile) ? <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{group.label}</p> : <div className="mb-2 h-4" />}
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = itemIsActive(pathname, item.href, item.exact);
              return (
                <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} title={!isExpanded && !mobile ? item.label : undefined}
                  className={`group flex min-h-10 items-center rounded-lg border text-[13px] font-medium transition ${focus} ${(isExpanded || mobile) ? 'gap-3 px-3' : 'justify-center px-0'} ${active ? 'border-blue-400/20 bg-blue-500/[0.11] text-blue-100 shadow-[inset_3px_0_0_#3b82f6]' : 'border-transparent text-slate-400 hover:bg-white/[0.045] hover:text-slate-100'}`}>
                  <Icon className={`h-[17px] w-[17px] shrink-0 ${active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} aria-hidden="true" />
                  {(isExpanded || mobile) ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );

  const renderSearchResults = () => (
    <div className="space-y-1">
      {searchResults.length ? searchResults.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.href} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => openSearchResult(item.href)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[0.05] ${focus}`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-900 text-blue-400"><Icon className="h-4 w-4" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-100">{item.label}</span><span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.12em] text-slate-500">{item.group}</span></span>
          </button>
        );
      }) : <p className="px-3 py-5 text-sm text-slate-500">{text.noSearchResults}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 selection:bg-blue-500 selection:text-white print:bg-white print:text-black">
      {isMobileOpen ? <button type="button" aria-label={text.closeMenu} className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileOpen(false)} /> : null}

      <aside className={`fixed inset-y-0 left-0 z-[80] flex h-screen flex-col border-r border-slate-800/80 bg-[#080d15] transition-[width,transform] duration-200 print:hidden ${isExpanded ? 'lg:w-[268px]' : 'lg:w-[84px]'} ${isMobileOpen ? 'w-[286px] translate-x-0' : 'w-[286px] -translate-x-full lg:translate-x-0'}`}>
        <div className={`flex h-[72px] shrink-0 items-center border-b border-slate-800/80 ${isExpanded || isMobileOpen ? 'justify-between px-4' : 'justify-center px-3'}`}>
          <Link href={root} aria-label="RISCK COMPLY — Dashboard" className={`flex min-w-0 items-center ${focus}`}>
            <Image src="/brand/risck-comply-wordmark.svg" alt="RISCK COMPLY" width={190} height={42} priority className={`${isExpanded || isMobileOpen ? 'h-8 w-auto max-w-[178px]' : 'h-8 w-[48px] object-cover object-left'} object-contain`} />
          </Link>
          {isMobileOpen ? <button type="button" onClick={() => setIsMobileOpen(false)} aria-label={text.closeMenu} className={`flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white lg:hidden ${focus}`}><X className="h-4 w-4" /></button> : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{renderNavigation(isMobileOpen)}</div>

        <div className="shrink-0 border-t border-slate-800/80 p-3">
          <Link href={localized(locale, '/profile')} className={`flex min-h-12 items-center rounded-lg border border-slate-800/80 bg-slate-950/40 transition hover:border-slate-700 hover:bg-slate-900/70 ${focus} ${isExpanded || isMobileOpen ? 'gap-3 px-3 py-2' : 'justify-center px-0 py-2'}`}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-[10px] font-bold text-white">{initials(userDisplayName)}</span>
            {(isExpanded || isMobileOpen) ? <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-100">{userDisplayName}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{roleLabel}{planLabel ? ` · ${planLabel}` : ''}</span></span> : null}
          </Link>
        </div>
      </aside>

      <div className={`min-h-screen transition-[margin] duration-200 ${isExpanded ? 'lg:ml-[268px]' : 'lg:ml-[84px]'}`}>
        <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#090e17]/95 backdrop-blur-xl print:hidden">
          <div className="flex h-[72px] items-center gap-3 px-4 md:px-6 xl:px-8">
            <button type="button" onClick={() => setIsMobileOpen(true)} aria-label={text.openMenu} className={`flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white lg:hidden ${focus}`}><Menu className="h-4 w-4" /></button>
            <button type="button" onClick={() => setIsExpanded((value) => !value)} aria-label={isExpanded ? text.collapseSidebar : text.expandSidebar} className={`hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40 text-slate-500 hover:border-slate-700 hover:text-white lg:flex ${focus}`}>{isExpanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}</button>

            <div className="hidden min-w-0 xl:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">{text.workspace}</p>
              <p className="mt-0.5 max-w-[210px] truncate text-sm font-semibold text-slate-200">{organizationName}</p>
            </div>

            <div className="relative hidden min-w-0 flex-1 lg:block lg:max-w-[520px] xl:ml-4">
              <form role="search" onSubmit={(event) => { event.preventDefault(); if (searchResults[0]) openSearchResult(searchResults[0].href); }}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <input ref={desktopSearchRef} type="search" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} aria-label={text.searchLabel} placeholder={text.searchPlaceholder} className={`h-10 w-full rounded-lg border border-slate-800 bg-slate-950/50 py-2 pl-10 pr-14 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500/60 ${focus}`} />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">⌘K</span>
                </div>
              </form>
              {searchOpen ? <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] rounded-xl border border-slate-800 bg-[#0b111c] p-2 shadow-2xl shadow-black/50">{renderSearchResults()}</div> : null}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.055] px-3 py-2 text-[11px] font-medium text-emerald-300 md:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{text.protected}</div>
              <Link href={localized(locale, '/notificacoes')} aria-label={text.notifications} className={`flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40 text-slate-500 hover:border-slate-700 hover:text-white ${focus}`}><Bell className="h-4 w-4" /></Link>
              <Link href={localized(locale, '/profile')} aria-label={text.profile} className={`hidden h-10 items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 text-slate-300 hover:border-slate-700 sm:flex ${focus}`}><span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-[9px] font-bold text-white">{initials(userDisplayName)}</span><span className="hidden max-w-28 truncate text-xs font-semibold 2xl:block">{userDisplayName}</span><UserCircle className="h-4 w-4 text-slate-600" /></Link>
            </div>
          </div>

          <div className="border-t border-slate-800/60 px-4 py-2.5 lg:hidden">
            <button type="button" onClick={() => { setSearchOpen(true); requestAnimationFrame(() => mobileSearchRef.current?.focus()); }} className={`flex h-10 w-full items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 text-left text-sm text-slate-600 ${focus}`}><Search className="h-4 w-4" /><span className="truncate">{text.searchPlaceholder}</span><span className="ml-auto text-[10px]">⌘K</span></button>
          </div>
        </header>

        {searchOpen ? <div className="fixed inset-0 z-[95] bg-black/70 p-4 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true" aria-label={text.searchLabel}>
          <div className="mx-auto mt-16 max-w-lg rounded-xl border border-slate-800 bg-[#0b111c] p-3 shadow-2xl">
            <div className="flex items-center gap-2"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" /><input ref={mobileSearchRef} type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} aria-label={text.searchLabel} placeholder={text.searchPlaceholder} className={`h-11 w-full rounded-lg border border-slate-800 bg-slate-950/60 pl-10 pr-3 text-sm text-slate-200 placeholder:text-slate-600 ${focus}`} /></div><button type="button" onClick={() => setSearchOpen(false)} className={`flex h-11 w-11 items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-white ${focus}`}><X className="h-4 w-4" /></button></div>
            <div className="mt-3 max-h-[60vh] overflow-y-auto">{renderSearchResults()}</div>
          </div>
        </div> : null}

        <main className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.055),transparent_30rem)]">{children}</main>
      </div>
    </div>
  );
}
