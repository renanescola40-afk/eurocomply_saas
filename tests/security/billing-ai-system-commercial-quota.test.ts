import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260906003000_billing_ai_system_commercial_quota.sql', 'utf8');
const query = readFileSync('src/server/queries/ai-systems.ts', 'utf8');

describe('AI system commercial quota boundary', () => {
  it('reasserts payment authority inside the service-role atomic create RPC', () => {
    expect(migration).toContain('v_plan := app_private.resolve_commercial_plan(p_organization_id);');
    expect(migration).toContain("return query select 'subscription_required'::text, null::jsonb");
    expect(migration).toContain("when 'starter' then 25");
    expect(migration).toContain("when 'professional' then 250");
    expect(migration).toContain("when 'business' then 1500");
    expect(migration).toContain("when 'enterprise' then null");
    expect(migration).toContain('grant execute on function public.create_ai_system_atomic(uuid, uuid, jsonb) to service_role;');
    expect(migration).toContain('revoke all on function public.create_ai_system_atomic(uuid, uuid, jsonb) from public, anon, authenticated;');
  });

  it('serializes quota decision and insert in one tenant-scoped transaction', () => {
    const lock = migration.indexOf('pg_advisory_xact_lock(hashtext(p_organization_id::text))');
    const count = migration.indexOf('select count(*)::integer');
    const deny = migration.indexOf("return query select 'quota_exceeded'::text, null::jsonb");
    const insert = migration.indexOf('insert into public.ai_systems');

    expect(lock).toBeGreaterThan(-1);
    expect(count).toBeGreaterThan(lock);
    expect(deny).toBeGreaterThan(count);
    expect(insert).toBeGreaterThan(deny);
  });

  it('surfaces subscription and quota denials instead of treating them as malformed RPC output', () => {
    expect(query).toContain("type AtomicCreateOutcome = 'created' | 'invalid_input' | 'subscription_required' | 'quota_exceeded'");
    expect(query).toContain("transition.outcome === 'subscription_required'");
    expect(query).toContain("transition.outcome === 'quota_exceeded'");
    expect(query).toContain("status: 403");
  });
});
