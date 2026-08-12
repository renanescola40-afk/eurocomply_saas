import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260812164435_lock_stripe_events_processed_backend_only.sql',
  'utf8',
).toLowerCase();

describe('Stripe processed-event ledger backend-only hardening', () => {
  it('removes all client-facing table grants', () => {
    expect(migration).toContain(
      'revoke all on table public.stripe_events_processed from public, anon, authenticated',
    );
  });

  it('forces RLS as defense in depth', () => {
    expect(migration).toContain(
      'alter table public.stripe_events_processed force row level security',
    );
  });

  it('fails closed unless client access is absent and service-role access remains', () => {
    expect(migration).toContain("has_table_privilege('anon', 'public.stripe_events_processed', 'select')");
    expect(migration).toContain("has_table_privilege('authenticated', 'public.stripe_events_processed', 'insert')");
    expect(migration).toContain("not has_table_privilege('service_role', 'public.stripe_events_processed', 'select')");
    expect(migration).toContain("not has_table_privilege('service_role', 'public.stripe_events_processed', 'insert')");
    expect(migration).toContain(
      "raise exception 'stripe_events_processed backend-only acl postcondition failed'",
    );
  });

  it('does not create client policies or mutate application rows', () => {
    expect(migration).not.toMatch(/create\s+policy/i);
    expect(migration).not.toMatch(/\b(?:insert\s+into|update|delete\s+from|truncate)\b/i);
  });
});
