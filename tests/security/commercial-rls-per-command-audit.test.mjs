import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('scripts/security/audit-commercial-rls-per-command-acls.sql', 'utf8');

test('enumerates all CRUD commands rather than aggregating policies across actions', () => {
  for (const command of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
    assert.match(sql, new RegExp("'" + command + "'"));
  }
  assert.match(sql, /p\.cmd in \('ALL', a\.operation\)/);
  assert.match(sql, /p\.roles && array\['authenticated', 'public'\]::name\[\]/);
});

test('assesses real table OIDs and direct authenticated grants without guessing a relation name', () => {
  assert.match(sql, /c\.oid, c\.relname as tablename/);
  assert.match(sql, /n\.nspname = 'public'/);
  assert.match(sql, /has_table_privilege\('authenticated', oid, operation\)/);
  assert.doesNotMatch(sql, /has_table_privilege\('authenticated',\s*format\(/);
});

test('separates permissive, restrictive and personal-row authorization candidates', () => {
  for (const field of [
    'membership_permissive_count', 'membership_restrictive_count',
    'personal_permissive_count', 'personal_restrictive_count',
    'NO_DIRECT_AUTH_GRANT', 'NAMED_MEMBERSHIP_PERMISSIVE_STATIC',
    'NAMED_MEMBERSHIP_RESTRICTIVE_STATIC', 'PERSONAL_ONLY_RESTRICTION_STATIC',
    'REVIEW_POLICY_COMPOSITION',
  ]) assert.ok(sql.includes(field), 'Missing expected gate: ' + field);
});

test('marks results static only and never asserts proof of multi-tenant enforcement', () => {
  assert.match(sql, /NOT proof of effective tenant isolation/);
  assert.doesNotMatch(sql, /'DATABASE_SECURITY_100_PASS'/);
});

test('only inspects metadata and never changes production data', () => {
  const uncommented = sql.split('\n').filter(s => !s.trimStart().startsWith('--')).join('\n');
  assert.match(uncommented, /^\s*with commercial_tables/i);
  assert.doesNotMatch(uncommented, /\b(?:insert\s+into|update\s+\w|delete\s+from|alter\s+table|create\s+table|drop\s+table|truncate|grant\s+\w|revoke\s+\w)\b/i);
});
