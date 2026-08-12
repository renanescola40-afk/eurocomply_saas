import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260804224915_live_security_definer_acl_hardening.sql',
  'utf8',
).toLowerCase();

describe('live security-definer ACL hardening migration', () => {
  it('removes client execution from the legacy auth deletion RPC', () => {
    expect(migration).toContain(
      'revoke all on function public.delete_user_account(uuid) from public, anon, authenticated',
    );
    expect(migration).toContain(
      'grant execute on function public.delete_user_account(uuid) to service_role',
    );
    expect(migration).toContain('set search_path = pg_catalog, auth');
  });

  it.each([
    'public.is_org_member(uuid)',
    'public.has_org_role(uuid, text[])',
    'public.has_org_write_role(uuid)',
    'public.live_rls_validation_is_org_member(uuid)',
  ])('removes anonymous execution from %s', (signature) => {
    expect(migration).toContain(`revoke all on function ${signature} from public, anon`);
  });

  it.each([
    'public.prevent_client_notification_scope_change()',
    'public.set_ai_systems_updated_at()',
    'public.set_ai_incidents_updated_at()',
  ])('keeps trigger function %s out of client RPC scope', (signature) => {
    expect(migration).toContain(
      `revoke all on function ${signature} from public, anon, authenticated`,
    );
  });

  it('contains no application-row mutation statements', () => {
    expect(migration).not.toMatch(/\b(?:insert\s+into|update|delete\s+from|truncate|drop\s+table)\b/);
  });
});