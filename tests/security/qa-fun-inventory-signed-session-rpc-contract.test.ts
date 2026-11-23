import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const install = readFileSync('scripts/qa/qa-fun-inventory-signed-session-rpcs-install.sql', 'utf8');
const rollback = readFileSync('scripts/qa/qa-fun-inventory-signed-session-rpcs-rollback.sql', 'utf8');

describe('FUN-QA signed-session inventory SQL source contract', () => {
  it('keeps both legacy privileged atomics closed to public Auth roles', () => {
    expect(install).toContain("has_function_privilege('anon',");
    expect(install).toContain("has_function_privilege('authenticated',");
    expect(install).toContain('qa_ai_inventory_privileged_rpc_acl_not_restricted');
    expect(install).not.toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.(?:create_ai_system_atomic|reassess_ai_system_atomic)/i);
    expect(install).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+app_private\.qa_require_ai_inventory_actor\(uuid\)\s+FROM\s+PUBLIC,\s*anon,\s*authenticated/i);
  });

  it('derives the actor only from a signed AAL2 Auth session, checking revocation and MFA', () => {
    expect(install).toContain('v_actor uuid := auth.uid()');
    expect(install).toContain("auth.jwt() ->> 'session_id'");
    expect(install).toContain("auth.jwt() ->> 'role'");
    expect(install).toContain("auth.jwt() ->> 'aal'");
    expect(install).toContain("'aal2'");
    expect(install).toContain('FROM auth.sessions AS s');
    expect(install).toContain('s.user_id = v_actor');
    expect(install).toContain('s.factor_id IS NOT NULL');
    expect(install).toContain('s.not_after IS NULL OR s.not_after > pg_catalog.now()');
    expect(install).not.toMatch(/p_actor_user_id\s+uuid/i);
    expect(install).not.toContain('raw_user_meta_data');
  });

  it('requires an active own-tenant writer membership, MFA, and commercial authority', () => {
    expect(install).toContain('m.organization_id = p_organization_id');
    expect(install).toContain('m.user_id = v_actor');
    expect(install).toContain("m.status = 'active'");
    expect(install).toContain("m.role IN ('owner', 'admin', 'editor', 'compliance_manager')");
    expect(install).toContain('app_private.has_org_role(');
    expect(install).toContain('app_private.resolve_commercial_plan(p_organization_id) IS NULL');
    expect(install).toContain("USING ERRCODE = '42501'");
  });

  it('keeps all inventory writes inaccessible to public signed sessions pending classification and audit', () => {
    expect(install).toContain('qa_ai_inventory_existing_bridge_requires_independent_review');
    expect(install).toContain("to_regprocedure('public.qa_create_ai_system_for_session(uuid,jsonb)')");
    expect(install).toContain("to_regprocedure('public.qa_reassess_ai_system_for_session(uuid,uuid,timestamptz,jsonb)')");
    expect(install).not.toMatch(/CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION\\s+public\\.qa_(?:create|reassess)_ai_system_for_session/i);
    expect(install).not.toMatch(/GRANT\\s+EXECUTE\\s+ON\\s+FUNCTION/i);
    expect(install).not.toMatch(/\\bGRANT\\s+(?:ALL|SELECT|INSERT|UPDATE|DELETE)\\s+ON\\s+TABLE\\b/i);
    expect(install).not.toMatch(/\\bDISABLE\\s+ROW\\s+LEVEL\\s+SECURITY\\b/i);
    expect(install).toContain('CREATE FUNCTION app_private.qa_require_ai_inventory_actor');
    expect(install).not.toContain('CREATE OR REPLACE FUNCTION app_private.qa_require_ai_inventory_actor');
    const apiCreate = readFileSync('src/app/api/ai-systems/route.ts', 'utf8');
    const apiReassess = readFileSync('src/app/api/ai-systems/[id]/route.ts', 'utf8');
    for (const route of [apiCreate, apiReassess]) {
      expect(route).toContain('classifyParsedAiSystemBody');
      expect(route).toContain('createAuditEvent');
      expect(route).toContain('if (!audit.persisted)');
    }
  });

  it('keeps the QA installer transactional and rollback scoped to new functions', () => {
    expect(install).toMatch(/^BEGIN;/m);
    expect(install).toMatch(/COMMIT;\s*$/);
    expect(rollback).toMatch(/^BEGIN;/m);
    expect(rollback).toMatch(/COMMIT;\s*$/);
    expect(rollback).toContain('DROP FUNCTION IF EXISTS');
    expect(rollback).toContain('qa_require_ai_inventory_actor(uuid)');
    expect(rollback).toContain('qa_inventory_exposed_bridge_requires_separate_rollback');
    expect(rollback).not.toMatch(/\\bDROP\\s+FUNCTION\\s+(?:IF\\s+EXISTS\\s+)?public\\.qa_(?:create|reassess)_ai_system_for_session/i);
    expect(rollback).not.toMatch(/\bDROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?public\.(?:create_ai_system_atomic|reassess_ai_system_atomic)/i);
  });
});
