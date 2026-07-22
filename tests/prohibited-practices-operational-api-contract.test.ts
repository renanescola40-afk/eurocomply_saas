import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/ai-governance/prohibited-practices/route.ts', 'utf8');
const queries = readFileSync('src/server/queries/prohibited-practices.ts', 'utf8');
const page = readFileSync('src/app/[locale]/dashboard/prohibited-practices/page.tsx', 'utf8');
const tower = readFileSync('src/server/ai-governance/regulatory-control-tower.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260722130000_prohibited_practices_operational_workflow.sql', 'utf8');
const counters = readFileSync('supabase/migrations/20260722130500_prohibited_practices_operational_counters.sql', 'utf8');

describe('prohibited practices operational workflow', () => {
  it('enforces auth, tenant context, RBAC, origin, Zod and fail-closed rate limiting', () => {
    expect(route).toContain('requireApiUser()');
    expect(route).toContain('getCurrentOrganizationForUser(user.id)');
    expect(route).toContain("permission: 'read_ai_governance'");
    expect(route).toContain("permission: 'manage_ai_governance'");
    expect(route).toContain('assertTrustedOrigin(request)');
    expect(route).toContain('parseJsonBodyWithZod(request');
    expect(route).toContain('checkDistributedRateLimit({');
    expect(route).toContain('security_control_unavailable');
  });

  it('scopes reads, writes, RPCs and evidence references to the active organization', () => {
    expect(queries.match(/\.eq\('organization_id'/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(queries.match(/p_organization_id: input\.organizationId/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(route).toContain("body.evidenceReference.startsWith(`${organization.id}/`)");
    expect(route).not.toContain('error.message');
  });

  it('creates all eight signals under an advisory lock and restricts RPC execution', () => {
    expect(migration).toContain('create_prohibited_practices_review_atomic');
    expect(migration).toContain('pg_catalog.pg_advisory_xact_lock');
    expect(migration).toContain('coalesce(max(r.review_version), 0) + 1');
    for (const signal of ['subliminal_manipulation','vulnerability_exploitation','social_scoring','criminal_risk_prediction','untargeted_facial_scraping','emotion_inference_workplace_education','biometric_categorisation_sensitive_traits','real_time_remote_biometric_public_space']) expect(migration).toContain(signal);
    expect(migration).toContain('to service_role');
    expect(migration).toContain('from public, anon, authenticated');
  });

  it('synchronizes evidence and parent review counters transactionally', () => {
    expect(counters).toContain('sync_prohibited_practice_signal_evidence');
    expect(counters).toContain('refresh_prohibited_practice_review');
    expect(counters).toContain('evidence_count = v_count');
    expect(counters).toContain("then 'approved'");
    expect(counters).toContain('positive_signal_count = coalesce(v_positive, 0)');
    expect(counters).toContain('unresolved_signal_count = coalesce(v_unresolved, 0)');
  });

  it('approves atomically only after eight evidence-complete signal reviews', () => {
    expect(migration).toContain('approve_prohibited_practices_review_atomic');
    expect(migration).toContain('v_signal_count <> 8');
    expect(migration).toContain('v_ready_count <> 8');
    expect(migration).toContain('s.evidence_count > 0');
    expect(migration).toContain("s.status = 'approved'");
    expect(migration).toContain('decision_type, outcome');
    expect(migration).toContain("'review_approved', 'approved'");
  });

  it('exposes the workspace through the Control Tower', () => {
    expect(page).toContain("fetch('/api/ai-governance/prohibited-practices'");
    expect(page).toContain('Prohibited Practices Workspace');
    expect(tower).toContain("route: '/dashboard/prohibited-practices'");
  });
});
