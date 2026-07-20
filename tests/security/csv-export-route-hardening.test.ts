import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function walk(dir: string, acc: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      walk(path, acc);
    } else if (path.endsWith('.csv/route.ts')) {
      acc.push(path);
    }
  }

  return acc;
}

const csvRoutes = walk(join(process.cwd(), 'src/app/api/reports'));

describe('CSV report route hardening invariants', () => {
  it('keeps every CSV route on the hardened CSV download helper', () => {
    expect(csvRoutes.length).toBeGreaterThan(0);

    for (const route of csvRoutes) {
      const source = readFileSync(route, 'utf8');
      expect(source).toContain('csvDownloadResponse');
      expect(source).not.toContain('text/csv');
    }
  });

  it('does not expose provider errors or cache JSON failure responses', () => {
    for (const route of csvRoutes) {
      const source = readFileSync(route, 'utf8');
      expect(source).not.toContain('NextResponse.json');
      expect(source).not.toContain('error.message');

      if (source.includes('return noStoreJson')) {
        expect(source).toContain('@/server/security/no-store');
      }
    }
  });

  it('scopes Supabase CSV exports to the active organization and export rate-limit policy', () => {
    for (const route of csvRoutes) {
      const source = readFileSync(route, 'utf8');
      expect(source).toContain("policy: 'export'");

      if (source.includes('.from(')) {
        expect(source).toContain(".eq('organization_id', organization.id)");
      }
    }
  });

  it('enforces RBAC, paid entitlement and request-bound step-up before every CSV export', () => {
    for (const route of csvRoutes) {
      const source = readFileSync(route, 'utf8');
      expect(source).toContain('export async function GET(request: Request)');
      expect(source).toContain('await assertOrganizationPermission({');
      expect(source).toContain("permission: 'export_data'");
      expect(source).toContain('await assertCsvExportsEnabled(');
      expect(source).toContain('await requireStepUpForRequest({');
      expect(source).toContain("action: 'export_data'");
      expect(source).toContain("stepUpTokenType: 'signed_hmac'");
      const permissionIndex = source.indexOf('await assertOrganizationPermission({');
      const entitlementIndex = source.indexOf('await assertCsvExportsEnabled(');
      const stepUpIndex = source.indexOf('await requireStepUpForRequest({');
      const rateLimitIndex = source.indexOf('await checkDistributedRateLimit({');
      expect(permissionIndex).toBeLessThan(entitlementIndex);
      expect(entitlementIndex).toBeLessThan(stepUpIndex);
      expect(stepUpIndex).toBeLessThan(rateLimitIndex);
    }
  });

  it('uses a token-bearing step-up client instead of direct CSV links', () => {
    const button = readFileSync(join(process.cwd(), 'src/components/reports/step-up-csv-export-button.tsx'), 'utf8');
    expect(button).toContain('StepUpMfaDialog');
    expect(button).toContain('action="export_data"');
    expect(button).toContain('STEP_UP_TOKEN_HEADER');
    expect(button).toContain("credentials: 'same-origin'");
    expect(button).toContain('response.blob()');
    for (const page of [
      'src/app/[locale]/dashboard/organizations/reports/page.tsx',
      'src/app/[locale]/dashboard/organizations/tasks/page.tsx',
      'src/app/[locale]/dashboard/organizations/risks/page.tsx',
      'src/app/[locale]/dashboard/organizations/vendors/page.tsx',
    ]) {
      const source = readFileSync(join(process.cwd(), page), 'utf8');
      expect(source).toContain('StepUpCsvExportButton');
      expect(source).not.toMatch(/href=["'{`]\/api\/reports\/[^\s"'`}]+\.csv/);
    }
  });
});
