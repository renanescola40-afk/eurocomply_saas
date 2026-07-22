import { z } from 'zod';
import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import { approveAnnexIvPackage, createAnnexIvEvidence, createAnnexIvPackage, listAnnexIvSnapshot, rollbackAnnexIvCreate, updateAnnexIvSection } from '@/server/queries/annex-iv-governance';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const MAX_BYTES = 96 * 1024;
const sectionCodes = ['general_description','system_elements_and_development','monitoring_functioning_and_control','risk_management','data_governance','performance_metrics','human_oversight','cybersecurity','lifecycle_changes','standards_and_specifications','eu_declaration_and_conformity','post_market_monitoring'] as const;
const workflows = ['package_create','section_update','evidence_submit','package_approve'] as const;
type Workflow = (typeof workflows)[number];
const createSchema = z.object({ systemReference: z.string().trim().min(3).max(240), systemVersion: z.string().trim().min(1).max(120), applicability: z.enum(['required','not_required','uncertain']) });
const sectionSchema = z.object({ packageId: z.string().uuid(), sectionCode: z.enum(sectionCodes), expectedUpdatedAt: z.string().datetime({ offset: true }), summary: z.string().trim().min(10).max(8000), sourceVersion: z.string().trim().min(1).max(160), reviewerUserId: z.string().uuid(), contentDigest: z.string().regex(/^[a-f0-9]{64}$/) });
const evidenceSchema = z.object({ packageId: z.string().uuid(), sectionId: z.string().uuid(), evidenceType: z.enum(['document','dataset','test_report','model_card','system_card','risk_record','log_sample','approval','external_report','other']), evidenceReference: z.string().trim().min(3).max(1000), evidenceDigest: z.string().regex(/^[a-f0-9]{64}$/), sourceVersion: z.string().trim().min(1).max(160) });
const approveSchema = z.object({ packageId: z.string().uuid(), expectedUpdatedAt: z.string().datetime({ offset: true }), rationale: z.string().trim().min(10).max(4000) });
function workflowOf(request: Request): Workflow | null { const value = new URL(request.url).searchParams.get('workflow'); return workflows.includes(value as Workflow) ? value as Workflow : null; }
function denied(result: RateLimitResult) { const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)); return noStoreJson({ error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded', retryAfter }, { status: result.reason ? 503 : 429, headers: { 'Retry-After': String(retryAfter) } }); }
async function audit(request: Request, input: { organizationId: string; userId: string; role: string; action: string; entityType: string; entityId: string; metadata?: Record<string, unknown> }) { return createAuditEvent({ organizationId: input.organizationId, actorUserId: input.userId, action: input.action, entityType: input.entityType, entityId: input.entityId, metadata: { ...input.metadata, actorRole: input.role }, requestContext: buildAuditRequestContextFromRequest(request) }); }

export async function GET() {
  try {
    const user = await requireApiUser(); const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({ userId: user.id, organizationId: organization.id, permission: 'read_ai_governance' });
    if (!permission.ok) return permissionDeniedResponse(permission);
    return noStoreJson({ ...(await listAnnexIvSnapshot(organization.id)), role: permission.role });
  } catch (error) { return secureApiError(error); }
}

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request); if (originDenied) return originDenied;
    const workflow = workflowOf(request); if (!workflow) return noStoreJson({ error: 'unsupported_workflow' }, { status: 400 });
    const user = await requireApiUser(); const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({ userId: user.id, organizationId: organization.id, permission: 'manage_ai_governance' });
    if (!permission.ok) return permissionDeniedResponse(permission);
    const limit = await checkDistributedRateLimit({ key: `annex-iv:${workflow}:${organization.id}:${user.id}`, limit: workflow === 'evidence_submit' ? 20 : 10, windowMs: 60_000 });
    if (!limit.allowed) return denied(limit);

    if (workflow === 'package_create') {
      const body = await parseJsonBodyWithZod(request, { schema: createSchema, maxBytes: MAX_BYTES });
      const transition = await createAnnexIvPackage({ organizationId: organization.id, actorUserId: user.id, ...body });
      if (transition?.outcome !== 'created' || !transition.package) return noStoreJson({ error: 'annex_iv_package_create_rejected' }, { status: 400 });
      const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'annex_iv_package_created', entityType: 'ai_annex_iv_package', entityId: transition.package.id });
      if (!event.persisted) { await rollbackAnnexIvCreate('ai_annex_iv_packages', organization.id, transition.package.id); return noStoreJson({ error: 'annex_iv_audit_unavailable' }, { status: 503 }); }
      return noStoreJson({ package: transition.package }, { status: 201 });
    }
    if (workflow === 'section_update') {
      const body = await parseJsonBodyWithZod(request, { schema: sectionSchema, maxBytes: MAX_BYTES });
      const section = await updateAnnexIvSection({ organizationId: organization.id, packageId: body.packageId, sectionCode: body.sectionCode, expectedUpdatedAt: body.expectedUpdatedAt, patch: { summary: body.summary, source_version: body.sourceVersion, reviewer_user_id: body.reviewerUserId, content_digest: body.contentDigest, status: 'in_review', reviewed_at: new Date().toISOString(), last_material_change_at: new Date().toISOString() } });
      if (!section) return noStoreJson({ error: 'annex_iv_state_changed' }, { status: 409 });
      const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'annex_iv_section_updated', entityType: 'ai_annex_iv_section', entityId: section.id });
      if (!event.persisted) return noStoreJson({ error: 'annex_iv_audit_unavailable' }, { status: 503 });
      return noStoreJson({ section });
    }
    if (workflow === 'evidence_submit') {
      const body = await parseJsonBodyWithZod(request, { schema: evidenceSchema, maxBytes: MAX_BYTES });
      if (!body.evidenceReference.startsWith(`${organization.id}/`) || body.evidenceReference.includes('..')) return noStoreJson({ error: 'annex_iv_evidence_scope_invalid' }, { status: 400 });
      const evidence = await createAnnexIvEvidence({ organizationId: organization.id, actorUserId: user.id, ...body });
      const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'annex_iv_evidence_submitted', entityType: 'ai_annex_iv_evidence', entityId: evidence.id });
      if (!event.persisted) { await rollbackAnnexIvCreate('ai_annex_iv_evidence', organization.id, evidence.id); return noStoreJson({ error: 'annex_iv_audit_unavailable' }, { status: 503 }); }
      return noStoreJson({ evidence }, { status: 201 });
    }
    const body = await parseJsonBodyWithZod(request, { schema: approveSchema, maxBytes: MAX_BYTES });
    const transition = await approveAnnexIvPackage({ organizationId: organization.id, actorUserId: user.id, ...body });
    if (transition?.outcome === 'not_found') return noStoreJson({ error: 'annex_iv_package_not_found' }, { status: 404 });
    if (transition?.outcome === 'state_changed') return noStoreJson({ error: 'annex_iv_state_changed' }, { status: 409 });
    if (transition?.outcome === 'approver_required') return noStoreJson({ error: 'annex_iv_approver_required' }, { status: 403 });
    if (transition?.outcome !== 'approved' || !transition.package) return noStoreJson({ error: 'annex_iv_approval_requirements_not_met' }, { status: 409 });
    const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'annex_iv_package_approved', entityType: 'ai_annex_iv_package', entityId: transition.package.id, metadata: { decisionId: transition.decision_id } });
    if (!event.persisted) return noStoreJson({ error: 'annex_iv_audit_unavailable' }, { status: 503 });
    return noStoreJson({ package: transition.package });
  } catch (error) { return secureApiError(error); }
}
