import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260812160405_harden_security_definer_search_paths.sql',
  'utf8',
).toLowerCase();

describe('SECURITY DEFINER search-path hardening', () => {
  it.each([
    'app_private.is_org_member(uuid)',
    'app_private.has_org_role(uuid, text[])',
    'public.prevent_client_notification_scope_change()',
  ])('pins %s to pg_catalog only', (signature) => {
    expect(migration).toContain(
      `alter function ${signature}\n  set search_path = pg_catalog`,
    );
  });

  it('does not reintroduce mutable schemas into the hardened search path', () => {
    expect(migration).not.toMatch(/set\s+search_path\s*=\s*[^;]*(?:public|pg_temp|app_private)/);
  });

  it('contains a fail-closed postcondition guard', () => {
    expect(migration).toContain('do $security_definer_search_path_guard$');
    expect(migration).toContain("<> 'search_path=pg_catalog'");
    expect(migration).toContain(
      "raise exception 'security definer search_path hardening postcondition failed'",
    );
  });

  it('does not mutate application rows or privileges', () => {
    expect(migration).not.toMatch(/\b(?:insert\s+into|update|delete\s+from|truncate)\b/);
    expect(migration).not.toMatch(/\b(?:grant|revoke)\b/);
  });
});
