import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const file = 'docs/security/proposals/SEC01_QA_TENANT_MFA_SESSION_REVOCATION_REVIEW_ONLY.sql';
const migration = readFileSync(file, 'utf8');

describe('SEC-01 QA-only session revocation RLS correction', () => {
  it('is QA review-only, transactional, and never an automatic Production DDL step', () => {
    expect(migration).toContain('QA-ONLY FORWARD REMEDIATION CANDIDATE');
    expect(migration).toContain('NEVER AUTOMATICALLY APPLY');
    expect(migration).toContain('independent qualified Security/DB review');
    expect(migration).toContain('DAT-01 migration provenance decision');
    expect(migration).toContain('DO NOT EXECUTE ON PRODUCTION');
    expect(migration).toMatch(/\nBEGIN;\n/);
    expect(migration).toMatch(/\nCOMMIT;\n\s*$/);
  });

  it('demands a live session bound to the authenticated UUID user', () => {
    expect(migration).toContain("WHEN public.current_legacy_user_id() IS NOT NULL THEN");
    expect(migration).toContain("COALESCE(auth.jwt() ->> 'role', '') = 'authenticated'");
    expect(migration).toContain("COALESCE(auth.jwt() ->> 'is_anonymous', 'false') = 'false'");
    expect(migration).toMatch(/WHEN COALESCE\(auth\.jwt\(\) ->> 'session_id', ''\) ~\*/);
    expect(migration).toContain("FROM auth.sessions AS s");
    expect(migration).toContain("s.id = (auth.jwt() ->> 'session_id')::uuid");
    expect(migration).toContain("s.user_id = public.current_legacy_user_id()");
    expect(migration).toContain("(s.not_after IS NULL OR s.not_after > pg_catalog.now())");
    expect(migration.indexOf("WHEN COALESCE(auth.jwt() ->> 'session_id', '') ~*"))
      .toBeLessThan(migration.indexOf("s.id = (auth.jwt() ->> 'session_id')::uuid"));
    expect(migration).toMatch(/ELSE false\s+END\s+WHEN public\.current_clerk_user_id\(\)/);
  });

  it('retains historical non-UUID Clerk identity path and denies unknown subjects', () => {
    expect(migration).toContain("WHEN public.current_clerk_user_id() IS NOT NULL THEN");
    expect(migration).toContain("-- Preserve historical non-UUID Clerk subjects");
    expect(migration).toMatch(/ELSE false\s+END\s+AND EXISTS/);
    expect(migration).toContain("FROM public.organization_security_settings AS oss");
    expect(migration).toContain("NOT oss.require_mfa_for_all_users");
    expect(migration).toContain("COALESCE(auth.jwt() ->> 'aal', '') = 'aal2'");
  });

  it('does not widen execution privileges or turn off RLS', () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.tenant_mfa_satisfied(target_organization_id uuid)");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path TO 'pg_catalog', 'public'");
    expect(migration).toContain("has_function_privilege('anon',predicate_oid,'EXECUTE')");
    expect(migration).toContain("has_function_privilege('authenticated',predicate_oid,'EXECUTE')");
    expect(migration).toContain("has_function_privilege('service_role',predicate_oid,'EXECUTE')");
    expect(migration).not.toMatch(/\bGRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.tenant_mfa_satisfied/i);
    expect(migration).not.toMatch(/\bDISABLE\s+ROW\s+LEVEL\s+SECURITY\b/i);
    expect(migration).not.toMatch(/\bDROP\s+(?:TABLE|SCHEMA|FUNCTION)\b/i);
  });

  it('does not misrepresent SQL simulated claims as signed HTTP evidence', () => {
    expect(migration).toContain("This SQL test is not signed-HTTP/JWT proof");
    expect(migration).toContain("provides no runtime PASS");
  });
});
