import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('scripts/security/audit-legal-assurance-production-schema.sql', 'utf8');

test('requires all four Legal Assurance source-of-truth tables', () => {
  for (const relation of [
    'legal_review_artifacts',
    'legal_review_decisions',
    'legal_review_requests',
    'counsel_profiles',
  ]) assert.match(sql, new RegExp("'" + relation + "'"));
  assert.match(sql, /r\.required_count\s*=\s*r\.existing_count/);
});

test('requires exact private PDF bucket, guard, trigger and browser deny policies', () => {
  assert.match(sql, /b\.public\s+is\s+false/i);
  assert.match(sql, /allowed_mime_types\s*=\s*array\['application\/pdf'\]/);
  assert.match(sql, /app_private\.enforce_legal_decision_artifact_reference/);
  assert.match(sql, /legal_review_decision_artifact_reference_guard/);
  assert.match(sql, /p\.direct_deny_policy_count\s*=\s*4/);
});

test('labels missing dependencies as NO_GO rather than PASS', () => {
  assert.match(sql, /'NO_GO_SCHEMA_MISSING'/);
  assert.match(sql, /'PASS_SCHEMA_METADATA_ONLY'/);
  assert.doesNotMatch(sql, /'DATABASE_SECURITY_100_PASS'/);
});

test('reads PostgreSQL catalog only; does not mutate production', () => {
  const statements = sql.split('\n').filter(line => !line.trimStart().startsWith('--')).join('\n');
  assert.match(statements, /^\s*with required_relations/i);
  assert.doesNotMatch(statements, /\b(?:insert\s+into|update\s+\w|delete\s+from|alter\s+table|create\s+table|drop\s+table|truncate|grant\s+\w|revoke\s+\w)\b/i);
});
