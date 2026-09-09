import { NextRequest } from 'next/server';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit, getClientIpFromRequest, getUserAgentFromRequest } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { readBoundedJsonRequest } from '@/lib/security/validate';
import {
  createDataSubjectRequestRecord,
  deleteDataSubjectRequestRecordForCompensation,
  isDataSubjectRequestType,
  listDataSubjectRequestsForOrganization,
} from '@/server/privacy/data-subject-requests';
import { buildAuditRequestContextFromRequest, createAuditEvent } from '@/server/queries/audit-events';
import { getCurrentUser } from '@/server/queries/auth';
import { createNotification } from '@/server/queries/notifications';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';
import { assertOrganizationPermission, permissionDeniedResponse } from '@/server/security/rbac';

export const runtime = 'nodejs';

const REQUEST_JSON_MAX_BYTES = 4 * 1024;

function requestPersistenceError(reason: string) {
  return noStoreJson({
    error: 'gdpr_rights_request_unavailable',
    reason,
    message: 'The request could not be recorded safely. Please try again later.',
  }, { status: 503 });
}

export async function POST(request: NextRequest) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const user = await getCurrentUser();
  if (!user) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) return noStoreJson({ error: 'Organization not found' }, { status: 404 });

  const intakePermission = await assertOrganizationPermission({
    userId: user.id,
    organizationId: organization.id,
    permission: 'submit_privacy_request',
  });
  if (!intakePermission.ok) return permissionDeniedResponse(intakePermission);

  const requestContext = buildAuditRequestContextFromRequest(request);
  const rateLimit = await checkDistributedRateLimit({
    policy: 'gdpr-delete',
    userId: user.id,
    organizationId: organization.id,
    ip: getClientIpFromRequest(request),
    userAgent: getUserAgentFromRequest(request),
    action: 'gdpr_rights_request',
    route: '/api/gdpr/requests',
  });

  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  let body: Record<string, unknown>;
  try {
    body = await readBoundedJsonRequest<Record<string, unknown>>(request, {
      maxBytes: REQUEST_JSON_MAX_BYTES,
    });
  } catch {
    return noStoreJson({
      error: 'invalid_gdpr_rights_payload',
      message: 'Request body must be valid JSON within the allowed size limit.',
    }, { status: 400 });
  }

  if (!isDataSubjectRequestType(body.requestType)) {
    return noStoreJson({
      error: 'invalid_gdpr_right_type',
      message: 'Unsupported data-subject right request type.',
    }, { status: 400 });
  }

  const created = await createDataSubjectRequestRecord({
    organizationId: organization.id,
    requesterUserId: user.id,
    requestType: body.requestType,
    roleRoute: 'under_review',
    identityState: 'pending',
  });

  if (!created.ok) {
    reportError(new Error('GDPR rights request persistence failed'), {
      area: 'gdpr_rights_request_persistence',
      organizationId: organization.id,
      userId: user.id,
      reason: created.reason,
    });
    return requestPersistenceError(created.reason);
  }

  const audit = await createAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    action: 'gdpr_rights_request_created',
    entityType: 'data_subject_request',
    entityId: created.request.id,
    metadata: {
      requestType: created.request.request_type,
      status: created.request.status,
      roleRoute: created.request.role_route,
      identityVerificationState: created.request.identity_verification_state,
      receivedAt: created.request.received_at,
      initialDueAt: created.request.initial_due_at,
      dueAt: created.request.due_at,
    },
    requestContext,
  });

  if (!audit.persisted) {
    const compensated = await deleteDataSubjectRequestRecordForCompensation({
      requestId: created.request.id,
      organizationId: organization.id,
    });

    reportError(new Error('GDPR rights request audit persistence failed'), {
      area: 'gdpr_rights_request_audit',
      organizationId: organization.id,
      userId: user.id,
      requestId: created.request.id,
      compensated,
      reason: audit.reason,
    });

    return requestPersistenceError('audit_unavailable');
  }

  await createNotification({
    organizationId: organization.id,
    userId: user.id,
    type: 'system',
    message: 'Pedido de direitos de proteção de dados recebido e registado para revisão.',
  });

  return noStoreJson({
    request: {
      id: created.request.id,
      requestType: created.request.request_type,
      status: created.request.status,
      roleRoute: created.request.role_route,
      identityVerificationState: created.request.identity_verification_state,
      receivedAt: created.request.received_at,
      dueAt: created.request.due_at,
    },
    message: 'Request received and recorded for privacy review.',
  }, { status: 201 });
}

export async function GET(request: NextRequest) {
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

  const rateLimit = await checkDistributedRateLimit({
    category: 'gdpr',
    key: `gdpr:rights:list:${organization.id}:${user.id}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const result = await listDataSubjectRequestsForOrganization(organization.id);
  if (!result.ok) {
    reportError(new Error('GDPR rights request list failed'), {
      area: 'gdpr_rights_request_list',
      organizationId: organization.id,
      userId: user.id,
      reason: result.reason,
    });
    return noStoreJson({ error: 'gdpr_rights_request_list_unavailable' }, { status: 503 });
  }

  return noStoreJson({ requests: result.requests });
}
