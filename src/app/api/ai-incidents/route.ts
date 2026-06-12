import { NextResponse } from 'next/server';
import {
  buildAiIncidentTriagePlan,
  normalizeAiIncidentCategory,
  normalizeAiIncidentReportStatus,
  normalizeAiIncidentSeverity,
} from '@/lib/ai-governance/incidents';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { createAuditEvent } from '@/server/queries/audit-events';
import { createAiIncident, listAiIncidents } from '@/server/queries/ai-incidents';
import { listAiSystems } from '@/server/queries/ai-systems';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';
import { assertTrustedOrigin } from '@/server/security/origin-guard';

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

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
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

  return NextResponse.json({ incidents, systems, role: permission.role });
}

export async function POST(request: Request) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'manage_ai_incidents',
  });

  if (!permission.ok) {
    return permissionDeniedResponse(permission);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const title = asText(body.title);
  const summary = asText(body.summary);

  if (title.length < 3) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  if (summary.length < 12) {
    return NextResponse.json({ error: 'Summary must describe what happened' }, { status: 400 });
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

    return NextResponse.json({ incident, triage });
  } catch (error) {
    const code = getErrorCode(error);

    if (code === '42P01' || code === 'PGRST205') {
      return NextResponse.json(
        { error: 'ai_incidents_table_missing', message: 'Apply the AI incident register Supabase migration before creating incidents.' },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: 'Could not create AI incident' }, { status: 500 });
  }
}
