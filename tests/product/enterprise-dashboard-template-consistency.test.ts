import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const AI_SYSTEMS_PAGE = new URL('../../src/app/[locale]/ai-systems/page.tsx', import.meta.url);
const DASHBOARD_HOME_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/page.tsx', import.meta.url);
const DASHBOARD_LOADING = new URL('../../src/app/[locale]/dashboard/organizations/loading.tsx', import.meta.url);
const DASHBOARD_LAYOUT = new URL('../../src/app/[locale]/dashboard/layout.tsx', import.meta.url);
const COMMAND_CENTER_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/command-center/page.tsx', import.meta.url);
const TASKS_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/tasks/page.tsx', import.meta.url);
const RISKS_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/risks/page.tsx', import.meta.url);
const DOCUMENTS_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/documents/page.tsx', import.meta.url);
const DOCUMENTS_LOADING = new URL('../../src/app/[locale]/dashboard/organizations/documents/loading.tsx', import.meta.url);
const TEAM_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/team/page.tsx', import.meta.url);
const TEAM_SETTINGS = new URL('../../src/components/team/team-settings-section.tsx', import.meta.url);
const TEAM_MANAGEMENT = new URL('../../src/components/team/team-management-card.tsx', import.meta.url);
const BILLING_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/billing/page.tsx', import.meta.url);
const BILLING_VIEW = new URL('../../src/app/[locale]/dashboard/organizations/billing/billing-page-view.tsx', import.meta.url);
const BILLING_INTENT = new URL('../../src/app/[locale]/dashboard/organizations/billing/billing-plan-intent-banner.tsx', import.meta.url);
const ORGANIZATION_SETTINGS = new URL('../../src/app/[locale]/settings/organization/page.tsx', import.meta.url);
const PROFILE_PAGE = new URL('../../src/app/[locale]/profile/page.tsx', import.meta.url);
const PROFILE_CONTROLS = new URL('../../src/components/profile/profile-personal-controls.tsx', import.meta.url);
const NOTIFICATIONS_PAGE = new URL('../../src/app/[locale]/notificacoes/page.tsx', import.meta.url);
const NOTIFICATIONS_CLIENT = new URL('../../src/app/[locale]/notificacoes/notifications-client.tsx', import.meta.url);
const LEGACY_HOME_PAGE = new URL('../../src/app/[locale]/risck-comply-home/page.tsx', import.meta.url);
const SHELL = new URL('../../src/components/dashboard/enterprise-dashboard-shell.tsx', import.meta.url);
const COMMAND_CENTER = new URL('../../src/components/dashboard/enterprise-compliance-command-center.tsx', import.meta.url);
const NEXT_ACTIONS = new URL('../../src/components/dashboard/next-best-actions.tsx', import.meta.url);
const TIMELINE = new URL('../../src/components/dashboard/compliance-timeline.tsx', import.meta.url);
const ONBOARDING_PROGRESS = new URL('../../src/components/onboarding/onboarding-progress-card.tsx', import.meta.url);

