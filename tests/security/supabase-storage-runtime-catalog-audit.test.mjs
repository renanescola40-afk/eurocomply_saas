import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('scripts/security/audit-supabase-storage-buckets-runtime.sql', 'utf8');

test('checks the four private business Storage buckets', () => {
  for (const bucket of [
    'compliance-documents',
    'compliance-evidence',
    'controlled-documents',
    'enterprise-access-exports',
  ]) {
    assert.match(sql, new RegExp("'" + bucket + "'"));
  }
  assert.match(sql, /left join storage\.buckets b on b\.id = e\.id/i);
  assert.match(sql, /b\.public is false/i);
});

test('checks file restrictions, RLS and anonymous policy exposure', () => {
  assert.match(sql, /file_size_limit > 0/i);
  assert.match(sql, /cardinality\(b\.allowed_mime_types\) > 0/i);
  assert.match(sql, /c\.relname = 'objects'/i);
  assert.match(sql, /c\.relrowsecurity/i);
  assert.match(sql, /p\.roles && array\['anon', 'public'\]::name\[\]/i);
});

test('labels positive results metadata-only rather than tenant proof', () => {
  assert.match(sql, /'PASS_METADATA_ONLY'/);
  assert.match(sql, /'REVIEW'/);
  assert.doesNotMatch(sql, /'DATABASE_SECURITY_100_PASS'/);
});

test('keeps audit query read-only', () => {
  const statements = sql.split('\n').filter((line) => !line.trimStart().startsWith('--')).join('\n');
  assert.match(statements, /^\s*with\s+expected/i);
  assert.doesNotMatch(statements, /\b(?:insert\s+into|update\s+[a-z]|delete\s+from|alter\s+table|create\s+table|drop\s+table|truncate|grant\s+|revoke\s+)\b/i);
});
