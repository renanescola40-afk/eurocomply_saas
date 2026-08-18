import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const AI_SYSTEMS_PAGE = new URL('../../src/app/[locale]/ai-systems/page.tsx', import.meta.url);
const DASHBOARD_LAYOUT = new URL('../../src/app/[locale]/dashboard/layout.tsx', import.meta.url);
const SHELL = new URL('../../src/components/dashboard/enterprise-dashboard-shell.tsx', import.meta.url);

describe('enterprise dashboard template consistency', () => {
  it('uses the enterprise shell as the authenticated dashboard chrome', async () => {
    const [layout, shell] = await Promise.all([
      readFile(DASHBOARD_LAYOUT, 'utf8'),
      readFile(SHELL, 'utf8'),
    ]);

    expect(layout).toContain("import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell'");
    expect(layout).toContain('<EnterpriseDashboardShell');
    expect(shell).toContain('Enterprise dashboard navigation');
    expect(shell).toContain('RISCK COMPLY — Dashboard');
    expect(shell).toContain('sticky top-[72px]');
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
});
