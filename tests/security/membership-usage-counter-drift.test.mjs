import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const sql = readFileSync('scripts/supabase/verify-membership-usage-counter-drift.sql','utf8');
test('P0-F drift evidence is read-only aggregate without a tenant identifier in output',()=>{
  assert.match(sql,/with actual as \(/i);
  assert.match(sql,/group by organization_id/i);
  assert.match(sql,/count\(\*\)::integer as organizations_checked/i);
  assert.doesNotMatch(sql,/\b(create|alter|drop|truncate|insert|update|delete|grant|revoke)\s+(?:table|function|into|on|from|public\.)/i);
  assert.ok(sql.endsWith(';\n'));
});
test('P0-F verifies all active seat, member and administrator counter invariants',()=>{
  for(const token of ['members_counter_drift','seat_counter_drift','admin_counter_drift','active_members','full_users','participants','viewers','active_admins']) assert.ok(sql.includes(token),token);
});
