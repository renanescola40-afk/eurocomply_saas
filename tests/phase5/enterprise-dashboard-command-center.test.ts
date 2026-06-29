import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('enterprise dashboard command center', () => {
  it('renders the enterprise cockpit from the authenticated organization dashboard page', () => {
    const page = read('src/app/[locale]/dashboard/organizations/page.tsx');

    expect(page).toContain('noStore()');
    expect(page).toContain("export const fetchCache = 'force-no-store'");
    expect(page).toContain('EnterpriseComplianceCommandCenter');
    expect(page).toContain('aiSystemSummary={data.aiSystemSummary}');
    expect(page).toContain('auditEvents={data.auditEvents}');
    expect(page).toContain('currentUserRole={data.currentUserRole}');
    expect(page).toContain('canManageWorkspace={data.canManageWorkspace}');
    expect(page).toContain('canManageBilling={data.canManageBilling}');
  });

  it('keeps dashboard data scoped to the active organization membership', () => {
    const query = read('src/server/queries/organization-dashboard.ts');

    expect(query).toContain('getCurrentOrganizationForUser');
    expect(query).toContain("eq('organization_id', organizationId)");
    expect(query).toContain("from('ai_systems')");
    expect(query).toContain("from('audit_logs')");
    expect(query).toContain('getDashboardAiSystemSummary(organization.id)');
    expect(query).toContain('listDashboardAuditEvents(organization.id)');
    expect(query).not.toContain('select(*)');
  });

  it('covers owner, admin, member and viewer permission states safely', () => {
    const query = read('src/server/queries/organization-dashboard.ts');
    const component = read('src/components/dashboard/enterprise-compliance-command-center.tsx');

    for (const role of ['owner', 'admin', 'member', 'viewer']) {
      expect(query).toContain(role);
      expect(component).toContain(role);
    }

    expect(query).toContain('canManageDashboard');
    expect(query).toContain('canManageDashboardBilling');
    expect(component).toContain('Permission states by role');
    expect(component).toContain('Read-only');
  });

  it('shows honest empty states instead of fake enterprise metrics', () => {
    const component = read('src/components/dashboard/enterprise-compliance-command-center.tsx');

    expect(component).toContain('No AI systems inventoried yet');
    expect(component).toContain('No score yet');
    expect(component).toContain('No audit events recorded yet');
    expect(component).toContain('No vendor reviews require attention right now');
    expect(component).not.toMatch(/lorem ipsum|placeholder|mockMetric|fakeMetric/i);
  });

  it('contains the requested executive dashboard sections', () => {
    const component = read('src/components/dashboard/enterprise-compliance-command-center.tsx');
    const requiredSections = [
      'Executive summary',
      'AI Act readiness score',
      'AI systems inventory summary',
      'Risk classification summary',
      'Evidence coverage',
      'Missing documents',
      'Open tasks',
      'High-risk alerts',
      'Recent audit events',
      'Vendor AI risk',
      'Compliance calendar',
      'Recommended next actions',
      'Plan limits',
    ];

    for (const section of requiredSections) {
      expect(component).toContain(section);
    }
  });
});
