import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DASHBOARD_QUERY_FILE = 'src/server/queries/dashboard.ts';
const ORGANIZATION_DASHBOARD_FILE = 'src/server/queries/organization-dashboard.ts';

const dashboardSource = readFileSync(DASHBOARD_QUERY_FILE, 'utf8');
const organizationDashboardSource = readFileSync(ORGANIZATION_DASHBOARD_FILE, 'utf8');

function sourceBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  expect(startIndex, start).toBeGreaterThanOrEqual(0);
  expect(endIndex, end).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

describe('dashboard data integrity fails closed', () => {
  it('requires the privileged client instead of fabricating an empty dashboard', () => {
    expect(dashboardSource).toContain("import { createAdminClient } from '@/lib/supabase/admin';");
    expect(organizationDashboardSource).toContain("import { createAdminClient } from '@/lib/supabase/admin';");
    expect(dashboardSource).not.toContain('tryCreateAdminClient');
    expect(organizationDashboardSource).not.toContain('tryCreateAdminClient');
    expect(organizationDashboardSource).not.toContain('getEmptyDashboardSummary');
  });

  it('does not convert summary count failures into zero compliance signals', () => {
    const safeCount = sourceBetween(dashboardSource, 'function safeCount', 'function areDashboardSnapshotsEnabled');

    expect(safeCount).toContain("code: result.error.code ?? 'unknown'");
    expect(safeCount).toContain("throw new Error('Unable to load dashboard summary.');");
    expect(safeCount).not.toContain('return 0;');
  });

  it('does not convert preview or AI inventory failures into valid empty sections', () => {
    const expectedFailures = [
      "throw new Error('Unable to load dashboard tasks.');",
      "throw new Error('Unable to load dashboard risks.');",
      "throw new Error('Unable to load dashboard vendors.');",
      "throw new Error('Unable to load dashboard documents.');",
      "throw new Error('Unable to load dashboard AI systems.');",
      "throw new Error('Unable to load dashboard audit events.');",
    ];

    for (const expectedFailure of expectedFailures) {
      expect(organizationDashboardSource).toContain(expectedFailure);
    }

    expect(organizationDashboardSource).not.toContain('previewResult.error ? []');
  });

  it('rejects timeouts and provider failures instead of resolving fallback values', () => {
    const timeoutBoundary = sourceBetween(
      organizationDashboardSource,
      'async function withDashboardTimeout',
      'async function listDashboardTasks',
    );

    expect(timeoutBoundary).toContain('new Promise<never>');
    expect(timeoutBoundary).toContain("reject(new Error('Dashboard query timed out.'));");
    expect(timeoutBoundary).toContain("throw new Error('Unable to load dashboard data.');");
    expect(timeoutBoundary).not.toContain('resolve(fallback)');
    expect(timeoutBoundary).not.toContain('return fallback;');
  });

  it('does not substitute essential-plan entitlements or empty data in the aggregate loader', () => {
    const aggregateLoader = organizationDashboardSource.slice(
      organizationDashboardSource.indexOf('export async function getOrganizationDashboardData'),
    );

    expect(organizationDashboardSource).not.toContain('getPlanEntitlements');
    expect(aggregateLoader).not.toContain('fallbackEntitlements');
    expect(aggregateLoader).not.toContain("withDashboardTimeout('summary', getDashboardSummary(organization.id),");
    expect(aggregateLoader).toMatch(
      /withDashboardTimeout\(\s*'entitlements',\s*getOrganizationEntitlements\(organization\.id\),\s*2_500,?\s*\)/,
    );
  });

  it('keeps legitimate successful zero-row results while surfacing query failures', () => {
    expect(dashboardSource).toContain("throw new Error('Unable to load dashboard trend history.');");
    expect(dashboardSource).toContain('return ((data ?? []) as DashboardSnapshotRow[])');
    expect(organizationDashboardSource).toContain('return data ?? [];');
  });
});
