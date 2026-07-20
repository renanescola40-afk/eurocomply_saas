import { z } from 'zod';

import {
  normalizeAiIncidentCategory,
  normalizeAiIncidentReportStatus,
  normalizeAiIncidentSeverity,
} from '@/lib/ai-governance/incidents';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { getAiIncidentWithHistory, updateAiIncidentAtomic } from '@/server/queries/ai-incident-lifecycle';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

const AI_INCIDENT_UPDATE_MAX_BYTES = 64 * 1024;

const updateSchema = z
  .object({
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    aiSystemId: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(3).max(180).optional(),
    summary: z.string().trim().min(12).max(6000).optional(),
    category: z.unknown().optional(),
    severity: z.unknown().optional(),
    reportStatus: z.unknown().optional(),
    authority: z.string().trim().max(160).nullable().optional(),
    internalOwner: z.string().trim().max(160).nullable().optional(),
    deadlinePlan: z.array(z.object({
      label: z.string().trim().min(1).max(180),
      dueAt: z.string().datetime({ offset: true }).nullable(),
      priority: z.enum(['immediate', 'high', 'standard']),
      description: z.string().trim().min(1).max(1200),
    })).max(20).optional(),
    nextActions: z.array(z.string().trim().min(1).max(600)).max(50).optional(),
  })
  .refine(
    (value) => Object.keys(value).some((key) => key !== 'expectedUpdatedAt'),
    { message: 'At least one incident field must be supplied.' },
  );

type IncidentRouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: IncidentRouteParams) {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'read_ai_incidents',
    });
    if (!permission.ok) return permissionDeniedResponse(permission);

    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return noStoreJson({ error: 'invalid_incident_id' }, { status: 400 });

    const result = await getAiIncidentWithHistory(id, organization.id);
    if (!result.incident) return noStoreJson({ error: 'ai_incident_not_found' }, { status: 404 });
    return noStoreJson({ ...result, role: permission.role });
  } catch (error) {
    return secureApiError(error);
  }
}

export async function PATCH(request: Request, { params }: IncidentRouteParams) {
  try {
    const originDenied = assertTrustedOrigin(request);
    if (originDenied) return originDenied;

    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) return noStoreJson({ error: 'organization_required' }, { status: 403 });

    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_ai_incidents',
    });
    if (!permission.ok) return permissionDeniedResponse(permission);

    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return noStoreJson({ error: 'invalid_incident_id' }, { status: 400 });

    const rateLimit = await checkDistributedRateLimit({
      key: `ai-incidents:update:${organization.id}:${user.id}`,
      limit: 40,
      windowMs: 60 * 1000,
    });
    if (!rateLimit.allowed) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      return noStoreJson(
        { error: rateLimit.reason ? 'security_control_unavailable' : 'rate_limit_exceeded', retryAfter },
        { status: rateLimit.reason ? 503 : 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }

    const body = await parseJsonBodyWithZod(request, {
      schema: updateSchema,
      maxBytes: AI_INCIDENT_UPDATE_MAX_BYTES,
    });

    const reportStatus = body.reportStatus === undefined ? undefined : normalizeAiIncidentReportStatus(body.reportStatus);
    const category = body.category === undefined ? undefined : normalizeAiIncidentCategory(body.category);
    const severity = body.severity === undefined ? undefined : normalizeAiIncidentSeverity(body.severity);
    const auditMetadata = {
      previousVersion: body.expectedUpdatedAt,
      requestedStatus: reportStatus ?? null,
      severity: severity ?? null,
      category: category ?? null,
      actorRole: permission.role,
      linkedAiSystemChanged: body.aiSystemId !== undefined,
    };

    const result = await updateAiIncidentAtomic(id, {
      organizationId: organization.id,
      actorUserId: user.id,
      expectedUpdatedAt: body.expectedUpdatedAt,
      aiSystemId: body.aiSystemId,
      title: body.title,
      summary: body.summary,
      category,
      severity,
      reportStatus,
      authority: body.authority,
      internalOwner: body.internalOwner,
      deadlinePlan: body.deadlinePlan,
      nextActions: body.nextActions,
      auditMetadata,
    });

    if (result.status === 'conflict') return noStoreJson({ error: 'ai_incident_state_changed' }, { status: 409 });
    if (result.status === 'not_found') return noStoreJson({ error: 'ai_incident_not_found' }, { status: 404 });
    if (result.status === 'invalid_transition') return noStoreJson({ error: 'invalid_incident_transition' }, { status: 409 });
    if (result.status === 'authority_required') return noStoreJson({ error: 'authority_required_for_reported_incident' }, { status: 400 });
    if (result.status === 'invalid_ai_system') return noStoreJson({ error: 'invalid_ai_system_reference' }, { status: 400 });

    return noStoreJson({ incident: result.incident });
  } catch (error) {
    return secureApiError(error);
  }
}
