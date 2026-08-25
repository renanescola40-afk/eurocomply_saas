'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Puzzle,
  Radar,
  Scale,
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
};

const copy: Record<string, ShellCopy> = {
  en: {
    commandCenter: 'Command center', intelligence: 'AI & risk', governance: 'Evidence & governance', workspace: 'Workspace',
    overview: 'Overview', command: 'Control center', aiSystems: 'AI systems', fria: 'FRIA', tasks: 'Tasks', risks: 'Risks', evidence: 'Evidence vault', documents: 'Documents', reports: 'Reports', controlTower: 'Regulatory control tower', regulatory: 'EU AI Act intelligence', aiLiteracy: 'AI literacy', team: 'Team & access', addOns: 'Add-ons', billing: 'Billing', settings: 'Organization settings', profile: 'Profile', notifications: 'Notifications', protected: 'Protected', navigation: 'Enterprise dashboard navigation', mobileNavigation: 'Mobile dashboard navigation', menu: 'Open dashboard menu', workspaceLabel: 'Workspace',
  },
  pt: {
    commandCenter: 'Centro de comando', intelligence: 'IA e risco', governance: 'Evidências e governança', workspace: 'Workspace',
    overview: 'Visão geral', command: 'Control center', aiSystems: 'Sistemas de IA', fria: 'FRIA', tasks: 'Tarefas', risks: 'Riscos', evidence: 'Cofre de evidências', documents: 'Documentos', reports: 'Relatórios', controlTower: 'Control tower regulatório', regulatory: 'Inteligência EU AI Act', aiLiteracy: 'Literacia em IA', team: 'Equipa e acessos', addOns: 'Add-ons', billing: 'Faturação', settings: 'Definições da organização', profile: 'Perfil', notifications: 'Notificações', protected: 'Protegido', navigation: 'Navegação enterprise da dashboard', mobileNavigation: 'Navegação móvel da dashboard', menu: 'Abrir menu da dashboard', workspaceLabel: 'Workspace',
  },
  es: {
    commandCenter: 'Centro de mando', intelligence: 'IA y riesgo', governance: 'Evidencias y gobernanza', workspace: 'Workspace',
    overview: 'Resumen', command: 'Centro de control', aiSystems: 'Sistemas de IA', fria: 'FRIA', tasks: 'Tareas', risks: 'Riesgos', evidence: 'Bóveda de evidencias', documents: 'Documentos', reports: 'Informes', controlTower: 'Torre de control regulatoria', regulatory: 'Inteligencia EU AI Act', aiLiteracy: 'Alfabetización en IA', team: 'Equipo y accesos', addOns: 'Add-ons', billing: 'Facturación', settings: 'Configuración de organización', profile: 'Perfil', notifications: 'Notificaciones', protected: 'Protegido', navigation: 'Navegación enterprise del dashboard', mobileNavigation: 'Navegación móvil del dashboard', menu: 'Abrir menú del dashboard', workspaceLabel: 'Workspace',
  },
  fr: {
    commandCenter: 'Centre de commande', intelligence: 'IA et risques', governance: 'Preuves et gouvernance', workspace: 'Workspace',
    overview: 'Vue générale', command: 'Centre de contrôle', aiSystems: 'Systèmes IA', fria: 'FRIA', tasks: 'Tâches', risks: 'Risques', evidence: 'Coffre de preuves', documents: 'Documents', reports: 'Rapports', controlTower: 'Tour de contrôle réglementaire', regulatory: 'Intelligence EU AI Act', aiLiteracy: 'Culture IA', team: 'Équipe et accès', addOns: 'Modules', billing: 'Facturation', settings: 'Paramètres organisation', profile: 'Profil', notifications: 'Notifications', protected: 'Protégé', navigation: 'Navigation enterprise du dashboard', mobileNavigation: 'Navigation mobile du dashboard', menu: 'Ouvrir le menu du dashboard', workspaceLabel: 'Workspace',
  },
  it: {
    commandCenter: 'Centro di comando', intelligence: 'IA e rischio', governance: 'Evidenze e governance', workspace: 'Workspace',
    overview: 'Panoramica', command: 'Centro di controllo', aiSystems: 'Sistemi IA', fria: 'FRIA', tasks: 'Attività', risks: 'Rischi', evidence: 'Archivio evidenze', documents: 'Documenti', reports: 'Report', controlTower: 'Torre di controllo normativa', regulatory: 'Intelligence EU AI Act', aiLiteracy: 'AI literacy', team: 'Team e accessi', addOns: 'Add-on', billing: 'Fatturazione', settings: 'Impostazioni organizzazione', profile: 'Profilo', notifications: 'Notifiche', protected: 'Protetto', navigation: 'Navigazione enterprise della dashboard', mobileNavigation: 'Navigazione mobile della dashboard', menu: 'Apri menu dashboard', workspaceLabel: 'Workspace',
  },
  de: {
    commandCenter: 'Kommandozentrale', intelligence: 'KI und Risiko', governance: 'Nachweise und Governance', workspace: 'Workspace',
    overview: 'Übersicht', command: 'Kontrollzentrum', aiSystems: 'KI-Systeme', fria: 'FRIA', tasks: 'Aufgaben', risks: 'Risiken', evidence: 'Nachweis-Tresor', documents: 'Dokumente', reports: 'Berichte', controlTower: 'Regulatorischer Kontrollturm', regulatory: 'EU AI Act Intelligence', aiLiteracy: 'KI-Kompetenz', team: 'Team & Zugriff', addOns: 'Add-ons', billing: 'Abrechnung', settings: 'Organisationseinstellungen', profile: 'Profil', notifications: 'Benachrichtigungen', protected: 'Geschützt', navigation: 'Enterprise-Dashboard-Navigation', mobileNavigation: 'Mobile Dashboard-Navigation', menu: 'Dashboard-Menü öffnen', workspaceLabel: 'Workspace',
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
  const text = copy[locale] ?? copy.en;
  const root = localized(locale, '/dashboard/organizations');

  const groups: NavGroup[] = [
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
  ];

  const roleLabel = compactLabel(role) ?? 'Member';
  const planLabel = compactLabel(selectedPlan);
  const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07100e]';

  const renderRailNavigation = () => (
    <nav aria-label="Enterprise dashboard navigation" className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label} className="border-b border-white/[0.07] pb-4 last:border-b-0 last:pb-0">
          <div className="flex flex-col items-center gap-1.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = itemIsActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  title={item.label}
                  className={`group relative flex h-11 w-11 items-center justify-center rounded-xl border transition ${focusRing} ${
                    active
                      ? 'border-emerald-300/30 bg-emerald-300 text-[#06100d] shadow-[0_8px_28px_rgba(52,211,153,0.16)]'
                      : 'border-transparent text-white/45 hover:border-white/[0.08] hover:bg-white/[0.055] hover:text-white'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  <span className="pointer-events-none absolute left-[calc(100%+12px)] z-[70] hidden whitespace-nowrap rounded-lg border border-white/10 bg-[#111817] px-2.5 py-1.5 text-xs font-medium text-white shadow-xl group-hover:block group-focus-visible:block">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );

  const renderMobileNavigation = () => (
    <nav aria-label={text.mobileNavigation} className="space-y-5">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{group.label}</p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = itemIsActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${focusRing} ${
                    active ? 'bg-emerald-300 text-[#06100d]' : 'text-white/62 hover:bg-white/[0.055] hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
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
      <div className="flex min-h-screen">
        <aside className="sticky top-0 z-[60] hidden h-screen w-[88px] shrink-0 border-r border-white/[0.07] bg-[#07100e] lg:flex lg:flex-col print:!hidden">
          <div className="flex h-[72px] shrink-0 items-center justify-center border-b border-white/[0.07]">
            <Link
              href={root}
              aria-label="RISCK COMPLY — Dashboard"
              className={`flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300 text-[11px] font-black tracking-[-0.06em] text-[#06100d] ${focusRing}`}
            >
              RC
            </Link>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {renderRailNavigation()}
          </div>

          <div className="shrink-0 border-t border-white/[0.07] p-3">
            <Link
              href={localized(locale, '/profile')}
              aria-label={text.profile}
              title={userDisplayName}
              className={`group relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-xs font-bold text-white/75 transition hover:bg-white/[0.07] hover:text-white ${focusRing}`}
            >
              {initials(userDisplayName)}
              <span className="pointer-events-none absolute left-[calc(100%+12px)] z-[70] hidden whitespace-nowrap rounded-lg border border-white/10 bg-[#111817] px-2.5 py-1.5 text-xs font-medium text-white shadow-xl group-hover:block group-focus-visible:block">
                {userDisplayName}
              </span>
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0d1412]/96 backdrop-blur-xl print:hidden">
            <div className="flex h-[72px] items-center gap-3 px-4 md:px-6 xl:px-8">
              <details className="group relative lg:hidden">
                <summary className={`flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-white/65 transition hover:bg-white/[0.07] hover:text-white [&::-webkit-details-marker]:hidden ${focusRing}`} aria-label={text.menu}>
                  <Menu className="h-4 w-4 group-open:hidden" aria-hidden="true" />
                  <X className="hidden h-4 w-4 group-open:block" aria-hidden="true" />
                </summary>
                <div className="absolute left-0 top-12 z-[80] w-[min(88vw,340px)] rounded-2xl border border-white/10 bg-[#0a1110] p-3 shadow-2xl shadow-black/40">
                  <div className="mb-4 flex items-center gap-3 border-b border-white/[0.08] px-2 pb-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-300 text-[10px] font-black tracking-[-0.05em] text-[#06100d]">RC</span>
                    <div className="min-w-0">
                      <p className="text-xs font-black tracking-[0.12em] text-white">RISCK COMPLY</p>
                      <p className="mt-1 truncate text-xs text-white/42">{organizationName}</p>
                    </div>
                  </div>
                  {renderMobileNavigation()}
                </div>
              </details>

              <div className="flex min-w-0 items-center gap-3">
                <div className="hidden sm:block lg:hidden">
                  <p className="text-xs font-black tracking-[0.12em]">RISCK COMPLY</p>
                </div>
                <div className="hidden h-7 w-px bg-white/[0.08] sm:block lg:hidden" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/32">{text.workspaceLabel}</p>
                  <p className="mt-0.5 max-w-[220px] truncate text-sm font-semibold text-white/88 sm:max-w-[320px]">{organizationName}</p>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <div className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[11px] text-white/48 xl:flex">
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
                <Link href={localized(locale, '/profile')} className={`hidden h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-2.5 text-white/70 transition hover:bg-white/[0.07] hover:text-white sm:flex lg:hidden ${focusRing}`} aria-label={text.profile}>
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-300 text-[9px] font-black text-[#06100d]">{initials(userDisplayName)}</span>
                  <UserCircle className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </header>

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
    </div>
  );
}
