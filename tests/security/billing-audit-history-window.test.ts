import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dashboardQuery = readFileSync('src/server/queries/organization-dashboard.ts', 'utf8');
const pricingPage = readFileSync('src/app/[locale]/pricing/page.tsx', 'utf8');

describe('billing audit-history visibility window', () => {
  it('derives the read window from durable organization billing authority', () => {
    expect(dashboardQuery).toContain('getOrganizationBillingAuthority(organizationId)');
    expect(dashboardQuery).toContain('if (!authority.licensed) return []');
    expect(dashboardQuery).toContain('getCatalogBillingEntitlements(authority.plan).auditLogsDays');
    expect(dashboardQuery).toContain(".gte('created_at', cutoff)");
  });

  it('preserves audit evidence instead of deleting old rows for plan enforcement', () => {
    const auditReadFunction = dashboardQuery.slice(
      dashboardQuery.indexOf('async function listDashboardAuditEvents'),
      dashboardQuery.indexOf('export async function getOrganizationDashboardData'),
    );
    expect(auditReadFunction).not.toContain(".delete()");
    expect(auditReadFunction).not.toContain(".update(");
  });

  it('keeps pricing audit-history copy backed by the same canonical catalog field', () => {
    expect(pricingPage).toContain('plan.limits.auditLogsDays');
    expect(pricingPage).toContain('auditHistoryLabel');
  });
});
