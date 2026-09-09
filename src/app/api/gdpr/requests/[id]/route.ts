import { NextRequest } from 'next/server';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import {
  buildExtendedDataSubjectRequestDeadline,
  getDataSubjectRequestForOrganization,
  updateDataSubjectRequestRecord,
  type DataSubjectRequestRecord,
  type DataSubjectRoleRoute,
} from '@/server/privacy/data-subject-requests';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

export const runtime = 'nodejs';

const REQUEST_JSON_MAX_BYTES = 8 * 1024;
const ROLE_ROUTES = new Set<DataSubjectRoleRoute>(['controller', 'processor', 'mixed', 'under_review']);
const TERMINAL_REQUEST_STATUSES = new Set<DataSubjectRequestRecord['status']>([
  'completed',
  'rejected',
  'cancelled',
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown, maxLength = 1000) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function evidenceRefs(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, 500))
    .filter(Boolean)
    .slice(0, 20);
}

function previousValues(current: DataSubjectRequestRecord, patch: Record<string, unknown>) {
  const previous: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) {
    if (Object.prototype.hasOwnProperty.call(current, key)) {
      previous[key] = current[key as keyof DataSubjectRequestRecord];
    }
  }
  return previous;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const user = await getCurrentUser();
  if (!user) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) return noStoreJson({ error: 'Organization not found' }, { status: 404 });

  const permission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'manage_settings',
  });
  if (!permission.ok) return permissionDeniedResponse(permission);

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return noStoreJson({ error: 'invalid_request_id' }, { status: 400 });

  const rateLimit = await checkDistributedRateLimit({
    category: 'gdpr',
    key: `gdpr:rights:update:${organization.id}:${user.id}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  let body: Record<string, unknown>;
  try {
    body = await readBoundedJsonRequest<Record<string, unknown>>(request, {
      maxBytes: REQUEST_JSON_MAX_BYTES,
    });
  } catch {
    return noStoreJson({ error: 'invalid_gdpr_rights_lifecycle_payload' }, { status: 400 });
  }

  const action = text(body.action, 80);
  if (!action) return noStoreJson({ error: 'gdpr_rights_action_required' }, { status: 400 });

  const currentResult = await getDataSubjectRequestForOrganization({
    requestId: id,
    organizationId: organization.id,
  });
  if (!currentResult.ok) {
    const status = currentResult.reason === 'request_not_found' ? 404 : 503;
    return noStoreJson({ error: currentResult.reason }, { status });
  }

  const current = currentResult.request;
  if (TERMINAL_REQUEST_STATUSES.has(current.status)) {
    return noStoreJson({ error: 'gdpr_rights_request_terminal' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};

  switch (action) {
    case 'request_identity':
      patch.status = 'awaiting_identity';
      patch.identity_verification_state = 'pending';
      patch.identity_verification_requested_at = now;
      break;

    case 'verify_identity':
      patch.status = current.status === 'received' || current.status === 'awaiting_identity' ? 'verified' : current.status;
      patch.identity_verification_state = 'verified';
      patch.identity_verified_at = now;
      break;

    case 'start_processing':
      patch.status = 'in_progress';
      break;

    case 'set_role_route': {
      const roleRoute = text(body.roleRoute, 40) as DataSubjectRoleRoute | null;
      if (!roleRoute || !ROLE_ROUTES.has(roleRoute)) {
        return noStoreJson({ error: 'invalid_role_route' }, { status: 400 });
      }
      patch.role_route = roleRoute;
      break;
    }

    case 'route_to_controller': {
      const reference = text(body.customerControllerReference, 500);
      if (!reference) return noStoreJson({ error: 'customer_controller_reference_required' }, { status: 400 });
      patch.role_route = 'processor';
      patch.status = 'routed_to_controller';
      patch.customer_controller_reference = reference;
      patch.decision = 'routed_to_controller';
      patch.decision_reason = text(body.reason, 1000);
      break;
    }

    case 'extend': {
      if (body.extensionMonths !== 1 && body.extensionMonths !== 2) {
        return noStoreJson({ error: 'extension_months_must_be_1_or_2' }, { status: 400 });
      }
      const reason = text(body.reason, 1000);
      const notificationEvidenceRef = text(body.notificationEvidenceRef, 500);
      if (!reason || !notificationEvidenceRef) {
        return noStoreJson({ error: 'extension_reason_and_notification_evidence_required' }, { status: 400 });
      }

      const extendedDueAt = buildExtendedDataSubjectRequestDeadline({
        initialDueAt: current.initial_due_at,
        extensionMonths: body.extensionMonths,
      });
      patch.extension_reason = reason;
      patch.extension_notified_at = now;
      patch.extended_due_at = extendedDueAt;
      patch.due_at = extendedDueAt;
      patch.evidence_refs = [...(Array.isArray(current.evidence_refs) ? current.evidence_refs : []), notificationEvidenceRef].slice(-50);
      break;
    }

    case 'complete': {
      const decision = body.decision === 'partially_fulfilled' ? 'partially_fulfilled' : 'fulfilled';
      const summary = text(body.resolutionSummary, 1000);
      if (!summary) return noStoreJson({ error: 'resolution_summary_required' }, { status: 400 });
      patch.status = 'completed';
      patch.completed_at = now;
      patch.decision = decision;
      patch.decision_reason = text(body.decisionReason, 1000);
      patch.resolution_summary = summary;
      patch.evidence_refs = [...(Array.isArray(current.evidence_refs) ? current.evidence_refs : []), ...evidenceRefs(body.evidenceRefs)].slice(-50);
      break;
    }

    case 'reject': {
      const reason = text(body.reason, 1000);
      if (!reason) return noStoreJson({ error: 'rejection_reason_required' }, { status: 400 });
      patch.status = 'rejected';
      patch.decision = 'refused';
      patch.decision_reason = reason;
      patch.evidence_refs = [...(Array.isArray(current.evidence_refs) ? current.evidence_refs : []), ...evidenceRefs(body.evidenceRefs)].slice(-50);
      break;
    }

    case 'cancel':
      patch.status = 'cancelled';
      patch.decision = 'withdrawn';
      patch.decision_reason = text(body.reason, 1000);
      break;

    default:
      return noStoreJson({ error: 'unsupported_gdpr_rights_action' }, { status: 400 });
  }

  patch.updated_at = now;

  const updated = await updateDataSubjectRequestRecord({
    requestId: id,
    organizationId: organization.id,
    patch,
    expectedStatus: current.status,
    expectedUpdatedAt: current.updated_at,
  });
  if (!updated.ok) {
    if (updated.reason === 'request_state_conflict') {
      return noStoreJson({ error: 'gdpr_rights_request_state_conflict' }, { status: 409 });
    }

    reportError(new Error('GDPR rights lifecycle update failed'), {
      area: 'gdpr_rights_lifecycle_update',
      organizationId: organization.id,
      userId: user.id,
      requestId: id,
      reason: updated.reason,
    });
    return noStoreJson({ error: 'gdpr_rights_update_unavailable' }, { status: 503 });
  }

  const audit = await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'gdpr_rights_request_lifecycle_changed',
    entityType: 'data_subject_request',
    entityId: id,
    metadata: {
      lifecycleAction: action,
      fromStatus: current.status,
      toStatus: updated.request.status,
      requestType: updated.request.request_type,
      roleRoute: updated.request.role_route,
      identityVerificationState: updated.request.identity_verification_state,
      initialDueAt: updated.request.initial_due_at,
      dueAt: updated.request.due_at,
      extensionRecorded: Boolean(updated.request.extended_due_at),
      decision: updated.request.decision,
      evidenceReferenceCount: Array.isArray(updated.request.evidence_refs) ? updated.request.evidence_refs.length : 0,
    },
    requestContext: buildAuditRequestContextFromRequest(request),
  });

  if (!audit.persisted) {
    const restored = await updateDataSubjectRequestRecord({
      requestId: id,
      organizationId: organization.id,
      patch: previousValues(current, patch),
      expectedStatus: updated.request.status,
      expectedUpdatedAt: updated.request.updated_at,
    });

    reportError(new Error('GDPR rights lifecycle audit persistence failed'), {
      area: 'gdpr_rights_lifecycle_audit',
      organizationId: organization.id,
      userId: user.id,
      requestId: id,
      compensationRestored: restored.ok,
      reason: audit.reason,
    });

    return noStoreJson({
      error: 'gdpr_rights_lifecycle_audit_unavailable',
      compensationRestored: restored.ok,
    }, { status: 503 });
  }

  return noStoreJson({ request: updated.request });
}
