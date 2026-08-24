import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const prepare = readFileSync(
  'supabase/migrations/20260824185900_prepare_enterprise_trusted_access_legacy_compatibility.sql',
  'utf8',
);
const reconcile = readFileSync(
  'supabase/migrations/20260824190000_reconcile_enterprise_trusted_access_runtime.sql',
  'utf8',
);
const finalize = readFileSync(
  'supabase/migrations/20260824190100_finalize_enterprise_trusted_access_operation_contract.sql',
  'utf8',
);
const harden = readFileSync(
  'supabase/migrations/20260824190200_harden_enterprise_trusted_access_runtime_contract.sql',
  'utf8',
);
const runtimeService = readFileSync('src/server/enterprise/access-runtime-slo.ts', 'utf8');
const contentionService = readFileSync('src/server/enterprise/seat-concurrency-alerting.ts', 'utf8');

const executableReconcile = reconcile.replace(/--.*$/gm, '');

describe('trusted access forward reconciliation', () => {
  it('does not replay the obsolete access-operation-runs model', () => {
    expect(executableReconcile).toContain('enterprise_access_operations');
    expect(executableReconcile).not.toContain('enterprise_access_operation_runs');
    expect(executableReconcile).toContain('enterprise_access_operation_items');
    expect(executableReconcile).toContain('enterprise_access_operation_events');
  });

  it('normalizes historical SLO rows to the UI percent and field contract', () => {
    expect(prepare).toContain('success_rate*100');
    expect(prepare).toContain('success_rate between 0 and 100');
    expect(prepare).toContain('oldest_pending_age_seconds');
    expect(prepare).toContain('dead_letter_count');
    expect(prepare).toContain('alter column title drop not null');
    expect(prepare).toContain('alter column summary drop not null');
    expect(runtimeService).toContain('oldest_pending_seconds');
    expect(runtimeService).toContain('operations_dead_letter');
    expect(runtimeService).toContain('members_compensated');
  });

  it('stores new runtime success rates as 0..100 percentages', () => {
    expect(reconcile).toContain('success_rate numeric(7,4) check (success_rate is null or success_rate between 0 and 100)');
    expect(reconcile).toContain('(v_completed::numeric*100)/v_total::numeric');
    expect(reconcile).toContain('v_snapshot.success_rate<95');
    expect(reconcile).not.toContain('success_rate < 0.95');
  });

  it('uses the governed seat licensing authority instead of the legacy seat_limit contract', () => {
    expect(reconcile).toContain('reserve_organization_seat_idempotent_atomic');
    expect(reconcile).toContain("v_result.outcome in ('member_limit_reached','seat_limit_reached','admin_limit_reached')");
    expect(reconcile).not.toContain('v_contract.seat_limit');
    expect(harden).toContain('reserve_organization_seat_idempotent_atomic');
  });

  it('binds seat contention idempotency to correlation, membership and seat type', () => {
    expect(harden).toContain("'seat-contention:%s:%s:%s'");
    expect(harden).toContain('p_membership_id::text');
    expect(harden).toContain('p_requested_seat_type');
    expect(harden).toContain("'idempotencyScope', 'correlation+membership+seat_type'");
  });

  it('keeps successful pagination separate from failure retry budget', () => {
    expect(harden).toContain("when v_pending > 0 and v_failed = 0 then 'pending'");
    expect(harden).toContain("v_operation.status in ('retry', 'processing')");
    expect(harden).toContain('attempts >= max_attempts');
    expect(harden).toContain("last_error_code = coalesce(last_error_code, 'lease_retry_budget_exhausted')");
  });

  it('keeps operation-detail compatibility columns available without group-policy authority', () => {
    expect(harden).toContain('add column if not exists source_group_id uuid');
    expect(harden).toContain('add column if not exists department_key text');
    expect(finalize).toContain('deliberately non-authoritative');
  });

  it('keeps access control-plane tables forced-RLS and browser denied', () => {
    expect(reconcile.match(/force row level security/g)?.length).toBeGreaterThanOrEqual(10);
    expect(reconcile).toContain('browser roles retain trusted access control-plane privileges');
    expect(reconcile).toContain("has_function_privilege('authenticated',p.oid,'EXECUTE')");
    expect(harden).toContain('browser execution survived Trusted Access hardening');
  });

  it('reconciles secure export storage and audited signed downloads', () => {
    expect(reconcile).toContain("'enterprise-access-exports'");
    expect(reconcile).toContain('register_enterprise_access_export_download');
    expect(reconcile).toContain("expires_at=now()+interval '24 hours'");
    expect(reconcile).toContain("p_sha256 !~ '^[a-f0-9]{64}$'");
  });

  it('preserves worker compatibility without reintroducing group-policy authority', () => {
    expect(finalize).toContain('persist_enterprise_group_access_reconciliation');
    expect(finalize).toContain('membership_tenant_mismatch');
    expect(finalize).toContain('deliberately non-authoritative');
    expect(finalize).toContain('public.digest');
  });

  it('returns the seat contention DTO consumed by the console', () => {
    expect(contentionService).toContain('totals,');
    expect(contentionService).toContain('recent: events.slice(0, 20)');
    expect(contentionService).toContain('capacity_exhausted');
    expect(contentionService).toContain('version_conflicts');
  });
});