import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Phase 5 dashboard invariants', () => {
  it('keeps root traffic redirected to the default localized entrypoint', () => {
    const content = read('src/app/page.tsx');

    expect(content).toContain('redirect');
    expect(content).toContain("'/pt'");
  });

  it('routes authenticated localized users to the organization dashboard', () => {
    const content = read('src/app/[locale]/page.tsx');

    expect(content).toContain('getCurrentUser');
    expect(content).toContain('dashboard/organizations');
    expect(content).toContain('EnterpriseHome');
  });

  it('keeps organization dashboard auth and onboarding routing in place', () => {
    const content = read('src/app/[locale]/dashboard/organizations/page.tsx');

    expect(content).toContain('getCurrentUser');
    expect(content).toContain('redirect(`/${safeLocale}/login`)');
    expect(content).toContain('getOrganizationDashboardData');
    expect(content).toContain('redirect(`/${safeLocale}/onboarding');
  });

  it('keeps dashboard data scoped by organization id', () => {
    const content = read('src/server/queries/organization-dashboard.ts');

    expect(content).toContain('getCurrentOrganizationForUser');
    expect(content).toContain('organization.id');
    expect(content).toContain("eq('organization_id', organizationId)");
    expect(content).toContain("from('compliance_tasks')");
    expect(content).toContain("from('risks')");
    expect(content).toContain("from('vendors')");
    expect(content).toContain("from('documents')");
  });

  it('keeps current organization resolution scoped to user membership', () => {
    const content = read('src/server/queries/current-organization.ts');

    expect(content).toContain("from('organization_members')");
    expect(content).toContain("eq('user_id', userId)");
    expect(content).toContain('getCurrentOrganizationForUser');
    expect(content).toContain('membership.slug === slug');
  });
});
