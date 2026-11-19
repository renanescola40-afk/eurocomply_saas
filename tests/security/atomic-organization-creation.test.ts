import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const action = fs.readFileSync('src/server/actions/organizations.ts', 'utf8');
const migration = fs.readFileSync(
  'supabase/migrations/20260716180000_atomic_organization_creation.sql',
  'utf8',
);

describe('atomic organization creation', () => {
  it('delegates tenant and initial owner creation to one RPC', () => {
    expect(action).toContain("const ATOMIC_ORGANIZATION_CREATION_RPC = 'create_organization_with_owner_atomic'");
    expect(action).toContain('supabase.rpc(ATOMIC_ORGANIZATION_CREATION_RPC');
    expect(action).not.toMatch(/\.from\(['"]organizations['"]\)[\s\S]{0,160}?\.insert\(/);
    expect(action).not.toMatch(/\.from\(['"]organization_members['"]\)[\s\S]{0,160}?\.insert\(/);
  });

  it('persists the organization before its owner inside one database function', () => {
    const organizationInsert = migration.indexOf('insert into public.organizations');
    const ownerInsert = migration.indexOf('insert into public.organization_members');

    expect(organizationInsert).toBeGreaterThan(-1);
    expect(ownerInsert).toBeGreaterThan(organizationInsert);
    expect(migration).toContain("values (v_organization.id, p_user_id, 'owner')");
    expect(migration).toContain("'created'::text");
  });

  it('duplicates application input constraints at the privileged database boundary', () => {
    expect(migration).toContain('char_length(v_name) < 2');
    expect(migration).toContain('char_length(v_name) > 120');
    expect(migration).toContain('char_length(v_slug) < 3');
    expect(migration).toContain('char_length(v_slug) > 80');
    expect(migration).toContain("v_slug !~ '^[a-z0-9-]+$'");
    expect(migration).toContain("'invalid_input'::text");
  });

  it('is service-role only with a fixed search path', () => {
    expect(migration).toContain('security definer');
    expect(migration).toContain('set search_path = public');
    expect(migration).toContain(
      'revoke all on function public.create_organization_with_owner_atomic(text, text, uuid) from authenticated',
    );
    expect(migration).toContain(
      'grant execute on function public.create_organization_with_owner_atomic(text, text, uuid) to service_role',
    );
  });
  it('initializes security policy atomically for every newly-created tenant, without backfilling old missing policies', () => {
    const policyMigration = fs.readFileSync(
      'supabase/migrations/20261119115000_initialize_new_tenant_mfa_policy.sql', 'utf8',
    );
    expect(policyMigration).toMatch(/(?:^|\n)begin\s*;/);
    expect(policyMigration).toMatch(/after insert on public\.organizations/i);
    expect(policyMigration).toMatch(/insert into public\.organization_security_settings/i);
    expect(policyMigration).toMatch(/values\s*\(new\.id, false\)/i);
    expect(policyMigration).toContain('security definer');
    expect(policyMigration).toContain('set search_path = pg_catalog, public');
    expect(policyMigration).toContain('trg_initialize_new_tenant_mfa_policy');
    expect(policyMigration).toContain("has_function_privilege('anon'");
    expect(policyMigration).not.toMatch(/insert into public\.organization_security_settings[\s\S]*?select\s+.*from\s+public\.organizations/i);
    expect(policyMigration).toMatch(/commit\s*;\s*$/);
    for (const fixture of [
      'scripts/database/prove-enterprise-evidence-tenant-isolation.mjs',
      'scripts/product/create-fria-ephemeral-fixtures.mjs',
    ]) {
      const body = fs.readFileSync(fixture, 'utf8');
      expect(body).toContain('assertDisposableMfaPolicy');
      expect(body).not.toContain("insert({ organization_id: organizationId, require_mfa_for_all_users: false })");
    }
  });

});
