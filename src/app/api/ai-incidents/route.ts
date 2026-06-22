import { buildAiIncidentTriagePlan, normalizeAiIncidentCategory, normalizeAiIncidentReportStatus, normalizeAiIncidentSeverity } from '@/lib/ai-governance/incidents';
import { checkDistributedRateLimit, type RateLimitResult } from '@/lib/security/rate-limit';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { createAuditEvent } from '@/server/queries/audit-events';
import { createAiIncident, listAiIncidents } from '@/server/queries/ai-incidents';
import { listAiSystems } from '@/server/queries/ai-systems';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { noStoreJson } from '@/server/security/no-store';

const AI_INCIDENT_JSON_MAX_BYTES = 64 * 1024;

function asText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function getErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code } = error as { code?: unknown };
    return typeof code === 'string' ? code : 'unknown';
  }
  return 'unknown';
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
  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'Organization not found' }, { status: 404 });
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
}

export async function POST(request: Request) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const user = await getCurrentUser();

  if (!user) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return noStoreJson({ error: 'Organization not found' }, { status: 404 });
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
    key: `ai-incidents:create:${organization.id}`,
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitDeniedResponse(rateLimit);
  }

  const payload = await readBoundedJsonRequest<Record<string, unknown>>(request, {
    maxBytes: AI_INCIDENT_JSON_MAX_BYTES,
  }).catch(() => null);

  if (!payload) {
    return noStoreJson({ error: 'invalid_json_body' }, { status: 400 });
  }

  const body = payload;
  const title = asText(body.title);
  const summary = asText(body.summary);

  if (title.length < 3) {
    return noStoreJson({ error: 'Title is required' }, { status: 400 });
  }

  if (summary.length < 12) {
    return noStoreJson({ error: 'Summary must describe what happened' }, { status: 400 });
  }

  const systems = await listAiSystems(organization.id);
  const requestedSystemId = asText(body.aiSystemId) || null;
  const aiSystemId = requestedSystemId && systems.some((system) => system.id === requestedSystemId) ? requestedSystemId : null;
  const severity = normalizeAiIncidentSeverity(body.severity);
  const category = normalizeAiIncidentCategory(body.category);
  const detectedAt = normalizeDetectedAt(body.detectedAt);
  const triage = buildAiIncidentTriagePlan({ severity, category, detectedAt });
  const explicitStatus = normalizeAiIncidentReportStatus(body.reportStatus);
  const reportStatus = explicitStatus === 'draft' ? triage.recommendedStatus : explicitStatus;

  try {
    const incident = await createAiIncident({
      organizationId: organization.id,
      createdBy: user.id,
      aiSystemId,
      title,
      summary,
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
    const code = getErrorCode(error);

    if (code === '42P01' || code === 'PGRST205') {
      return noStoreJson(
        { error: 'ai_incidents_table_missing', message: 'Apply the AI incident register Supabase migration before creating incidents.' },
        { status: 503 },
      );
    }

    return noStoreJson({ error: 'Could not create AI incident' }, { status: 500 });
  }
}
