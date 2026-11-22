// Source-contract checks ONLY for an unapplied proposal. Not a PostgreSQL,
// provider-issued JWT, session-revocation, HTTP, or accepted SEC-01 test.
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const sql = readFileSync(new URL('../../docs/security/proposals/SEC01_AAL1_MFA_BOOTSTRAP_DRAFT.sql', import.meta.url), 'utf8');

test('draft source stays non-migration and limits direct invocation to authenticated', () => {
  assert.match(sql, /SOURCE REVIEW ONLY, NOT AN APPLIED MIGRATION/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_my_mfa_bootstrap_context\(\)/i);
  assert.match(sql, /RETURNS TABLE \(organization_id uuid, require_mfa_for_all_users boolean\)/i);
  assert.match(sql, /SECURITY DEFINER\s+SET search_path = ''/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.get_my_mfa_bootstrap_context\(\)\s+FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_my_mfa_bootstrap_context\(\)\s+TO authenticated/i);
  assert.doesNotMatch(sql, /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)\s+ON\s+public\./i);
});

test('draft binds subject to provider JWT plus live session, never a user argument', () => {
  assert.match(sql, /actor_id := auth\.uid\(\)/i);
  assert.match(sql, /auth\.jwt\(\) ->> 'session_id'/i);
  assert.match(sql, /FROM auth\.sessions AS s/i);
  assert.match(sql, /s\.user_id = actor_id/i);
  assert.match(sql, /auth\.jwt\(\) ->> 'is_anonymous'/i);
  assert.doesNotMatch(sql, /get_my_mfa_bootstrap_context\(\s*\w+\s+uuid/i);
  assert.doesNotMatch(sql, /user_metadata|raw_user_meta_data/i);
});

test('draft enforces own active and recognized membership, missing policy fail closed', () => {
  assert.match(sql, /m\.user_id = actor_id/g);
  assert.match(sql, /m\.status\)\) = 'active'/i);
  assert.match(sql, /settings\.organization_id IS NULL OR settings\.require_mfa_for_all_users IS NULL/i);
  assert.match(sql, /RAISE EXCEPTION 'mfa_bootstrap_policy_unavailable'/i);
  assert.match(sql, /ORDER BY m\.organization_id LIMIT 21/i);
  assert.match(sql, /context_rows > 20/i);
  assert.doesNotMatch(sql, /SELECT\s+\*\s+FROM\s+public\.organizations/i);
});
