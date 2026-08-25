import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const AI_SYSTEMS_PAGE = new URL('../../src/app/[locale]/ai-systems/page.tsx', import.meta.url);
const DASHBOARD_LAYOUT = new URL('../../src/app/[locale]/dashboard/layout.tsx', import.meta.url);
const LEGACY_HOME_PAGE = new URL('../../src/app/[locale]/risck-comply-home/page.tsx', import.meta.url);
const SHELL = new URL('../../src/components/dashboard/enterprise-dashboard-shell.tsx', import.meta.url);

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

  it('keeps AI Systems inside the same enterprise shell instead of restoring the legacy navbar', async () => {
    const source = await readFile(AI_SYSTEMS_PAGE, 'utf8');

    expect(source).toContain("import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell'");
    expect(source).not.toContain('DashboardCommandNavigation');
    expect(source).toContain('<EnterpriseDashboardShell');
    expect(source).toContain('organizationName={organization.name}');
    expect(source).toContain('role={organization.role}');
    expect(source).toContain('selectedPlan={authority?.plan}');
  });

  it('retires the legacy authenticated home and forwards old bookmarks to the canonical enterprise dashboard', async () => {
    const source = await readFile(LEGACY_HOME_PAGE, 'utf8');

    expect(source).not.toContain('DashboardCommandNavigation');
    expect(source).not.toContain('getOrganizationDashboardData');
    expect(source).toContain('redirect(`/${locale}/dashboard/organizations`)');
  });
});
