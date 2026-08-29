import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const AI_SYSTEMS_PAGE = new URL('../../src/app/[locale]/ai-systems/page.tsx', import.meta.url);
const DASHBOARD_HOME_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/page.tsx', import.meta.url);
const DASHBOARD_LAYOUT = new URL('../../src/app/[locale]/dashboard/layout.tsx', import.meta.url);
const TASKS_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/tasks/page.tsx', import.meta.url);
const RISKS_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/risks/page.tsx', import.meta.url);
const DOCUMENTS_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/documents/page.tsx', import.meta.url);
const TEAM_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/team/page.tsx', import.meta.url);
const BILLING_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/billing/page.tsx', import.meta.url);
const BILLING_VIEW = new URL('../../src/app/[locale]/dashboard/organizations/billing/billing-page-view.tsx', import.meta.url);
const ORGANIZATION_SETTINGS = new URL('../../src/app/[locale]/settings/organization/page.tsx', import.meta.url);
const PROFILE_PAGE = new URL('../../src/app/[locale]/profile/page.tsx', import.meta.url);
const NOTIFICATIONS_PAGE = new URL('../../src/app/[locale]/notificacoes/page.tsx', import.meta.url);
const LEGACY_HOME_PAGE = new URL('../../src/app/[locale]/risck-comply-home/page.tsx', import.meta.url);
const SHELL = new URL('../../src/components/dashboard/enterprise-dashboard-shell.tsx', import.meta.url);
const EXECUTIVE_OVERVIEW = new URL('../../src/components/dashboard/enterprise-executive-overview-v2.tsx', import.meta.url);

describe('RISCK COMPLY enterprise UI V2 consistency', () => {
  it('uses the official brand assets and the canonical authenticated routes', async () => {
    const [layout, shell] = await Promise.all([readFile(DASHBOARD_LAYOUT, 'utf8'), readFile(SHELL, 'utf8')]);

    expect(layout).toContain("import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell'");
    expect(layout).toContain('<EnterpriseDashboardShell');
    expect(shell).toContain('/brand/risck-comply-wordmark.svg');
    expect(shell).toContain('RISCK COMPLY — Dashboard');
    expect(shell).not.toContain('>RC<');
    expect(shell).not.toContain("'RC'");
    expect(shell).toContain("event.key.toLowerCase() === 'k'");
    expect(shell).toContain('Search anything...');
    expect(shell).toContain("localized(locale, '/dashboard/fria')");
    expect(shell).toContain("localized(locale, '/dashboard/regulatory-control-tower')");
    expect(shell).toContain("localized(locale, '/dashboard/ai-literacy')");
    expect(shell).toContain("localized(locale, '/dashboard/evidence')");
    expect(shell).toContain("localized(locale, '/dashboard/organizations/reports-governance/news')");
  });

  it('uses cobalt/blue as brand emphasis while keeping semantic status colors', async () => {
    const shell = await readFile(SHELL, 'utf8');

    expect(shell).toContain('bg-blue-600');
    expect(shell).toContain('text-blue-400');
    expect(shell).toContain('focus-visible:ring-blue-400');
    expect(shell).toContain('bg-emerald-400');
    expect(shell).not.toContain('bg-emerald-300 text-[#06100d]');
  });

  it('renders the dashboard from real workspace data using decision-ready enterprise surfaces', async () => {
    const [home, overview] = await Promise.all([readFile(DASHBOARD_HOME_PAGE, 'utf8'), readFile(EXECUTIVE_OVERVIEW, 'utf8')]);

    expect(home).toContain("import { EnterpriseExecutiveOverviewV2 } from '@/components/dashboard/enterprise-executive-overview-v2'");
    expect(home).toContain('<EnterpriseExecutiveOverviewV2');
    expect(home).toContain('summary={data.summary}');
    expect(home).toContain('aiSystemSummary={data.aiSystemSummary}');
    expect(home).toContain('auditEvents={data.auditEvents}');
    expect(overview).toContain('AI Governance Overview');
    expect(overview).toContain('Risk distribution');
    expect(overview).toContain('Governance maturity');
    expect(overview).toContain('Review pipeline');
    expect(overview).toContain('Evidence readiness');
    expect(overview).toContain('High priority actions');
    expect(overview).toContain('<table');
    expect(overview).toContain('tabular-nums');
    expect(overview).toContain('not a legal compliance certification');
    expect(overview).not.toContain('conic-gradient');
  });

  it('preserves canonical application boundaries for core workflows and commercial surfaces', async () => {
    const [aiSystems, tasks, risks, documents, team, billingPage, billingView, settings, profile, notifications] = await Promise.all([
      readFile(AI_SYSTEMS_PAGE, 'utf8'),
      readFile(TASKS_PAGE, 'utf8'),
      readFile(RISKS_PAGE, 'utf8'),
      readFile(DOCUMENTS_PAGE, 'utf8'),
      readFile(TEAM_PAGE, 'utf8'),
      readFile(BILLING_PAGE, 'utf8'),
      readFile(BILLING_VIEW, 'utf8'),
      readFile(ORGANIZATION_SETTINGS, 'utf8'),
      readFile(PROFILE_PAGE, 'utf8'),
      readFile(NOTIFICATIONS_PAGE, 'utf8'),
    ]);

    expect(aiSystems).toContain("import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell'");
    for (const source of [tasks, risks, documents, team]) {
      expect(source).toContain('min-h-0 bg-transparent text-white');
      expect(source).not.toContain('tech-grid');
    }
    expect(billingPage).toContain('min-h-0 space-y-4 bg-transparent');
    expect(billingView).toContain('action="portal"');
    expect(billingView).toContain('action="checkout"');
    for (const source of [settings, profile, notifications]) {
      expect(source).toContain('EnterpriseDashboardShell');
      expect(source).toContain('selectedPlan={authority?.plan}');
    }
  });

  it('keeps the legacy authenticated home redirected to the canonical dashboard', async () => {
    const source = await readFile(LEGACY_HOME_PAGE, 'utf8');
    expect(source).not.toContain('getOrganizationDashboardData');
    expect(source).toContain('redirect(`/${locale}/dashboard/organizations`)');
  });
});
