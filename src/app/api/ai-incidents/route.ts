import { z } from 'zod';

import { buildAiIncidentTriagePlan, normalizeAiIncidentCategory, normalizeAiIncidentReportStatus, normalizeAiIncidentSeverity } from '@/lib/ai-governance/incidents';
import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { createAuditEvent } from '@/server/queries/audit-events';
import { createAiIncident, listAiIncidents } from '@/server/queries/ai-incidents';
import { listAiSystems } from '@/server/queries/ai-systems';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';
import { parseJsonBodyWithZod, requireApiUser, secureApiError } from '@/server/security/api-guards';

const AI_INCIDENT_JSON_MAX_BYTES = 64 * 1024;

const aiIncidentBodySchema = z.object({
  title: z.string().trim().min(3).max(180),
  summary: z.string().trim().min(12).max(6000),
  aiSystemId: z.string().trim().max(96).nullable().optional(),
  severity: z.unknown().optional(),
  category: z.unknown().optional(),
  detectedAt: z.string().trim().max(80).nullable().optional(),
  reportStatus: z.unknown().optional(),
  authority: z.string().trim().max(160).nullable().optional(),
  internalOwner: z.string().trim().max(160).nullable().optional(),
});

function asText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeDetectedAt(value: unknown) {
  const text = asText(value);
  if (!text || Number.isNaN(Date.parse(text))) return new Date().toISOString();
  return new Date(text).toISOString();
}

function rateLimitDeniedResponse(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));

  return noStoreJson(
    {
      error: result.reason ? 'security_control_unavailable' : 'rate_limit_exceeded',
      retryAfter,
    },
    {
      status: result.reason ? 503 : 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}

export async function GET() {
  try {
    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);

    if (!organization) {
      return noStoreJson({ error: 'organization_required' }, { status: 403 });
    }

    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'read_ai_incidents',
    });

    if (!permission.ok) {
      return permissionDeniedResponse(permission);
    }

    const [incidents, systems] = await Promise.all([
      listAiIncidents(organization.id),
      listAiSystems(organization.id),
    ]);

    return noStoreJson({ incidents, systems, role: permission.role });
  } catch (error) {
    return secureApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedOrigin(request);
    if (originDenied) return originDenied;

    const user = await requireApiUser();
    const organization = await getCurrentOrganizationForUser(user.id);

    if (!organization) {
      return noStoreJson({ error: 'organization_required' }, { status: 403 });
    }

    const permission = await assertOrganizationPermission({
      userId: user.id,
      organizationId: organization.id,
      permission: 'manage_ai_incidents',
    });

    if (!permission.ok) {
      return permissionDeniedResponse(permission);
    }

    const rateLimit = await checkDistributedRateLimit({
      key: `ai-incidents:create:${organization.id}:${user.id}`,
      limit: 20,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return rateLimitDeniedResponse(rateLimit);
    }

    const body = await parseJsonBodyWithZod(request, {
      schema: aiIncidentBodySchema,
      maxBytes: AI_INCIDENT_JSON_MAX_BYTES,
    });
    const systems = await listAiSystems(organization.id);
    const requestedSystemId = asText(body.aiSystemId) || null;
    const aiSystemId = requestedSystemId && systems.some((system) => system.id === requestedSystemId) ? requestedSystemId : null;
    const severity = normalizeAiIncidentSeverity(body.severity);
    const category = normalizeAiIncidentCategory(body.category);
    const detectedAt = normalizeDetectedAt(body.detectedAt);
    const triage = buildAiIncidentTriagePlan({ severity, category, detectedAt });
    const explicitStatus = normalizeAiIncidentReportStatus(body.reportStatus);
    const reportStatus = explicitStatus === 'draft' ? triage.recommendedStatus : explicitStatus;

    const incident = await createAiIncident({
      organizationId: organization.id,
      createdBy: user.id,
      aiSystemId,
      title: body.title,
      summary: body.summary,
      category,
      severity,
      detectedAt,
      reportStatus,
      authority: asText(body.authority) || null,
      internalOwner: asText(body.internalOwner) || null,
      deadlinePlan: triage.deadlines,
      nextActions: triage.nextActions,
    });

    await createAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'ai_incident_created',
      entityType: 'ai_incident',
      entityId: incident.id,
      metadata: {
        aiSystemId,
        category,
        severity,
        reportStatus,
        escalationLevel: triage.escalationLevel,
        deadlineCount: triage.deadlines.length,
        actorRole: permission.role,
      },
    });

    return noStoreJson({ incident, triage });
  } catch (error) {
    return secureApiError(error);
  }
}
