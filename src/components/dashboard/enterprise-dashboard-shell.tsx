'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Archive,
  Bell,
  Bot,
  ChevronDown,
  CircleGauge,
  CreditCard,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Menu,
  Newspaper,
  Puzzle,
  Radar,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCircle,
  Users,
  X,
} from 'lucide-react';

type EnterpriseDashboardShellProps = {
  children: React.ReactNode;
  locale: string;
  organizationName: string;
  role: string;
  selectedPlan?: string | null;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const copy = {
  en: {
    commandCenter: 'Command center',
    intelligence: 'AI & risk',
    governance: 'Evidence & governance',
    workspace: 'Workspace',
    overview: 'Overview',
    command: 'Control center',
    aiSystems: 'AI systems',
    tasks: 'Tasks',
    risks: 'Risks',
    evidence: 'Evidence vault',
    documents: 'Documents',
    reports: 'Reports',
    regulatory: 'Regulatory intelligence',
    team: 'Team & access',
    addOns: 'Add-ons',
    billing: 'Billing',
    settings: 'Organization settings',
    profile: 'Profile',
    notifications: 'Notifications',
    protected: 'Protected workspace',
    navigation: 'Enterprise dashboard navigation',
    mobileNavigation: 'Mobile dashboard navigation',
    menu: 'Open dashboard menu',
  },
  pt: {
    commandCenter: 'Centro de comando',
    intelligence: 'IA e risco',
    governance: 'Evidências e governança',
    workspace: 'Workspace',
    overview: 'Visão geral',
    command: 'Control center',
    aiSystems: 'Sistemas de IA',
    tasks: 'Tarefas',
    risks: 'Riscos',
    evidence: 'Evidence vault',
    documents: 'Documentos',
    reports: 'Relatórios',
    regulatory: 'Inteligência regulatória',
    team: 'Equipa e acessos',
    addOns: 'Add-ons',
    billing: 'Faturação',
    settings: 'Definições da organização',
    profile: 'Perfil',
    notifications: 'Notificações',
    protected: 'Workspace protegido',
    navigation: 'Navegação enterprise da dashboard',
    mobileNavigation: 'Navegação móvel da dashboard',
    menu: 'Abrir menu da dashboard',
  },
} as const;

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
  role,
  selectedPlan,
}: EnterpriseDashboardShellProps) {
  const pathname = usePathname();
  const text = locale === 'pt' ? copy.pt : copy.en;
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

  const navigation = (
    <nav aria-label={text.navigation} className="space-y-7">
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
                      ? 'border-white/12 bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.07)]'
                      : 'border-transparent text-white/55 hover:border-white/8 hover:bg-white/[0.055] hover:text-white'
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
    <div className="min-h-screen bg-[#050608] text-white selection:bg-white selection:text-black">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(49,97,255,0.13),transparent_28rem),radial-gradient(circle_at_90%_10%,rgba(16,185,129,0.07),transparent_24rem),linear-gradient(180deg,#050608_0%,#07090d_44%,#050608_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.11] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:42px_42px]" />

      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#07090d]/88 backdrop-blur-2xl">
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
            <Link href={localized(locale, '/notificacoes')} className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.025] text-white/55 transition hover:bg-white/[0.07] hover:text-white ${focusRing}`} aria-label={text.notifications}>
              <Bell className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href={localized(locale, '/profile')} className={`hidden h-10 items-center gap-2 rounded-xl border border-white/8 bg-white/[0.025] px-2.5 text-white/70 transition hover:bg-white/[0.07] hover:text-white sm:flex ${focusRing}`} aria-label={text.profile}>
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-[9px] font-black text-black">{initials(organizationName)}</span>
              <UserCircle className="h-4 w-4" aria-hidden="true" />
            </Link>

            <details className="group relative lg:hidden">
              <summary className={`flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-white/8 bg-white/[0.025] text-white/60 transition hover:bg-white/[0.07] hover:text-white [&::-webkit-details-marker]:hidden ${focusRing}`} aria-label={text.menu}>
                <Menu className="h-4 w-4 group-open:hidden" aria-hidden="true" />
                <X className="hidden h-4 w-4 group-open:block" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 top-12 z-50 w-[min(88vw,340px)] rounded-2xl border border-white/10 bg-[#090b10]/98 p-3 shadow-2xl shadow-black/50 backdrop-blur-2xl">
                <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                  <p className="truncate text-sm font-semibold">{organizationName}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35">{roleLabel}{planLabel ? ` · ${planLabel}` : ''}</p>
                </div>
                <div aria-label={text.mobileNavigation}>{navigation}</div>
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-[calc(100vh-72px)]">
        <aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-[268px] shrink-0 border-r border-white/8 bg-black/10 px-4 py-5 lg:block">
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
              {navigation}
            </div>
            <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.025] p-3">
              <div className="flex items-center gap-2 text-white/70">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-semibold">RISCK COMPLY</span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-white/32">AI governance, operational evidence and regulatory readiness in one workspace.</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="relative mx-auto w-full max-w-[1680px] p-3 sm:p-4 lg:p-6 xl:p-8">
            <div className="rounded-[24px] border border-white/[0.065] bg-[#090b0f]/78 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur-sm [&>main]:!min-h-0 [&>main]:!bg-transparent [&>main]:!overflow-visible">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
