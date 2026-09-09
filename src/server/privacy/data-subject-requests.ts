import 'server-only';

import {
  buildInitialDataSubjectRequestDeadline,
} from '@/lib/privacy/gdpr-deadlines';
import { tryCreateAdminClient } from '@/lib/supabase/admin';

export { buildExtendedDataSubjectRequestDeadline } from '@/lib/privacy/gdpr-deadlines';

export const DATA_SUBJECT_REQUEST_TYPES = [
  'access',
  'export',
  'rectification',
  'restriction',
  'deletion',
  'objection',
  'portability',
  'consent_withdrawal',
] as const;

export type DataSubjectRequestType = (typeof DATA_SUBJECT_REQUEST_TYPES)[number];
export type DataSubjectRoleRoute = 'controller' | 'processor' | 'mixed' | 'under_review';
export type DataSubjectIdentityState = 'pending' | 'not_required' | 'verified' | 'failed';
export type DataSubjectRequestStatus =
  | 'received'
  | 'awaiting_identity'
  | 'verified'
  | 'in_progress'
  | 'routed_to_controller'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type DataSubjectRequestRecord = {
  id: string;
  organization_id: string;
  requester_user_id: string;
  request_type: DataSubjectRequestType;
  status: DataSubjectRequestStatus;
  received_at: string;
  initial_due_at: string;
  due_at: string;
  identity_verification_state: DataSubjectIdentityState;
  identity_verification_requested_at: string | null;
  identity_verified_at: string | null;
  role_route: DataSubjectRoleRoute;
  customer_controller_reference: string | null;
  extension_reason: string | null;
  extension_notified_at: string | null;
  extended_due_at: string | null;
  decision: 'fulfilled' | 'partially_fulfilled' | 'refused' | 'withdrawn' | 'routed_to_controller' | null;
  decision_reason: string | null;
  evidence_refs: unknown[];
  completed_at: string | null;
  resolution_summary: string | null;
  created_at: string;
  updated_at: string;
};

export function isDataSubjectRequestType(value: unknown): value is DataSubjectRequestType {
  return typeof value === 'string' && (DATA_SUBJECT_REQUEST_TYPES as readonly string[]).includes(value);
}

function normalizeOptionalReference(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export async function createDataSubjectRequestRecord(input: {
  organizationId: string;
  requesterUserId: string;
  requestType: DataSubjectRequestType;
  roleRoute?: DataSubjectRoleRoute;
  identityState?: DataSubjectIdentityState;
  customerControllerReference?: string | null;
  receivedAt?: string | Date;
  evidenceRefs?: unknown[];
}) {
  const admin = tryCreateAdminClient();
  if (!admin) return { ok: false as const, reason: 'admin_client_unavailable' as const };

  const deadline = buildInitialDataSubjectRequestDeadline(input.receivedAt ?? new Date());
  const identityState = input.identityState ?? 'pending';
  const status: DataSubjectRequestStatus = identityState === 'verified' ? 'verified' : 'received';
  const identityVerifiedAt = identityState === 'verified' ? deadline.receivedAt : null;

  const payload = {
    organization_id: input.organizationId,
    requester_user_id: input.requesterUserId,
    request_type: input.requestType,
    status,
    received_at: deadline.receivedAt,
    initial_due_at: deadline.initialDueAt,
    due_at: deadline.dueAt,
    identity_verification_state: identityState,
    identity_verified_at: identityVerifiedAt,
    role_route: input.roleRoute ?? 'under_review',
    customer_controller_reference: normalizeOptionalReference(input.customerControllerReference, 500),
    evidence_refs: Array.isArray(input.evidenceRefs) ? input.evidenceRefs.slice(0, 50) : [],
  };

  const { data, error } = await admin
    .from('data_subject_requests')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    return { ok: false as const, reason: 'request_persistence_failed' as const };
  }

  return { ok: true as const, request: data as DataSubjectRequestRecord };
}

export async function deleteDataSubjectRequestRecordForCompensation(input: {
  requestId: string;
  organizationId: string;
}) {
  const admin = tryCreateAdminClient();
  if (!admin) return false;

  const { error } = await admin
    .from('data_subject_requests')
    .delete()
    .eq('id', input.requestId)
    .eq('organization_id', input.organizationId);

  return !error;
}

export async function getDataSubjectRequestForOrganization(input: {
  requestId: string;
  organizationId: string;
}) {
  const admin = tryCreateAdminClient();
  if (!admin) return { ok: false as const, reason: 'admin_client_unavailable' as const };

  const { data, error } = await admin
    .from('data_subject_requests')
    .select('*')
    .eq('id', input.requestId)
    .eq('organization_id', input.organizationId)
    .maybeSingle();

  if (error) return { ok: false as const, reason: 'request_query_failed' as const };
  if (!data) return { ok: false as const, reason: 'request_not_found' as const };
  return { ok: true as const, request: data as DataSubjectRequestRecord };
}

export async function listDataSubjectRequestsForOrganization(organizationId: string) {
  const admin = tryCreateAdminClient();
  if (!admin) return { ok: false as const, reason: 'admin_client_unavailable' as const };

  const { data, error } = await admin
    .from('data_subject_requests')
    .select('*')
    .eq('organization_id', organizationId)
    .order('received_at', { ascending: false })
    .limit(200);

  if (error) return { ok: false as const, reason: 'request_query_failed' as const };

  const now = Date.now();
  const requests = ((data ?? []) as DataSubjectRequestRecord[]).map((request) => ({
    ...request,
    overdue:
      !['completed', 'rejected', 'cancelled'].includes(request.status)
      && new Date(request.due_at).getTime() < now,
  }));

  return { ok: true as const, requests };
}

export async function updateDataSubjectRequestRecord(input: {
  requestId: string;
  organizationId: string;
  patch: Record<string, unknown>;
}) {
  const admin = tryCreateAdminClient();
  if (!admin) return { ok: false as const, reason: 'admin_client_unavailable' as const };

  const { data: current, error: currentError } = await admin
    .from('data_subject_requests')
    .select('id')
    .eq('id', input.requestId)
    .eq('organization_id', input.organizationId)
    .maybeSingle();

  if (currentError) return { ok: false as const, reason: 'request_query_failed' as const };
  if (!current) return { ok: false as const, reason: 'request_not_found' as const };

  const allowedPatch: Record<string, unknown> = {};
  for (const key of [
    'status',
    'identity_verification_state',
    'identity_verification_requested_at',
    'identity_verified_at',
    'role_route',
    'customer_controller_reference',
    'extension_reason',
    'extension_notified_at',
    'extended_due_at',
    'due_at',
    'decision',
    'decision_reason',
    'evidence_refs',
    'completed_at',
    'resolution_summary',
    'updated_at',
  ]) {
    if (Object.prototype.hasOwnProperty.call(input.patch, key)) allowedPatch[key] = input.patch[key];
  }

  const { data, error } = await admin
    .from('data_subject_requests')
    .update(allowedPatch)
    .eq('id', input.requestId)
    .eq('organization_id', input.organizationId)
    .select('*')
    .single();

  if (error || !data) return { ok: false as const, reason: 'request_update_failed' as const };
  return { ok: true as const, request: data as DataSubjectRequestRecord };
}
