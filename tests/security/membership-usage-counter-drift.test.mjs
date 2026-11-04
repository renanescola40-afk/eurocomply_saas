import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const sql = readFileSync('scripts/supabase/verify-membership-usage-counter-drift.sql', 'utf8');

test('P0-F drift evidence is read-only aggregate without a tenant identifier in output', () => {
  assert.match(sql, /with actual as \(/i);
  assert.match(sql, /group by organization_id/i);
  assert.match(sql, /count\(\*\)::integer as organizations_checked/i);
  assert.doesNotMatch(sql, /\b(create|alter|drop|truncate|insert|update|delete|grant|revoke)\s+(?:table|function|into|on|from|public\.)/i);
  assert.ok(sql.endsWith(';\n'));
});

test('P0-F verifies all active seat, member and administrator counter invariants', () => {
  for (const token of [
    'members_counter_drift', 'seat_counter_drift', 'admin_counter_drift',
    'active_members', 'full_users', 'participants', 'viewers', 'active_admins',
  ]) assert.ok(sql.includes(token), token);
});

test('P0-F includes both memberships without usage and usage without memberships', () => {
  assert.match(sql, /full\s+outer\s+join\s+actual\s+as\s+a\s+on\s+a\.organization_id\s*=\s*usage\.organization_id/i);
  assert.match(sql, /usage\.organization_id is null as missing_usage_row/i);
  assert.match(sql, /count\(\*\) filter \(where missing_usage_row\)::integer as missing_usage_rows/i);
  assert.doesNotMatch(sql, /from public\.organization_usage as usage\s+left join actual/i);
});

test('missing usage rows fail every counter category closed, not only active members', () => {
  for (const label of ['members_mismatch', 'seats_mismatch', 'admin_mismatch']) {
    const expression = sql.match(new RegExp('\\((?:[\\s\\S]*?)\\) as ' + label, 'i'))?.[0];
    assert.ok(expression, label);
    assert.match(expression, /usage\.organization_id is null/i, label);
  }
});

test('output stays aggregated with no per-organization identifiers', () => {
  const finalSelect = sql.slice(sql.lastIndexOf('\nselect count(*)::integer'));
  assert.ok(finalSelect.includes('from drift;'));
  assert.doesNotMatch(finalSelect, /organization_id|\ba\.organization_id\b/i);
});
