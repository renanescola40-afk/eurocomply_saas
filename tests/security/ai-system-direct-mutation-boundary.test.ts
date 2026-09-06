import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const quotaMigration = readFileSync(
  'supabase/migrations/20260906003000_billing_ai_system_commercial_quota.sql',
  'utf8',
);
const onboardingMigration = readFileSync(
  'supabase/migrations/20260903114500_reconcile_onboarding_atomic_text_arrays.sql',
  'utf8',
);
const aiSystemQueries = readFileSync('src/server/queries/ai-systems.ts', 'utf8');

describe('AI-system commercial mutation boundary', () => {
  it('removes direct browser DML while preserving authenticated reads', () => {
    expect(quotaMigration).toContain(
      'revoke insert, update, delete on table public.ai_systems from anon, authenticated;',
    );
    expect(quotaMigration).toContain('grant select on table public.ai_systems to authenticated;');
    expect(quotaMigration).toContain("has_table_privilege('authenticated', 'public.ai_systems', 'INSERT')");
    expect(quotaMigration).toContain("has_table_privilege('authenticated', 'public.ai_systems', 'UPDATE')");
    expect(quotaMigration).toContain("has_table_privilege('authenticated', 'public.ai_systems', 'DELETE')");
    expect(quotaMigration).toContain("has_table_privilege('service_role', 'public.ai_systems', 'INSERT')");
  });

  it('enforces the canonical quota on every table insert, including onboarding writers', () => {
    expect(quotaMigration).toContain(
      'create or replace function app_private.enforce_ai_system_commercial_quota()',
    );
    expect(quotaMigration).toContain("when 'starter' then 25");
    expect(quotaMigration).toContain("when 'professional' then 250");
    expect(quotaMigration).toContain("when 'business' then 1500");
    expect(quotaMigration).toContain("when 'enterprise' then null");
    expect(quotaMigration).toContain('perform pg_advisory_xact_lock(hashtext(new.organization_id::text));');
    expect(quotaMigration).toContain('where ai_system.organization_id = new.organization_id;');
    expect(quotaMigration).toContain("raise exception 'ai_system_quota_exceeded'");
    expect(quotaMigration).toContain('create trigger enforce_ai_system_commercial_quota');
    expect(quotaMigration).toContain('before insert on public.ai_systems');
    expect(quotaMigration).toContain(
      'execute function app_private.enforce_ai_system_commercial_quota();',
    );

    const lock = quotaMigration.indexOf(
      'perform pg_advisory_xact_lock(hashtext(new.organization_id::text));',
    );
    const count = quotaMigration.indexOf(
      'where ai_system.organization_id = new.organization_id;',
      lock,
    );
    const deny = quotaMigration.indexOf("raise exception 'ai_system_quota_exceeded'", count);
    expect(lock).toBeGreaterThan(-1);
    expect(count).toBeGreaterThan(lock);
    expect(deny).toBeGreaterThan(count);

    // The active onboarding reconciler is a privileged alternate writer. The
    // table trigger must therefore remain the universal quota boundary instead
    // of relying only on the normal create_ai_system_atomic RPC.
    expect(onboardingMigration).toContain('insert into public.ai_systems (');
  });

  it('keeps the quota trigger private and verifies PUBLIC ACLs explicitly', () => {
    expect(quotaMigration).toContain(
      'revoke all on function app_private.enforce_ai_system_commercial_quota() from public, anon, authenticated;',
    );
    expect(quotaMigration).toContain('cross join lateral aclexplode(');
    expect(quotaMigration).toContain('privilege.grantee = 0');
    expect(quotaMigration).toContain("privilege.privilege_type = 'EXECUTE'");
  });

  it('keeps the reviewed application mutation path behind service-role atomic RPCs', () => {
    expect(aiSystemQueries).toContain("import { createAdminClient } from '@/lib/supabase/admin';");
    expect(aiSystemQueries).toContain("const ATOMIC_CREATE_RPC = 'create_ai_system_atomic';");
    expect(aiSystemQueries).toContain("const ATOMIC_REASSESSMENT_RPC = 'reassess_ai_system_atomic';");
    expect(aiSystemQueries).toContain('supabase.rpc(ATOMIC_CREATE_RPC, {');
    expect(aiSystemQueries).toContain('supabase.rpc(ATOMIC_REASSESSMENT_RPC, {');
  });
});