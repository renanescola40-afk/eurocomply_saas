import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('enterprise product information architecture', () => {
  it('keeps the personal profile server-backed and free from tenant demo state', () => {
    const profilePage = read('src/app/[locale]/profile/page.tsx');

    expect(existsSync(join(root, 'src/app/[locale]/profile/profile-client.tsx'))).toBe(false);
    expect(profilePage).toContain('getCurrentUser');
    expect(profilePage).toContain('getCurrentOrganizationForUser');
    expect(profilePage).toContain("roleHasPermission(organization.role, 'manage_team')");
    expect(profilePage).toContain('canManageDashboardBilling(organization.role)');
    expect(profilePage).not.toMatch(/localStorage|sessionStorage|Simular|defaultCompany|initialEmployees|risck-comply-profile-demo/);
  });

  it('separates personal profile from organization, team, add-ons and billing administration', () => {
    const navigation = read('src/components/dashboard/dashboard-command-navigation.tsx');
    const profilePage = read('src/app/[locale]/profile/page.tsx');
    const organizationSettings = read('src/app/[locale]/settings/organization/page.tsx');

    expect(navigation).toContain("localizeHref(activeLocale, '/profile')");
    expect(navigation).toContain("href: '/settings/organization'");
    expect(navigation).toContain('href: `${dashboardRoot}/team`');
    expect(navigation).toContain('href: `${dashboardRoot}/add-ons`');
    expect(navigation).toContain('href: `${dashboardRoot}/billing`');

    expect(profilePage).toContain("localized('/settings/organization')");
    expect(profilePage).toContain("localized('/dashboard/organizations/team')");
    expect(profilePage).toContain("localized('/dashboard/organizations/billing')");
    expect(organizationSettings).toContain("roleHasPermission(organization.role, 'manage_settings')");
    expect(organizationSettings).toContain("roleHasPermission(organization.role, 'manage_team')");
    expect(organizationSettings).toContain('canManageDashboardBilling(organization.role)');
  });

  it('keeps primary product domains navigable as dedicated destinations', () => {
    const navigation = read('src/components/dashboard/dashboard-command-navigation.tsx');

    expect(navigation).toContain("href: '/ai-systems'");
    expect(navigation).toContain('href: `${dashboardRoot}/tasks`');
    expect(navigation).toContain('href: `${dashboardRoot}/risks`');
    expect(navigation).toContain('href: `${dashboardRoot}/documents`');
    expect(navigation).toContain('href: `${dashboardRoot}/reports-governance`');
    expect(navigation).toContain('href: `${dashboardRoot}/regulatory-control-tower`');
    expect(navigation).toContain('href: `${dashboardRoot}/reports-governance/news`');
  });

  it('uses one root enterprise dashboard shell instead of a nested legacy template', () => {
    const dashboardLayout = read('src/app/[locale]/dashboard/layout.tsx');
    const organizationLayout = read('src/app/[locale]/dashboard/organizations/layout.tsx');
    const shell = read('src/components/dashboard/enterprise-dashboard-shell.tsx');

    expect(dashboardLayout).toContain("import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell'");
    expect(dashboardLayout).toContain("import { requireLicensedCommercialPageAccess } from '@/server/security/commercial-access'");
    expect(dashboardLayout).not.toContain('getUserOrganizationMemberships');
    expect(dashboardLayout).not.toContain("@/server/queries/organizations");
    expect(dashboardLayout).not.toContain("@/server/queries/current-organization");
    expect(dashboardLayout).toContain('<EnterpriseDashboardShell');
    expect(dashboardLayout).toContain('organizationName={organization.name}');
    expect(dashboardLayout).toContain('userDisplayName={userDisplayName}');
    expect(dashboardLayout).toContain('role={organization.role}');
    expect(dashboardLayout).toContain('selectedPlan={authority.plan}');
    expect(dashboardLayout).toContain("commercialRouteClass === 'billing_recovery'");
    expect(dashboardLayout).toContain('requireLicensedCommercialPageAccess');
    expect(dashboardLayout).toContain('return runtimeChildren;');

    expect(organizationLayout).not.toContain('DashboardCommandNavigation');
    expect(organizationLayout).toContain("commercialRouteClass === 'billing_recovery'");
    expect(organizationLayout).toContain('getOrganizationDashboardRedirect(safeLocale)');
    expect(organizationLayout).toContain('return children;');

    expect(shell).toContain("localized(locale, '/dashboard/evidence')");
    expect(shell).toContain("localized(locale, '/dashboard/organizations/tasks')");
    expect(shell).toContain("localized(locale, '/dashboard/organizations/risks')");
    expect(shell).toContain("localized(locale, '/dashboard/organizations/regulatory-control-tower')");
    expect(shell).toContain("localized(locale, '/dashboard/organizations/billing')");
    expect(shell).toContain('fixed inset-y-0 left-0');
    expect(shell).toContain('Enterprise governance');
    expect(shell).toContain('aria-current={active ? \'page\' : undefined}');
    expect(shell).toContain('print:hidden');
    expect(shell).toContain('print:max-w-none print:p-0');
    expect(shell).toContain('es: {');
    expect(shell).toContain('fr: {');
    expect(shell).toContain('it: {');
    expect(shell).toContain('de: {');
    expect(shell).not.toContain('<main className=');
  });
});
