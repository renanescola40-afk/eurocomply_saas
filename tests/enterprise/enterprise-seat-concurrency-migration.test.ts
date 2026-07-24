import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260724103000_enterprise_seat_concurrency.sql',
  'utf8',
).toLowerCase();

describe('enterprise seat concurrency migration', () => {
  it('creates policies, reservations and append-only events', () => {
    for (const table of ['enterprise_seat_policies', 'enterprise_seat_reservations', 'enterprise_seat_events']) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`alter table public.${table} force row level security`);
    }
    expect(migration).toContain('enterprise_seat_events_deny_all');
  });

  it('serializes reservation and consumption operations', () => {
    expect(migration).toContain('reserve_enterprise_seat_atomic');
    expect(migration).toContain('consume_enterprise_seat_reservation_atomic');
    expect(migration.match(/pg_advisory_xact_lock/g)?.length).toBeGreaterThanOrEqual(2);
    expect(migration).toContain('for update');
  });

  it('fails closed when policy is missing, stale or exhausted', () => {
    expect(migration).toContain("'policy_unavailable'");
    expect(migration).toContain("'version_conflict'");
    expect(migration).toContain("'seat_limit_reached'");
    expect(migration).toContain('v_used + v_reserved >= v_limit');
  });

  it('enforces idempotency and optimistic member concurrency', () => {
    expect(migration).toContain('unique (organization_id, idempotency_key)');
    expect(migration).toContain("'idempotent_replay'");
    expect(migration).toContain('seat_version bigint not null default 1');
    expect(migration).toContain('v_member.seat_version <> p_expected_member_seat_version');
  });

  it('keeps RPC execution behind the service role', () => {
    expect(migration).toContain('revoke all on function public.reserve_enterprise_seat_atomic');
    expect(migration).toContain('grant execute on function public.reserve_enterprise_seat_atomic');
    expect(migration).toContain('to service_role');
  });
});