describe('enterprise dashboard template consistency', () => {
  it('uses the TailAdmin-inspired enterprise shell with canonical authenticated routes', async () => {
    const [layout, shell] = await Promise.all([readFile(DASHBOARD_LAYOUT, 'utf8'), readFile(SHELL, 'utf8')]);

    expect(layout).toContain("import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell'");
    expect(layout).toContain('<EnterpriseDashboardShell');
    expect(shell).toContain('Enterprise dashboard navigation');
    expect(shell).toContain('RISCK COMPLY — Dashboard');
    expect(shell).toContain('sticky top-0');
    expect(shell).toContain("sidebarOpen ? 'lg:w-[290px]' : 'lg:w-[90px]'");
    expect(shell).toContain('transition-all duration-300 ease-in-out');
    expect(shell).toContain("event.key.toLowerCase() === 'k'");
    expect(shell).toContain('Search or type a command...');
    expect(shell).toContain("localized(locale, '/dashboard/fria')");
    expect(shell).toContain("localized(locale, '/dashboard/regulatory-control-tower')");
    expect(shell).toContain("localized(locale, '/dashboard/ai-literacy')");
    expect(shell).toContain("localized(locale, '/dashboard/evidence')");
    expect(shell).toContain("localized(locale, '/dashboard/organizations/reports-governance/news')");
    expect(shell).not.toContain("localized(locale, '/dashboard/organizations/regulatory-control-tower')");
    expect(shell).not.toContain("localized(locale, '/dashboard/organizations/ai-literacy')");
  });

  it('keeps canonical dashboard pages on the shared application canvas', async () => {
    const [home, commandCenter, dashboardLoading, documentsLoading] = await Promise.all([
      readFile(DASHBOARD_HOME_PAGE, 'utf8'),
      readFile(COMMAND_CENTER_PAGE, 'utf8'),
      readFile(DASHBOARD_LOADING, 'utf8'),
      readFile(DOCUMENTS_LOADING, 'utf8'),
    ]);

    expect(home).toContain('<main className="min-h-0 bg-transparent">');
    expect(home).not.toContain('tech-grid');
    expect(home).not.toContain('radial-gradient');
    expect(commandCenter).toContain('<main className="min-h-0 bg-transparent text-white">');
    expect(commandCenter).toContain('<CommandCenterPage');
    expect(commandCenter).not.toContain('max-w-7xl');
    expect(commandCenter).not.toContain('min-h-screen');

    for (const source of [dashboardLoading, documentsLoading]) {
      expect(source).toContain('min-h-0 bg-transparent text-white');
      expect(source).toContain('bg-[#101715]');
      expect(source).not.toContain('radial-gradient');
      expect(source).not.toContain('rounded-[2rem]');
    }
  });

  it('uses restrained operational surfaces for home and command center', async () => {
    const [commandCenter, nextActions, timeline, onboardingProgress] = await Promise.all([
      readFile(COMMAND_CENTER, 'utf8'),
      readFile(NEXT_ACTIONS, 'utf8'),
      readFile(TIMELINE, 'utf8'),
      readFile(ONBOARDING_PROGRESS, 'utf8'),
    ]);

    expect(commandCenter).toContain('rounded-xl border border-white/[0.075] bg-[#101715]');
    expect(commandCenter).toContain('Next best action');
    expect(commandCenter).not.toContain('premium-card');
    expect(commandCenter).not.toContain('Sparkles');
    expect(nextActions).toContain('divide-y divide-white/[0.055]');
    expect(timeline).toContain('Upcoming deadlines and reviews');
    expect(onboardingProgress).toContain('rounded-xl border-white/[0.075] bg-[#101715]');
  });

  it('keeps AI Systems and core workflow modules inside the enterprise language', async () => {
    const [aiSystems, tasks, risks, documents, team, teamSettings, teamManagement] = await Promise.all([
      readFile(AI_SYSTEMS_PAGE, 'utf8'),
      readFile(TASKS_PAGE, 'utf8'),
      readFile(RISKS_PAGE, 'utf8'),
      readFile(DOCUMENTS_PAGE, 'utf8'),
      readFile(TEAM_PAGE, 'utf8'),
      readFile(TEAM_SETTINGS, 'utf8'),
      readFile(TEAM_MANAGEMENT, 'utf8'),
    ]);

    expect(aiSystems).toContain("import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell'");
    expect(aiSystems).toContain('<main className="min-h-0 bg-transparent text-white">');
    expect(aiSystems).not.toContain('DashboardCommandNavigation');
    expect(aiSystems).not.toContain('radial-gradient');

    for (const source of [tasks, risks, documents, team]) {
      expect(source).toContain('min-h-0 bg-transparent text-white');
      expect(source).not.toContain('min-h-screen bg-[#050505]');
      expect(source).not.toContain('tech-grid');
      expect(source).not.toContain('radial-gradient');
    }

    expect(risks).toContain('divide-y divide-white/[0.055]');
    expect(risks).not.toContain("from '@/components/ui/card'");
    expect(documents).toContain('divide-y divide-white/[0.055]');
    expect(teamSettings).toContain('border-b border-white/[0.055]');
    expect(teamManagement).toContain('lg:divide-x lg:divide-white/[0.055]');
    expect(teamManagement).not.toContain("from '@/components/ui/card'");
  });

  it('keeps settings, profile, notifications and billing in the same enterprise chrome', async () => {
    const [settings, profile, controls, notificationsPage, notificationsClient, billingPage, billingView, billingIntent] = await Promise.all([
      readFile(ORGANIZATION_SETTINGS, 'utf8'),
      readFile(PROFILE_PAGE, 'utf8'),
      readFile(PROFILE_CONTROLS, 'utf8'),
      readFile(NOTIFICATIONS_PAGE, 'utf8'),
      readFile(NOTIFICATIONS_CLIENT, 'utf8'),
      readFile(BILLING_PAGE, 'utf8'),
      readFile(BILLING_VIEW, 'utf8'),
      readFile(BILLING_INTENT, 'utf8'),
    ]);

    for (const source of [settings, profile, notificationsPage]) {
      expect(source).toContain('EnterpriseDashboardShell');
      expect(source).toContain('selectedPlan={authority?.plan}');
      expect(source).not.toContain('DashboardCommandNavigation');
    }
    expect(controls).toContain('rounded-xl border border-white/[0.075] bg-[#101715]');
    expect(notificationsClient).toContain('divide-y divide-white/[0.055]');
    expect(notificationsClient).not.toContain('Sparkles');
    expect(billingPage).toContain('min-h-0 space-y-4 bg-transparent');
    expect(billingView).toContain('rounded-xl border border-white/[0.075] bg-[#101715]');
    expect(billingView).toContain('action="portal"');
    expect(billingView).toContain('action="checkout"');
    expect(billingView).not.toContain('premium-card');
    expect(billingView).not.toContain('cyan-');
    expect(billingIntent).toContain('border-emerald-300/15 bg-emerald-300/[0.045]');
  });

  it('retires the legacy authenticated home in favor of the canonical enterprise dashboard', async () => {
    const source = await readFile(LEGACY_HOME_PAGE, 'utf8');
    expect(source).not.toContain('DashboardCommandNavigation');
    expect(source).not.toContain('getOrganizationDashboardData');
    expect(source).toContain('redirect(`/${locale}/dashboard/organizations`)');
  });
});
