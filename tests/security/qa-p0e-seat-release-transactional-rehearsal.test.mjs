import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('../../scripts/security/qa-p0e-seat-release-transactional-rehearsal.sql', import.meta.url)),
  'utf8',
);

test('isolated P0-E/P0-F rehearsal has explicit QA-only PostgreSQL 17 guard', () => {
  assert.match(source, /QA_ONLY_MARKER_OR_POSTGRES_17_MISSING/);
  assert.match(source, /20261105185729/);
  assert.match(source, /server_version_num/);
  assert.match(source, /supabase_migrations\.schema_migrations/);
  assert.match(source, /BEGIN;/);
  assert.match(source, /SET LOCAL lock_timeout/);
  assert.match(source, /SET LOCAL statement_timeout/);
});

test('all temporary synthetic mutations end in mandatory ROLLBACK', () => {
  assert.match(source, /CREATE TEMP TABLE qa_seat_proof/);
  assert.match(source, /'QA_SYNTHTEST_P0E_ROLLBACK'/);
  assert.match(source, /ROLLBACK;/);
  assert.doesNotMatch(source, /^\s*COMMIT\s*;/mi);
  assert.ok(source.trim().indexOf('ROLLBACK;') > source.indexOf('SELECT test_case,outcome FROM qa_seat_proof'));
});

test('checks seven real negative/positive service-role function outcomes', () => {
  for (const name of [
    '01_last_owner_blocked', '02_admin_owner_denied', '03_owner_scim_allowed',
    '04_usage_reconciled', '05_exactly_one_audit', '06_duplicate_denied',
    '07_remaining_owner_protected',
  ]) assert.ok(source.includes(name), name);
  for (const output of ["'last_owner'", "'permission_denied'", "'released'", "'duplicate'"]) {
    assert.ok(source.includes(output), output);
  }
  assert.match(source, /release_organization_seat_atomic/);
  assert.match(source, /enterprise_seat_operations/);
  assert.match(source, /audit_logs/);
  assert.match(source, /organization_usage/);
});

test('does not weaken privileges, disable triggers, or send email', () => {
  assert.doesNotMatch(source, /\b(?:ALTER ROLE|GRANT|REVOKE|DISABLE TRIGGER|SET ROLE|SET SESSION AUTHORIZATION|TRUNCATE|DROP TABLE|DROP POLICY)\b/i);
  assert.doesNotMatch(source, /\b(?:http_post|sendEmail|send_email|net\.http|pg_read_file|COPY\s+.*PROGRAM)\b/i);
  assert.doesNotMatch(source, /\b(?:STRIPE_SECRET_KEY|SERVICE_ROLE_KEY|prod_project)\b/i);
});
