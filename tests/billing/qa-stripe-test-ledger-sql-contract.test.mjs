import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../../scripts/qa/qa-bil02-restricted-event-writer-rollback.sql', import.meta.url), 'utf8');
const grant = sql.match(/GRANT SELECT \([^;]+?ON public\.stripe_events_processed TO risck_qa_stripe_event_writer;/s)?.[0];

test('reversible QA-only PG17 guarded transaction', () => {
  assert.match(sql, /\bBEGIN;\s*DO \$guard\$/);
  assert.match(sql, /version = '20261105185729'/);
  assert.match(sql, /RESET ROLE;\s*ROLLBACK;\s*$/);
  assert.equal((sql.match(/\bROLLBACK;/g) || []).length, 1);
});

test('writer never bypasses RLS or gains subscription access', () => {
  assert.match(sql, /CREATE ROLE risck_qa_stripe_event_writer NOLOGIN NOINHERIT NOBYPASSRLS/);
  assert.match(sql, /relrowsecurity AND relforcerowsecurity/);
  assert.match(sql, /has_table_privilege\(current_user, 'public\.subscriptions', 'INSERT'\)/);
  assert.match(sql, /has_table_privilege\(current_user, 'public\.organization_entitlements', 'UPDATE'\)/);
  assert.doesNotMatch(sql, /CREATE FUNCTION|SECURITY DEFINER|DISABLE ROW LEVEL SECURITY/i);
});

test('only insert plus minimal SELECT column grants; no UPDATE, DELETE or status insertion', () => {
  assert.ok(grant, 'expected one scoped column privilege grant');
  assert.match(grant, /SELECT \(id, status\)/);
  assert.match(grant, /INSERT \(id, type, stripe_created_at, livemode, api_version, payload\)/);
  assert.doesNotMatch(grant, /\bUPDATE\b|\bDELETE\b|INSERT \(id, type, status/);
  assert.doesNotMatch(sql, /CREATE POLICY risck_qa_stripe_event_writer_update/);
});

test('RLS keeps TEST events unbound, intake-only and pending', () => {
  assert.match(sql, /WITH CHECK \(livemode=false AND organization_id IS NULL\s+AND status = 'processing'/);
  assert.match(sql, /id ~ '\^evt_\[A-Za-z0-9_\]\{4,200\}\$'/);
  assert.match(sql, /payload @> '\{"qa_intake_only":true\}'::jsonb/);
  assert.match(sql, /FOR SELECT TO risck_qa_stripe_event_writer/);
});

test('real database rehearsal denies forged processed states and other mutations', () => {
  for (const assertion of [
    'qa_intake_writer_can_forge_processed_state',
    'qa_intake_writer_can_insert_processed_state',
    'qa_writer_live_insert_was_permitted',
    'qa_writer_tenant_insert_was_permitted',
    'qa_writer_duplicate_insert_was_permitted',
    'qa_writer_delete_was_permitted',
  ]) assert.ok(sql.includes(assertion), 'missing negative assertion: ' + assertion);
});
