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
  CreditCard,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Menu,
  Newspaper,
  Puzzle,
  Radar,
  Scale,
  Settings,
  ShieldCheck,
  Sparkles,
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
  tasks: string;
  risks: string;
  evidence: string;
  documents: string;
  reports: string;
  controlTower: string;
  regulatory: string;
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
  tagline: string;
};

const copy: Record<string, ShellCopy> = {
  en: {
    commandCenter: 'Command center', intelligence: 'AI & risk', governance: 'Evidence & governance', workspace: 'Workspace',
    overview: 'Overview', command: 'Control center', aiSystems: 'AI systems', tasks: 'Tasks', risks: 'Risks', evidence: 'Evidence vault', documents: 'Documents', reports: 'Reports', controlTower: 'Regulatory control tower', regulatory: 'EU AI Act intelligence', team: 'Team & access', addOns: 'Add-ons', billing: 'Billing', settings: 'Organization settings', profile: 'Profile', notifications: 'Notifications', protected: 'Protected workspace', navigation: 'Enterprise dashboard navigation', mobileNavigation: 'Mobile dashboard navigation', menu: 'Open dashboard menu', tagline: 'AI governance, operational evidence and regulatory readiness in one workspace.',
  },
  pt: {
    commandCenter: 'Centro de comando', intelligence: 'IA e risco', governance: 'Evidências e governança', workspace: 'Workspace',
    overview: 'Visão geral', command: 'Control center', aiSystems: 'Sistemas de IA', tasks: 'Tarefas', risks: 'Riscos', evidence: 'Cofre de evidências', documents: 'Documentos', reports: 'Relatórios', controlTower: 'Control tower regulatório', regulatory: 'Inteligência EU AI Act', team: 'Equipa e acessos', addOns: 'Add-ons', billing: 'Faturação', settings: 'Definições da organização', profile: 'Perfil', notifications: 'Notificações', protected: 'Workspace protegido', navigation: 'Navegação enterprise da dashboard', mobileNavigation: 'Navegação móvel da dashboard', menu: 'Abrir menu da dashboard', tagline: 'Governança de IA, evidência operacional e prontidão regulatória num único workspace.',
  },
  es: {
    commandCenter: 'Centro de mando', intelligence: 'IA y riesgo', governance: 'Evidencias y gobernanza', workspace: 'Workspace',
    overview: 'Resumen', command: 'Centro de control', aiSystems: 'Sistemas de IA', tasks: 'Tareas', risks: 'Riesgos', evidence: 'Bóveda de evidencias', documents: 'Documentos', reports: 'Informes', controlTower: 'Torre de control regulatoria', regulatory: 'Inteligencia EU AI Act', team: 'Equipo y accesos', addOns: 'Add-ons', billing: 'Facturación', settings: 'Configuración de organización', profile: 'Perfil', notifications: 'Notificaciones', protected: 'Workspace protegido', navigation: 'Navegación enterprise del dashboard', mobileNavigation: 'Navegación móvil del dashboard', menu: 'Abrir menú del dashboard', tagline: 'Gobernanza de IA, evidencia operativa y preparación regulatoria en un único workspace.',
  },
  fr: {
    commandCenter: 'Centre de commande', intelligence: 'IA et risques', governance: 'Preuves et gouvernance', workspace: 'Workspace',
    overview: 'Vue générale', command: 'Centre de contrôle', aiSystems: 'Systèmes IA', tasks: 'Tâches', risks: 'Risques', evidence: 'Coffre de preuves', documents: 'Documents', reports: 'Rapports', controlTower: 'Tour de contrôle réglementaire', regulatory: 'Intelligence EU AI Act', team: 'Équipe et accès', addOns: 'Modules', billing: 'Facturation', settings: 'Paramètres organisation', profile: 'Profil', notifications: 'Notifications', protected: 'Workspace protégé', navigation: 'Navigation enterprise du dashboard', mobileNavigation: 'Navigation mobile du dashboard', menu: 'Ouvrir le menu du dashboard', tagline: 'Gouvernance de l’IA, preuves opérationnelles et préparation réglementaire dans un seul workspace.',
  },
  it: {
    commandCenter: 'Centro di comando', intelligence: 'IA e rischio', governance: 'Evidenze e governance', workspace: 'Workspace',
    overview: 'Panoramica', command: 'Centro di controllo', aiSystems: 'Sistemi IA', tasks: 'Attività', risks: 'Rischi', evidence: 'Archivio evidenze', documents: 'Documenti', reports: 'Report', controlTower: 'Torre di controllo normativa', regulatory: 'Intelligence EU AI Act', team: 'Team e accessi', addOns: 'Add-on', billing: 'Fatturazione', settings: 'Impostazioni organizzazione', profile: 'Profilo', notifications: 'Notifiche', protected: 'Workspace protetto', navigation: 'Navigazione enterprise della dashboard', mobileNavigation: 'Navigazione mobile della dashboard', menu: 'Apri menu dashboard', tagline: 'Governance IA, evidenze operative e readiness normativa in un unico workspace.',
  },
  de: {
    commandCenter: 'Kommandozentrale', intelligence: 'KI und Risiko', governance: 'Nachweise und Governance', workspace: 'Workspace',
    overview: 'Übersicht', command: 'Kontrollzentrum', aiSystems: 'KI-Systeme', tasks: 'Aufgaben', risks: 'Risiken', evidence: 'Nachweis-Tresor', documents: 'Dokumente', reports: 'Berichte', controlTower: 'Regulatorischer Kontrollturm', regulatory: 'EU AI Act Intelligence', team: 'Team & Zugriff', addOns: 'Add-ons', billing: 'Abrechnung', settings: 'Organisationseinstellungen', profile: 'Profil', notifications: 'Benachrichtigungen', protected: 'Geschützter Workspace', navigation: 'Enterprise-Dashboard-Navigation', mobileNavigation: 'Mobile Dashboard-Navigation', menu: 'Dashboard-Menü öffnen', tagline: 'KI-Governance, operative Nachweise und regulatorische Bereitschaft in einem Workspace.',
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
  const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090d]';

  const renderNavigation = (label: string) => (
    <nav aria-label={label} className="space-y-7">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">{group.label}</p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = itemIsActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${focusRing} ${
                    active
                      ? 'border-white/[0.12] bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.07)]'
                      : 'border-transparent text-white/55 hover:border-white/[0.08] hover:bg-white/[0.055] hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-black' : 'text-white/45 group-hover:text-white/80'}`} aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                  {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-black/70" aria-hidden="true" /> : null}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#050608] text-white selection:bg-white selection:text-black print:min-h-0 print:bg-white print:text-black">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(49,97,255,0.13),transparent_28rem),radial-gradient(circle_at_90%_10%,rgba(16,185,129,0.07),transparent_24rem),linear-gradient(180deg,#050608_0%,#07090d_44%,#050608_100%)] print:hidden" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.11] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:42px_42px] print:hidden" />

      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#07090d]/88 backdrop-blur-2xl print:hidden">
        <div className="flex h-[72px] items-center gap-3 px-4 sm:px-5 lg:px-6">
          <Link href={root} className={`flex shrink-0 items-center gap-3 rounded-xl ${focusRing}`} aria-label="RISCK COMPLY — Dashboard">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[11px] font-black tracking-[-0.08em] text-black shadow-[0_6px_24px_rgba(255,255,255,0.12)]">RC</span>
            <span className="hidden leading-none sm:block">
              <span className="block text-[13px] font-black tracking-[0.14em]">RISCK COMPLY</span>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.22em] text-white/32">Enterprise AI Governance</span>
            </span>
          </Link>

          <div className="mx-1 hidden h-7 w-px bg-white/10 lg:block" />

          <div className="hidden min-w-0 items-center gap-3 lg:flex">
            <div className="min-w-0">
              <p className="max-w-[220px] truncate text-sm font-semibold text-white/88">{organizationName}</p>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-white/32">
                <span>{roleLabel}</span>
                {planLabel ? <><span className="h-1 w-1 rounded-full bg-white/25" /><span>{planLabel}</span></> : null}
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100/70 xl:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              {text.protected}
            </div>
            <Link href={localized(locale, '/notificacoes')} className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/55 transition hover:bg-white/[0.07] hover:text-white ${focusRing}`} aria-label={text.notifications}>
              <Bell className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href={localized(locale, '/profile')} className={`hidden h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-2.5 text-white/70 transition hover:bg-white/[0.07] hover:text-white sm:flex ${focusRing}`} aria-label={text.profile}>
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-[9px] font-black text-black">{initials(userDisplayName)}</span>
              <span className="hidden max-w-28 truncate text-xs font-semibold xl:block">{userDisplayName}</span>
              <UserCircle className="h-4 w-4" aria-hidden="true" />
            </Link>

            <details className="group relative lg:hidden">
              <summary className={`flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/60 transition hover:bg-white/[0.07] hover:text-white [&::-webkit-details-marker]:hidden ${focusRing}`} aria-label={text.menu}>
                <Menu className="h-4 w-4 group-open:hidden" aria-hidden="true" />
                <X className="hidden h-4 w-4 group-open:block" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 top-12 z-50 w-[min(88vw,340px)] rounded-2xl border border-white/10 bg-[#090b10]/98 p-3 shadow-2xl shadow-black/50 backdrop-blur-2xl">
                <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <p className="truncate text-sm font-semibold">{organizationName}</p>
                  <p className="mt-1 truncate text-xs text-white/50">{userDisplayName}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35">{roleLabel}{planLabel ? ` · ${planLabel}` : ''}</p>
                </div>
                {renderNavigation(text.mobileNavigation)}
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-[calc(100vh-72px)] print:block print:min-h-0">
        <aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-[268px] shrink-0 border-r border-white/[0.08] bg-black/10 px-4 py-5 lg:block print:!hidden">
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
              {renderNavigation(text.navigation)}
            </div>
            <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
              <div className="flex items-center gap-2 text-white/70">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-semibold">RISCK COMPLY</span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-white/32">{text.tagline}</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 print:block print:w-full">
          <div className="relative mx-auto w-full max-w-[1680px] p-3 sm:p-4 lg:p-6 xl:p-8 print:max-w-none print:p-0">
            <div className="rounded-[24px] border border-white/[0.065] bg-[#090b0f]/78 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur-sm [&>main]:!min-h-0 [&>main]:!bg-transparent [&>main]:!overflow-visible print:rounded-none print:border-0 print:bg-transparent print:shadow-none print:backdrop-blur-none">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
