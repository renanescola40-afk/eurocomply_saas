import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const path = 'supabase/reconciliation/20261018223000_reconcile_existing_membership_usage_drift_manual.sql';
const sql = readFileSync(path, 'utf8');

test('P0-F repair is manual-only, not auto migration, and has exact consent and SHA guards', () => {
  assert.match(path, /^supabase\/reconciliation\//);
  assert.match(sql, /NOT A MIGRATION/i);
  assert.match(sql, /APPROVED_MANUAL_P0F_REPAIR/);
  assert.match(sql, /p0f_release_sha.*true/);
  assert.match(sql, /\^\[a-f0-9\]\{40\}\$/);
  assert.match(sql, /six|required forward migrations/i);
});
test('Repair fails closed until all six migrations and audited RPC cutovers exist', () => {
  for (const version of ['20261015235500','20261018023000','20261018113000','20261018160000','20261018183000','20261018190000']) {
    assert.ok(sql.includes(version), version);
  }
  assert.match(sql, /has_function_privilege\('service_role'/);
  assert.match(sql, /audited writer cutover was not accepted/);
  assert.match(sql, /audited writer implementation or ACL failed verified preflight/);
  assert.match(sql, /last_reconciled_at' in pg_get_functiondef/);
  assert.match(sql, /has_function_privilege\('anon'/);
  assert.match(sql, /has_function_privilege\('authenticated'/);
});
test('Repair takes bounded locks in compatible writer order', () => {
  assert.match(sql, /set local lock_timeout = '5s'/i);
  assert.match(sql, /set local statement_timeout = '45s'/i);
  const usage = sql.indexOf('lock table public.organization_usage');
  const members = sql.indexOf('lock table public.organization_members');
  assert.ok(usage > 0 && members > usage);
  assert.match(sql, /share row exclusive mode/ig);
});
test('Only confirmed drifting derived membership counters can change', () => {
  assert.match(sql, /v_drift <> 2/);
  assert.match(sql, /v_missing_usage <> 0/);
  for (const col of ['active_members','full_users','participants','viewers','active_admins']) {
    assert.match(sql,new RegExp('\\b'+col+'\\b','g'));
  }
  assert.match(sql, /where organization_id=v_target.organization_id/);
  assert.match(sql, /v_affected <> 1/);
  assert.match(sql, /v_updated <> v_drift or v_remaining <> 0/);
  for (const key of ['pending_invitations','ai_systems','legal_entities','storage_bytes','api_requests','scim_operations','csv_imports']) {
    assert.doesNotMatch(sql,new RegExp('set\\s+'+key+'\\s*=','i'));
  }
});
test('Correction writes attributable legacy audit log and no tenant details to query output', () => {
  assert.match(sql, /insert into public.audit_logs/);
  assert.match(sql, /enterprise\.membership_usage_reconciled/);
  assert.match(sql, /reviewed_manual_p0f_reconciliation/);
  assert.doesNotMatch(sql,/select\s+\*\s+from\s+public\.(organization_members|organizations)/i);
  assert.doesNotMatch(sql, /insert into public.audit_events/);
});

test('Manual correction is restricted to two drifted tenants with no memberships of any status', () => {
  assert.match(sql, /v_orphan_drift integer/);
  assert.match(sql, /count\(\*\) filter\(where a\.organization_id is null\)::integer/);
  assert.match(sql, /v_orphan_drift <> 2/);
  assert.match(sql, /expected two drifting organizations without membership rows/);
  assert.match(sql, /and a\.organization_id is null\s+order by u\.organization_id/);
  const locking = sql.indexOf('lock table public.organization_members');
  const subtype = sql.indexOf('v_orphan_drift <> 2');
  const repairing = sql.indexOf('for v_target in');
  assert.ok(locking >= 0 && subtype > locking && repairing > subtype);
});
