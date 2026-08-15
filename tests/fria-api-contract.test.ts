import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/ai-governance/fria/route.ts', 'utf8');
const queries = readFileSync('src/server/queries/fria.ts', 'utf8');
const page = readFileSync('src/app/[locale]/dashboard/fria/page.tsx', 'utf8');
const copy = readFileSync('src/lib/i18n/fria-workflow-copy.ts', 'utf8');
const controlTower = readFileSync('src/server/ai-governance/regulatory-control-tower.ts', 'utf8');
const evidenceGate = readFileSync('supabase/migrations/20260722121000_fria_approval_evidence_gate.sql', 'utf8');

describe('FRIA operational API contract', () => {
  it('enforces auth, tenant context and explicit read/manage permissions', () => {
    expect(route).toContain('requireApiUser()');
    expect(route).toContain('getCurrentOrganizationForUser(user.id)');
    expect(route).toContain("permission: 'read_ai_governance'");
    expect(route).toContain("permission: 'manage_ai_governance'");
    expect(route).toContain('permissionDeniedResponse(permission)');
  });

  it('protects mutations with origin, bounded Zod parsing and fail-closed rate limiting', () => {
    expect(route).toContain('assertTrustedOrigin(request)');
    expect(route).toContain('MAX_BYTES = 96 * 1024');
    expect(route).toContain('parseJsonBodyWithZod(request');
    expect(route).toContain('checkDistributedRateLimit({');
    expect(route).toContain('security_control_unavailable');
    expect(route).toContain('/^FRIA-(0[1-9]|1[0-5])$/');
  });

  it('validates AI-system ownership and uses atomic version creation', () => {
    expect(route).toContain('getAiSystem(body.aiSystemId, organization.id)');
    expect(queries).toContain("db.rpc('create_fria_assessment_atomic'");
    expect(route).toContain("created.outcome === 'system_not_found'");
    expect(route).toContain('organization_membership_required');
  });

  it('uses optimistic concurrency and immutable terminal states', () => {
    expect(route).toContain('expectedUpdatedAt');
    expect(route).toContain('fria_state_changed');
    expect(route).toContain("before.stage === 'approved' || before.stage === 'retired'");
    expect(queries).toContain(".eq('updated_at', expectedUpdatedAt)");
  });

  it('re-evaluates and approves atomically with durable compensation', () => {
    expect(route).toContain('decideFria({');
    expect(route).toContain('approveFriaAssessmentAtomic({');
    expect(route).toContain('compensateFriaApprovalAuditFailure({');
    expect(route).toContain('fria_approval_requirements_not_met');
    expect(route).toContain('rationaleLength: body.rationale.length');
    expect(route).not.toContain('metadata: { rationale: body.rationale }');
  });

  it('requires usable tenant-scoped evidence for every required control', () => {
    expect(queries).toContain('listFriaUsableEvidenceControlIds');
    expect(queries).toContain(".eq('assessment_id', assessmentId)");
    expect(queries).toContain(".in('status', ['submitted', 'accepted'])");
    expect(evidenceGate).toContain('v_required_control_ids');
    expect(evidenceGate).toContain('public.ai_fria_evidence');
    expect(evidenceGate).toContain("evidence_record.status in ('submitted', 'accepted')");
    expect(evidenceGate).toContain('requirements_not_met');
  });

  it('requires an identified legal reviewer instead of inferring legal completion', () => {
    expect(route).toContain('legalReviewerId');
    expect(route).toContain('Legal reviewer is required.');
    expect(route).toContain('legal_reviewer_id');
    expect(page).toContain('legalReviewComplete');
    expect(page).toContain('legalReviewerId');
    expect(page).not.toContain("legalReviewComplete: ['none', 'low', 'medium'].includes(residual)");
  });

  it('scopes database operations and evidence paths by organization', () => {
    const organizationFilters = queries.match(/\.eq\('organization_id'/g) ?? [];
    expect(organizationFilters).toHaveLength(8);
    expect(queries).toContain(".eq('assessment_id', assessmentId)");
    expect(route).toContain("body.storageReference.startsWith(`${organization.id}/`)");
    expect(route).not.toContain('error.message');
  });

  it('exposes the localized workspace from the control tower and inventory', () => {
    expect(page).toContain("fetch('/api/ai-governance/fria'");
    expect(page).toContain("fetch('/api/ai-systems'");
    expect(page).toContain('expectedUpdatedAt: assessment.updated_at');
    expect(page).toContain('getFriaWorkflowCopy(locale)');
    expect(copy).toContain("title: 'FRIA workspace'");
    expect(copy).toContain("title: 'Workspace FRIA'");
    expect(copy).toContain("title: 'Espace FRIA'");
    expect(copy).toContain("title: 'FRIA-Workspace'");
    expect(controlTower).toContain("route: '/dashboard/fria'");
  });
});
