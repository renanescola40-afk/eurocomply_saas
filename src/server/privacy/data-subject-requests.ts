import 'server-only';

import { tryCreateAdminClient } from '@/lib/supabase/admin';

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

function daysInUtcMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Operational calendar-month target for GDPR Article 12(3) tracking.
 * This intentionally does not use a fixed 30-day duration. It preserves the
 * UTC clock time and clamps month-end dates to the final day of the target month.
 * Final legal deadline decisions remain reviewable and attributable.
 */
export function addUtcCalendarMonths(value: string | Date, months: number) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('invalid_received_at');
  if (!Number.isInteger(months) || months < 0 || months > 3) throw new Error('invalid_calendar_month_delta');

  const originalDay = date.getUTCDate();
  const targetMonthAbsolute = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const targetYear = Math.floor(targetMonthAbsolute / 12);
  const targetMonth = targetMonthAbsolute % 12;
  const targetDay = Math.min(originalDay, daysInUtcMonth(targetYear, targetMonth));

  return new Date(Date.UTC(
    targetYear,
    targetMonth,
    targetDay,
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ));
}

export function buildInitialDataSubjectRequestDeadline(receivedAt: string | Date = new Date()) {
  const received = receivedAt instanceof Date ? new Date(receivedAt.getTime()) : new Date(receivedAt);
  if (Number.isNaN(received.getTime())) throw new Error('invalid_received_at');
  const initialDue = addUtcCalendarMonths(received, 1);

  return {
    receivedAt: received.toISOString(),
    initialDueAt: initialDue.toISOString(),
    dueAt: initialDue.toISOString(),
  };
}

export function buildExtendedDataSubjectRequestDeadline(input: {
  initialDueAt: string | Date;
  extensionMonths: 1 | 2;
}) {
  const initialDue = input.initialDueAt instanceof Date ? new Date(input.initialDueAt.getTime()) : new Date(input.initialDueAt);
  if (Number.isNaN(initialDue.getTime())) throw new Error('invalid_initial_due_at');
  return addUtcCalendarMonths(initialDue, input.extensionMonths).toISOString();
}

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
    .select('*')
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
