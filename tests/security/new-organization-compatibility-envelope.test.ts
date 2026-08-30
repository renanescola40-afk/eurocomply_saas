import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath =
  'supabase/migrations/20260822123608_v19_reconcile_new_organization_compatibility_envelope.sql';
const migration = readFileSync(migrationPath, 'utf8');

describe('new organization compatibility envelope', () => {
  it('persists the technical envelope as compatibility instead of inheriting negotiated authority', () => {
    expect(migration).toMatch(
      /insert into public\.enterprise_contracts \([\s\S]*?contract_mode,[\s\S]*?\) values \([\s\S]*?'runtime-compatibility-' \|\| new\.organization_id::text,[\s\S]*?'compatibility',/,
    );
  });

  it('keeps Enterprise feature entitlements disabled on the compatibility envelope', () => {
    expect(migration).toContain(
      "jsonb_build_object('legacy_compatibility', true, 'post_rollout_bootstrap', true)",
    );
    expect(migration).toContain("'legacy_compatibility'");
  });

  it('fails closed if a post-rollout compatibility envelope is persisted with another contract mode', () => {
    expect(migration).toContain("custom_features ->> 'post_rollout_bootstrap'");
    expect(migration).toContain("contract_mode <> 'compatibility'");
    expect(migration).toContain(
      "raise exception 'runtime compatibility envelopes must use compatibility contract mode'",
    );
  });

  it('keeps the trigger implementation non-callable by browser and service roles directly', () => {
    expect(migration).toContain(
      'revoke all on function public.ensure_new_organization_compatibility_envelope()',
    );
    expect(migration).toContain('from public, anon, authenticated, service_role;');
    expect(migration).toContain('organization_members_ensure_compatibility_envelope');
  });
});
