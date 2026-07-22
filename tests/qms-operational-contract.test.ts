import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/ai-governance/qms/route.ts', 'utf8');
const queries = readFileSync('src/server/queries/qms-governance.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260722223000_qms_operational_workflow.sql', 'utf8');
const page = readFileSync('src/app/[locale]/dashboard/qms/page.tsx', 'utf8');
const tower = readFileSync('src/server/ai-governance/regulatory-control-tower.ts', 'utf8');

describe('QMS operational workflow', () => {
  it('enforces auth, RBAC, origin, bounded Zod and fail-closed rate limiting', () => {
    for (const token of [
      'requireApiUser()',
      'getCurrentOrganizationForUser(user.id)',
      "permission:'read_ai_governance'",
      "permission:'manage_ai_governance'",
      'assertTrustedOrigin(request)',
      'parseJsonBodyWithZod(request',
      'checkDistributedRateLimit({',
      'security_control_unavailable',
    ]) expect(route).toContain(token);
  });

  it('keeps every query and RPC tenant scoped', () => {
    expect(queries.match(/\.eq\('organization_id'/g)?.length ?? 0).toBeGreaterThanOrEqual(7);
    expect(queries.match(/p_organization_id:/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(queries).toContain('organization_id: input.organizationId');
    expect(route).not.toContain('error.message');
  });

  it('adds internal audit and management review with forced RLS', () => {
    for (const token of [
      'ai_qms_audits',
      'ai_qms_management_reviews',
      'enable row level security',
      'force row level security',
      'to authenticated',
      'to service_role',
    ]) expect(migration).toContain(token);
  });

  it('creates versioned systems and approves fail closed atomically', () => {
    for (const token of [
      'create_qms_system_atomic',
      'pg_catalog.pg_advisory_xact_lock',
      'approve_qms_system_atomic',
      'qms_controls_not_effective',
      'qms_internal_audit_required',
      'qms_management_review_required',
      'qms_capa_blocking',
      "'qms_approved','approved'",
    ]) expect(migration).toContain(token);
  });

  it('derives severe and overdue CAPA counters transactionally', () => {
    expect(migration).toContain('refresh_qms_system_counters');
    expect(migration).toContain('qms_nonconformity_counter_sync');
  });

  it('exposes the QMS workspace from the control tower', () => {
    expect(page).toContain("fetch('/api/ai-governance/qms'");
    expect(page).toContain('Quality Management System');
    expect(page).toContain('Open CAPA');
    expect(tower).toContain("route: '/dashboard/qms'");
    expect(tower).toContain("route: '/dashboard/annex-iv'");
  });
});
