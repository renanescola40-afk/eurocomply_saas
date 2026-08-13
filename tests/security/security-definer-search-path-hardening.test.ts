import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const firstMigration = readFileSync(
  'supabase/migrations/20260812160405_harden_security_definer_search_paths.sql',
  'utf8',
).toLowerCase();
const finalMigration = readFileSync(
  'supabase/migrations/20260813102951_harden_remaining_public_security_definer_search_paths.sql',
  'utf8',
).toLowerCase();

describe('SECURITY DEFINER search-path hardening', () => {
  it.each([
    'app_private.is_org_member(uuid)',
    'app_private.has_org_role(uuid, text[])',
    'public.prevent_client_notification_scope_change()',
  ])('pins %s to pg_catalog only in the first hardening batch', (signature) => {
    expect(firstMigration).toContain(`alter function ${signature}\n  set search_path = pg_catalog`);
  });

  it.each([
    'public.append_audit_event_chained(uuid, uuid, uuid, text, text, text, jsonb, timestamptz, text, text, text, text)',
    'public.apply_enterprise_entitlement_snapshot_atomic(uuid, uuid, text, bigint, text, integer, integer, integer, jsonb, text, timestamptz, timestamptz, timestamptz, uuid)',
    'public.consume_enterprise_seat_reservation_atomic(uuid, uuid, uuid, bigint, uuid)',
    'public.reserve_enterprise_seat_atomic(uuid, text, text, bigint, uuid, uuid, text, integer)',
  ])('pins remaining privileged RPC %s to pg_catalog only', (signature) => {
    expect(finalMigration).toContain(`alter function ${signature}\n  set search_path = pg_catalog`);
  });

  it('does not reintroduce mutable schemas into either hardened search path', () => {
    expect(firstMigration).not.toMatch(/set\s+search_path\s*=\s*[^;]*(?:public|pg_temp|app_private)/);
    expect(finalMigration).not.toMatch(/set\s+search_path\s*=\s*[^;]*(?:public|pg_temp|app_private)/);
  });

  it('contains fail-closed postconditions for path and execute boundaries', () => {
    expect(firstMigration).toContain('do $security_definer_search_path_guard$');
    expect(firstMigration).toContain("raise exception 'security definer search_path hardening postcondition failed'");
    expect(finalMigration).toContain("raise exception 'security definer search_path hardening verification failed'");
    expect(finalMigration).toContain("raise exception 'security definer client execute boundary verification failed'");
    expect(finalMigration).toContain("raise exception 'security definer service role execute boundary verification failed'");
    expect(finalMigration).toContain("has_function_privilege('anon', p.oid, 'execute')");
    expect(finalMigration).toContain("has_function_privilege('authenticated', p.oid, 'execute')");
    expect(finalMigration).toContain("has_function_privilege('service_role', p.oid, 'execute')");
  });

  it('does not mutate application rows', () => {
    expect(firstMigration).not.toMatch(/\b(?:insert\s+into|update|delete\s+from|truncate)\b/);
    expect(finalMigration).not.toMatch(/\b(?:insert\s+into|update|delete\s+from|truncate)\b/);
  });
});
