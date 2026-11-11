import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const source = readFileSync(
  'supabase/migrations/20261111102600_restrict_dsar_active_member_reads_to_tenant_mfa.sql',
  'utf8',
);

test('A-08 tenant member DSAR self-reads require a private MFA predicate', () => {
  assert.match(source, /create or replace function app_private\.dsar_active_member_mfa_satisfied\s*\(/i);
  assert.match(source, /security definer\s+set search_path = pg_catalog/i);
  assert.match(source, /from public\.organization_members om/i);
  assert.match(source, /om\.user_id = \(select auth\.uid\(\)\)/i);
  assert.match(source, /lower\(coalesce\(om\.status, ''\)\) = 'active'/i);
  assert.match(source, /not exists\s*\([\s\S]*?or public\.tenant_mfa_satisfied\(target_organization_id\)/i);
  assert.match(source, /create policy dsar_require_mfa_for_active_members\s+on public\.data_subject_requests\s+as restrictive\s+for select\s+to authenticated/i);
  assert.match(source, /using \(app_private\.dsar_active_member_mfa_satisfied\(organization_id\)\)/i);
  assert.doesNotMatch(source, /drop policy\s+"data subjects read own requests"/i);
});

test('A-08 DSAR helper denies public and anon execution and preserves FORCE RLS', () => {
  assert.match(source, /revoke all on function app_private\.dsar_active_member_mfa_satisfied\(uuid\) from public, anon/i);
  assert.match(source, /grant execute on function app_private\.dsar_active_member_mfa_satisfied\(uuid\) to authenticated, service_role/i);
  assert.match(source, /permissive = 'RESTRICTIVE'/i);
  assert.match(source, /dsar_rls_force_rls_required/i);
  assert.match(source, /begin;\s*[\s\S]*commit;/i);
});
