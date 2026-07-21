import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260721215100_platform_organization_creation_hardening.sql',
  'utf8',
);
const route = readFileSync('src/app/api/platform/organizations/route.ts', 'utf8');
const page = readFileSync('src/app/[locale]/platform/organizations/new/page.tsx', 'utf8');

describe('platform Enterprise organization creation', () => {
  it('requires an enabled global platform role in the database', () => {
    expect(migration).toContain('from public.platform_admin_users as actor');
    expect(migration).toContain('actor.enabled = true');
    expect(migration).toContain("actor.role in ('owner','sales_admin','platform_owner','platform_admin')");
    expect(migration).toContain("'platform_role_required'::text");
  });

  it('adapts only to known organization columns and fails closed for unsupported required columns', () => {
    expect(migration).toContain("column_name not in ('id','name','slug','created_by','owner_id','status','plan')");
    expect(migration).toContain("'schema_unsupported'::text");
    expect(migration).toContain("execute 'select exists (select 1 from public.organizations where slug = $1)'");
    expect(migration).toContain('when unique_violation then');
  });

  it('writes durable tenant creation audit evidence', () => {
    expect(migration).toContain("'enterprise.organization_created'");
    expect(migration).toContain("'source', 'platform_control_center'");
    expect(migration).toContain("'organization'");
  });

  it('protects the API with auth, AAL2 capability, origin, bounded input and fail-closed rate limiting', () => {
    expect(route).toContain('requireApiUser()');
    expect(route).toContain("requirePlatformCapability(user.id, 'organizations')");
    expect(route).toContain('requireTrustedMutation(request');
    expect(route).toContain("failureMode: 'fail-closed'");
    expect(route).toContain('readBoundedJsonRequest(request');
    expect(route).toContain("'create_platform_enterprise_organization_atomic'");
  });

  it('keeps the localized creation page behind the same platform capability', () => {
    expect(page).toContain("requirePlatformCapability(user.id, 'organizations')");
    expect(page).toContain('<EnterpriseOrganizationCreate />');
    expect(page).toContain('fetchCache = \'force-no-store\'');
  });
});
