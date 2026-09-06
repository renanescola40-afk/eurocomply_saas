import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260906006800_harden_cross_tenant_reference_integrity.sql',
  'utf8',
);
const postconditions = readFileSync(
  'scripts/supabase/verify-cross-tenant-reference-integrity-postconditions.sql',
  'utf8',
);

describe('V39 PUBLIC function ACL verification', () => {
  for (const [label, source] of [
    ['migration', migration],
    ['postconditions', postconditions],
  ] as const) {
    it(`${label} inspects the PUBLIC ACL pseudo-role without treating it as a login role`, () => {
      expect(source).toContain('aclexplode(');
      expect(source).toContain("acldefault('f', function_record.proowner)");
      expect(source).toContain('privilege.grantee = 0');
      expect(source).toContain("privilege.privilege_type = 'EXECUTE'");
      expect(source).not.toContain("has_function_privilege('public'");
    });
  }
});
