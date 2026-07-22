import { z } from 'zod';

import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import { approveProviderDataProgram, createProviderDataProgram, createProviderDataset, listProviderDataSnapshot, rollbackProviderDataCreate } from '@/server/queries/provider-data-governance';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const MAX_BYTES = 96 * 1024;
const workflows = ['program_create','dataset_create','program_approve'] as const;
type Workflow = (typeof workflows)[number];
const programSchema = z.object({ systemReference: z.string().trim().min(3).max(240), applicability: z.enum(['required','not_required','uncertain']), providerRole: z.enum(['provider','not_provider','uncertain']) });
const datasetSchema = z.object({ programId: z.string().uuid(), name: z.string().trim().min(3).max(240), purpose: z.string().trim().min(10).max(4000), lifecycleRole: z.enum(['training','validation','testing','reference','fine_tuning','retrieval','synthetic','monitoring']), sourceCategory: z.enum(['internal','third_party','public','synthetic','user_generated','mixed']), datasetVersion: z.string().trim().min(1).max(160), sourceVersion: z.string().trim().min(1).max(160) });
const approveSchema = z.object({ programId: z.string().uuid(), expectedUpdatedAt: z.string().datetime({ offset: true }), rationale: z.string().trim().min(10).max(4000) });

function workflowOf(request: Request): Workflow | null { const value = new URL(request.url).searchParams.get('workflow'); return workflows.includes(value as Workflow) ? value as Workflow : null; }
function denied(result: RateLimitResult) { const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)); return noStoreJson({ error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded', retryAfter }, { status: result.reason ? 503 : 429, headers: { 'Retry-After': String(retryAfter) } }); }
async function audit(request: Request, input: { organizationId: string; userId: string; role: string; action: string; entityType: string; entityId: string; metadata?: Record<string, unknown> }) { return createAuditEvent({ organizationId: input.organizationId, actorUserId: input.userId, action: input.action, entityType: input.entityType, entityId: input.entityId, metadata: { ...input.metadata, actorRole: input.role }, requestContext: buildAuditRequestContextFromRequest(request) }); }

export async function GET() {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({ userId: user.id, organizationId: organization.id, permission: 'read_ai_governance' });
    if (!permission.ok) return permissionDeniedResponse(permission);
    return noStoreJson({ ...(await listProviderDataSnapshot(organization.id)), role: permission.role });
  } catch (error) { return secureApiError(error); }
}

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request); if (originDenied) return originDenied;
    const workflow = workflowOf(request); if (!workflow) return noStoreJson({ error: 'unsupported_workflow' }, { status: 400 });
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id); if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });
    const permission = await assertOrganizationPermission({ userId: user.id, organizationId: organization.id, permission: 'manage_ai_governance' });
    if (!permission.ok) return permissionDeniedResponse(permission);
    const limit = await checkDistributedRateLimit({ key: `provider-data:${workflow}:${organization.id}:${user.id}`, limit: 10, windowMs: 60_000 });
    if (!limit.allowed) return denied(limit);

    if (workflow === 'program_create') {
      const body = await parseJsonBodyWithZod(request, { schema: programSchema, maxBytes: MAX_BYTES });
      const transition = await createProviderDataProgram({ organizationId: organization.id, actorUserId: user.id, ...body });
      if (transition?.outcome !== 'created' || !transition.program) return noStoreJson({ error: 'provider_data_program_create_rejected' }, { status: 400 });
      const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'provider_data_program_created', entityType: 'ai_provider_data_program', entityId: transition.program.id });
      if (!event.persisted) { await rollbackProviderDataCreate('ai_provider_data_programs', organization.id, transition.program.id); return noStoreJson({ error: 'provider_data_audit_unavailable' }, { status: 503 }); }
      return noStoreJson({ program: transition.program }, { status: 201 });
    }

    if (workflow === 'dataset_create') {
      const body = await parseJsonBodyWithZod(request, { schema: datasetSchema, maxBytes: MAX_BYTES });
      const program = (await listProviderDataSnapshot(organization.id)).programs.find((item) => item.id === body.programId);
      if (!program) return noStoreJson({ error: 'provider_data_program_not_found' }, { status: 404 });
      const dataset = await createProviderDataset({ organizationId: organization.id, actorUserId: user.id, ...body });
      const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'provider_dataset_created', entityType: 'ai_provider_dataset', entityId: dataset.id, metadata: { programId: body.programId } });
      if (!event.persisted) { await rollbackProviderDataCreate('ai_provider_datasets', organization.id, dataset.id); return noStoreJson({ error: 'provider_data_audit_unavailable' }, { status: 503 }); }
      return noStoreJson({ dataset }, { status: 201 });
    }

    const body = await parseJsonBodyWithZod(request, { schema: approveSchema, maxBytes: MAX_BYTES });
    const transition = await approveProviderDataProgram({ organizationId: organization.id, actorUserId: user.id, ...body });
    if (transition?.outcome === 'not_found') return noStoreJson({ error: 'provider_data_program_not_found' }, { status: 404 });
    if (transition?.outcome === 'state_changed') return noStoreJson({ error: 'provider_data_state_changed' }, { status: 409 });
    if (transition?.outcome === 'approver_required') return noStoreJson({ error: 'provider_data_approver_required' }, { status: 403 });
    if (transition?.outcome !== 'approved' || !transition.program) return noStoreJson({ error: 'provider_data_approval_requirements_not_met' }, { status: 409 });
    const event = await audit(request, { organizationId: organization.id, userId: user.id, role: permission.role, action: 'provider_data_program_approved', entityType: 'ai_provider_data_program', entityId: transition.program.id, metadata: { decisionId: transition.decision_id } });
    if (!event.persisted) return noStoreJson({ error: 'provider_data_audit_unavailable' }, { status: 503 });
    return noStoreJson({ program: transition.program });
  } catch (error) { return secureApiError(error); }
}