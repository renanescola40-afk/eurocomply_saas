import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const path = 'docs/security/proposals/SEC01_QA_TENANT_MFA_SESSION_REVOCATION_REVIEW_ONLY.sql';
const source = readFileSync(path, 'utf8');
const lowered = source.toLowerCase();

test('this SQL is a reviewed QA candidate, not an automatically applied migration', () => {
  assert.match(source, /QA-ONLY FORWARD REMEDIATION CANDIDATE/);
  assert.match(source, /NEVER AUTOMATICALLY APPLY/);
  assert.match(source, /independent qualified Security\/DB review/);
  assert.match(source, /DAT-01 migration provenance decision/);
  assert.match(source, /DO NOT EXECUTE ON PRODUCTION/);
  assert.match(lowered, /^--[\s\S]*?\nbegin;\n/);
  assert.match(lowered, /\ncommit;\n\s*$/);
});

test('rejects missing session, malformed session ID, revoked and expired Supabase sessions', () => {
  assert.match(source, /WHEN public\.current_legacy_user_id\(\) IS NOT NULL THEN/);
  assert.match(source, /COALESCE\(auth\.jwt\(\) ->> 'role', ''\) = 'authenticated'/);
  assert.match(source, /COALESCE\(auth\.jwt\(\) ->> 'is_anonymous', 'false'\) = 'false'/);
  const validSessionPattern = /WHEN COALESCE\(auth\.jwt\(\) ->> 'session_id', ''\) ~\*/;
  const cast = /\(auth\.jwt\(\) ->> 'session_id'\)::uuid/;
  const patternStart = source.search(validSessionPattern);
  const uuidCast = source.search(cast);
  assert.ok(patternStart >= 0 && uuidCast > patternStart);
  assert.match(source, /FROM auth\.sessions AS s/);
  assert.match(source, /s\.id = \(auth\.jwt\(\) ->> 'session_id'\)::uuid/);
  assert.match(source, /s\.user_id = public\.current_legacy_user_id\(\)/);
  assert.match(source, /\(s\.not_after IS NULL OR s\.not_after > pg_catalog\.now\(\)\)/);
  assert.match(source, /ELSE false\s+END\s+WHEN public\.current_clerk_user_id\(\)/);
});

test('preserves Clerk compatibility but fails closed for unknown principals', () => {
  assert.match(source, /WHEN public\.current_clerk_user_id\(\) IS NOT NULL THEN/);
  assert.match(source, /-- Preserve historical non-UUID Clerk subjects/);
  assert.match(source, /ELSE false\s+END\s+AND EXISTS/);
  assert.match(source, /FROM public\.organization_security_settings AS oss/);
  assert.match(source, /NOT oss\.require_mfa_for_all_users/);
  assert.match(source, /COALESCE\(auth\.jwt\(\) ->> 'aal', ''\) = 'aal2'/);
});

test('preserves privileged predicate ACLs and avoids public RPC exposure', () => {
  assert.match(source, /CREATE OR REPLACE FUNCTION public\.tenant_mfa_satisfied\(target_organization_id uuid\)/);
  assert.match(source, /SECURITY DEFINER/);
  assert.match(source, /SET search_path TO 'pg_catalog', 'public'/);
  assert.match(source, /has_function_privilege\('anon',predicate_oid,'EXECUTE'\)/);
  assert.match(source, /has_function_privilege\('authenticated',predicate_oid,'EXECUTE'\)/);
  assert.match(source, /has_function_privilege\('service_role',predicate_oid,'EXECUTE'\)/);
  assert.doesNotMatch(source, /\bGRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.tenant_mfa_satisfied/i);
  assert.doesNotMatch(source, /\bDROP\s+(?:TABLE|SCHEMA|FUNCTION)\b/i);
  assert.doesNotMatch(source, /\bCREATE\s+USER\b/i);
});

test('runtime proof remains separate from deterministic SQL/source tests', () => {
  assert.match(source, /This SQL test is not signed-HTTP\/JWT proof/);
  assert.match(source, /provides no runtime PASS/);
});
