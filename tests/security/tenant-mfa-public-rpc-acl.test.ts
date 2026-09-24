import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('tenant MFA public RPC ACL hardening', () => {
  it('removes direct authenticated execution while preserving service-role authority', () => {
    const sql = readFileSync(
      'supabase/migrations/20260924144500_tenant_mfa_public_rpc_acl_hardening.sql',
      'utf8',
    );

    for (const signature of [
      'public.tenant_mfa_satisfied(uuid)',
      'public.is_org_member(uuid)',
      'public.has_org_role(uuid, text[])',
    ]) {
      expect(sql).toContain(`revoke all on function ${signature} from public, anon, authenticated`);
      expect(sql).toContain(`grant execute on function ${signature} to service_role`);
    }

    expect(sql).toContain('set search_path = pg_catalog, public');
    expect(sql).toContain("has_function_privilege('authenticated'");
    expect(sql).toContain('tenant MFA public helper RPC boundary remains exposed');
  });
});
