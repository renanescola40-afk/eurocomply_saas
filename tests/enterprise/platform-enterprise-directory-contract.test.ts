import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260721215500_platform_enterprise_organization_directory.sql',
  'utf8',
);
const query = readFileSync('src/server/enterprise/platform-directory.ts', 'utf8');
const listPage = readFileSync('src/app/[locale]/platform/organizations/page.tsx', 'utf8');
const detailPage = readFileSync('src/app/[locale]/platform/organizations/[organizationId]/page.tsx', 'utf8');

describe('global Enterprise tenant directory', () => {
  it('checks the existing MFA-backed platform authority in database RPCs', () => {
    expect(migration).toContain('create or replace function public.is_platform_enterprise_reader');
    expect(migration).toContain('from public.platform_admin_users as actor');
    expect(migration).toContain('actor.enabled = true');
    expect(migration).not.toContain("'sales_rep'");
    expect(migration).toContain("raise exception 'platform_role_required'");
  });

  it('lists only operational aggregate data without employee email or token material', () => {
    expect(migration).toContain('create or replace function public.list_platform_enterprise_organizations');
    expect(migration).toContain("contract.contract_mode = 'negotiated'");
    expect(migration).toContain("item.status in ('queued','processing')");
    expect(migration).toContain("alert.status = 'open'");
    expect(migration).not.toMatch(/user_email|token_hash|secret_hash|work_email/);
  });

  it('returns detail aggregates for contract, limits, jobs, identity and alerts', () => {
    expect(migration).toContain('create or replace function public.get_platform_enterprise_organization_detail');
    for (const field of ["'contract'", "'limits'", "'usage'", "'features'", "'jobs'", "'identity'", "'alerts'"]) {
      expect(migration).toContain(field);
    }
    expect(migration).toContain("token.status = 'active'");
    expect(migration).not.toContain('token.token_hash');
  });

  it('keeps RPC execution service-role only', () => {
    expect(migration).toContain('revoke all on function public.list_platform_enterprise_organizations');
    expect(migration).toContain('grant execute on function public.list_platform_enterprise_organizations');
    expect(migration).toContain('to service_role');
  });

  it('protects both pages with the platform organization capability', () => {
    expect(listPage).toContain("requirePlatformCapability(user.id, 'organizations')");
    expect(detailPage).toContain("requirePlatformCapability(user.id, 'organizations')");
    expect(listPage).toContain("fetchCache = 'force-no-store'");
    expect(detailPage).toContain("fetchCache = 'force-no-store'");
    expect(query).toContain("'list_platform_enterprise_organizations'");
    expect(query).toContain("'get_platform_enterprise_organization_detail'");
  });
});
