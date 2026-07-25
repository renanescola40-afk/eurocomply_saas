import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20260724193000_enterprise_entitlement_billing_reconciliation.sql', 'utf8');

describe('enterprise entitlement reconciliation migration', () => {
  it('creates canonical source, snapshot and event tables', () => {
    for (const table of [
      'enterprise_entitlement_sources',
      'enterprise_entitlement_snapshots',
      'enterprise_entitlement_reconciliation_events',
    ]) expect(sql).toContain(`create table if not exists public.${table}`);
  });

  it('enforces organization-scoped idempotency and exact payload integrity', () => {
    expect(sql).toContain('unique (organization_id, idempotency_key)');
    expect(sql).toContain("source_payload_sha256 ~ '^[a-f0-9]{64}$'");
    expect(sql).toContain('foreign key (source_id, organization_id)');
  });

  it('serializes reconciliation and fails closed on stale or lower-priority sources', () => {
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain("'version_conflict'");
    expect(sql).toContain("'lower_priority'");
    expect(sql).toContain("'source_unavailable'");
  });

  it('updates the canonical seat policy in the same transaction', () => {
    expect(sql).toContain('update public.enterprise_seat_policies');
    expect(sql).toContain('insert into public.enterprise_seat_policies');
    expect(sql).toContain('version = version + 1');
  });

  it('keeps mutation service-role only and evidence non-browser-mutable', () => {
    expect(sql).toContain('force row level security');
    expect(sql).toContain('from public, anon, authenticated');
    expect(sql).toContain('to service_role');
    expect(sql).toContain('enterprise_entitlement_events_deny_delete');
  });
});
