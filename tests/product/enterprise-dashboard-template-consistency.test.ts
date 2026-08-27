import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const AI_SYSTEMS_PAGE = new URL('../../src/app/[locale]/ai-systems/page.tsx', import.meta.url);
const DASHBOARD_HOME_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/page.tsx', import.meta.url);
const DASHBOARD_LAYOUT = new URL('../../src/app/[locale]/dashboard/layout.tsx', import.meta.url);
const TASKS_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/tasks/page.tsx', import.meta.url);
const RISKS_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/risks/page.tsx', import.meta.url);
const DOCUMENTS_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/documents/page.tsx', import.meta.url);
const TEAM_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/team/page.tsx', import.meta.url);
const TEAM_SETTINGS = new URL('../../src/components/team/team-settings-section.tsx', import.meta.url);
const TEAM_MANAGEMENT = new URL('../../src/components/team/team-management-card.tsx', import.meta.url);
const LEGACY_HOME_PAGE = new URL('../../src/app/[locale]/risck-comply-home/page.tsx', import.meta.url);
const SHELL = new URL('../../src/components/dashboard/enterprise-dashboard-shell.tsx', import.meta.url);
const COMMAND_CENTER = new URL('../../src/components/dashboard/enterprise-compliance-command-center.tsx', import.meta.url);
const NEXT_ACTIONS = new URL('../../src/components/dashboard/next-best-actions.tsx', import.meta.url);
const TIMELINE = new URL('../../src/components/dashboard/compliance-timeline.tsx', import.meta.url);
const ONBOARDING_PROGRESS = new URL('../../src/components/onboarding/onboarding-progress-card.tsx', import.meta.url);

describe('enterprise dashboard template consistency', () => {
  it('uses the TailAdmin-inspired enterprise shell as the authenticated dashboard chrome', async () => {
    const [layout, shell] = await Promise.all([
      readFile(DASHBOARD_LAYOUT, 'utf8'),
      readFile(SHELL, 'utf8'),
    ]);

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
    expect(shell).toContain("localized(locale, '/dashboard/organizations/ai-literacy')");
  });

  it('keeps the canonical dashboard overview on the clean application canvas', async () => {
    const source = await readFile(DASHBOARD_HOME_PAGE, 'utf8');

    expect(source).toContain('<main className="min-h-0 bg-transparent">');
    expect(source).toContain('border-emerald-300/15 bg-emerald-300/[0.055]');
    expect(source).not.toContain('tech-grid');
    expect(source).not.toContain('radial-gradient');
    expect(source).not.toContain('linear-gradient(180deg');
  });

  it('uses a restrained operations layout for the command center instead of the legacy premium-card composition', async () => {
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
    expect(nextActions).toContain('Next best actions');
    expect(nextActions).not.toContain('hover:-translate-y-0.5');

    expect(timeline).toContain('Upcoming deadlines and reviews');
    expect(timeline).toContain('lg:grid-cols-[130px_minmax(0,1fr)_180px_110px_36px]');
    expect(timeline).not.toContain('rounded-3xl');

    expect(onboardingProgress).toContain('rounded-xl border-white/[0.075] bg-[#101715]');
    expect(onboardingProgress).toContain('Operational setup progress');
  });

  it('keeps AI Systems inside the same shell and removes the legacy page-level gradient canvas', async () => {
    const source = await readFile(AI_SYSTEMS_PAGE, 'utf8');

    expect(source).toContain("import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell'");
    expect(source).not.toContain('DashboardCommandNavigation');
    expect(source).toContain('<EnterpriseDashboardShell');
    expect(source).toContain('organizationName={organization.name}');
    expect(source).toContain('role={organization.role}');
    expect(source).toContain('selectedPlan={authority?.plan}');
    expect(source).toContain('<main className="min-h-0 bg-transparent text-white">');
    expect(source).not.toContain('radial-gradient');
  });

  it('keeps core workflow modules on the shared enterprise canvas', async () => {
    const [tasks, risks, documents, team, teamSettings, teamManagement] = await Promise.all([
      readFile(TASKS_PAGE, 'utf8'),
      readFile(RISKS_PAGE, 'utf8'),
      readFile(DOCUMENTS_PAGE, 'utf8'),
      readFile(TEAM_PAGE, 'utf8'),
      readFile(TEAM_SETTINGS, 'utf8'),
      readFile(TEAM_MANAGEMENT, 'utf8'),
    ]);

    for (const source of [tasks, risks, documents, team]) {
      expect(source).toContain('min-h-0 bg-transparent text-white');
      expect(source).not.toContain('min-h-screen bg-[#050505]');
      expect(source).not.toContain('tech-grid');
      expect(source).not.toContain('radial-gradient');
    }

    expect(tasks).not.toContain('max-w-6xl');
    expect(risks).not.toContain('max-w-6xl');
    expect(documents).not.toContain('max-w-6xl');

    expect(risks).toContain('divide-y divide-white/[0.055]');
    expect(risks).toContain('rounded-xl border border-white/[0.075] bg-[#101715]');
    expect(risks).not.toContain("from '@/components/ui/card'");

    expect(documents).toContain('divide-y divide-white/[0.055]');
    expect(documents).toContain('rounded-xl border border-white/[0.075] bg-[#101715]');

    expect(team).toContain('rounded-xl border border-white/[0.075] bg-[#101715]');
    expect(team).not.toContain('shadow-2xl');
    expect(teamSettings).toContain('border-b border-white/[0.055]');
    expect(teamManagement).toContain('lg:divide-x lg:divide-white/[0.055]');
    expect(teamManagement).not.toContain("from '@/components/ui/card'");
  });

  it('retires the legacy authenticated home and forwards old bookmarks to the canonical enterprise dashboard', async () => {
    const source = await readFile(LEGACY_HOME_PAGE, 'utf8');

    expect(source).not.toContain('DashboardCommandNavigation');
    expect(source).not.toContain('getOrganizationDashboardData');
    expect(source).toContain('redirect(`/${locale}/dashboard/organizations`)');
  });
});
