import 'server-only';

import { randomUUID } from 'node:crypto';

import {
  buildInitialDataSubjectRequestDeadline,
} from '@/lib/privacy/gdpr-deadlines';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { sanitizeAuditMetadata } from '@/server/queries/audit-events';
import { buildAuditChainRecord } from '@/server/security/audit-chain';

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

type RpcError = { code?: string; message?: string };
type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcError | null }>;
};

const LIFECYCLE_PATCH_KEYS = [
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
] as const;

export function isDataSubjectRequestType(value: unknown): value is DataSubjectRequestType {
  return typeof value === 'string' && (DATA_SUBJECT_REQUEST_TYPES as readonly string[]).includes(value);
}

function normalizeOptionalReference(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function allowedLifecyclePatch(patch: Record<string, unknown>) {
  const allowedPatch: Record<string, unknown> = {};
  for (const key of LIFECYCLE_PATCH_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) allowedPatch[key] = patch[key];
  }
  return allowedPatch;
}

function firstRpcRow(data: unknown): DataSubjectRequestRecord | null {
  if (Array.isArray(data)) {
    const first = data[0];
    return first && typeof first === 'object' ? first as DataSubjectRequestRecord : null;
  }
  return data && typeof data === 'object' ? data as DataSubjectRequestRecord : null;
}

function isRequestStateConflict(error: RpcError) {
  return error.code === 'P0001' && /data subject request state conflict/i.test(error.message ?? '');
}

function isAuditChainConflict(error: RpcError) {
  const message = error.message ?? '';
  return (error.code === 'P0001' && /audit chain write conflict: stale head/i.test(message))
    || (error.code === '55P03' && /audit chain write conflict: lock unavailable/i.test(message));
}

async function getPreviousAuditHash(
  admin: NonNullable<ReturnType<typeof tryCreateAdminClient>>,
  organizationId: string,
) {
  const { data, error } = await admin
    .from('audit_events')
    .select('event_hash')
    .eq('organization_id', organizationId)
    .not('event_hash', 'is', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false as const, reason: 'audit_chain_head_unavailable' as const };
  const value = (data as { event_hash?: unknown } | null)?.event_hash;
  return { ok: true as const, previousHash: typeof value === 'string' ? value : null };
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

export async function updateDataSubjectRequestWithAuditAtomic(input: {
  requestId: string;
  organizationId: string;
  patch: Record<string, unknown>;
  expectedStatus: DataSubjectRequestStatus;
  expectedUpdatedAt: string;
  audit: {
    actorUserId: string;
    action: 'gdpr_rights_request_lifecycle_changed';
    entityType: 'data_subject_request';
    entityId: string;
    metadata: Record<string, unknown>;
    requestContext?: Record<string, unknown> | null;
  };
}) {
  const admin = tryCreateAdminClient();
  if (!admin) return { ok: false as const, reason: 'admin_client_unavailable' as const };

  const patch = allowedLifecyclePatch(input.patch);
  const previousHash = await getPreviousAuditHash(admin, input.organizationId);
  if (!previousHash.ok) return previousHash;

  const metadata = sanitizeAuditMetadata({
    ...input.audit.metadata,
    ...(input.audit.requestContext ? { requestContext: input.audit.requestContext } : {}),
  });
  const auditId = randomUUID();
  const auditCreatedAt = new Date().toISOString();
  const chain = buildAuditChainRecord({
    id: auditId,
    organizationId: input.organizationId,
    actorUserId: input.audit.actorUserId,
    action: input.audit.action,
    entityType: input.audit.entityType,
    entityId: input.audit.entityId,
    metadata,
    createdAt: auditCreatedAt,
  }, previousHash.previousHash);

  const rpc = admin as unknown as RpcClient;
  const { data, error } = await rpc.rpc('update_data_subject_request_with_audit_atomic', {
    p_request_id: input.requestId,
    p_organization_id: input.organizationId,
    p_expected_status: input.expectedStatus,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_patch: patch,
    p_audit_id: auditId,
    p_actor_user_id: input.audit.actorUserId,
    p_action: input.audit.action,
    p_entity_type: input.audit.entityType,
    p_entity_id: input.audit.entityId,
    p_metadata: metadata,
    p_audit_created_at: auditCreatedAt,
    p_previous_hash: chain.previousHash,
    p_event_hash: chain.eventHash,
    p_hash_signature: chain.signature ?? null,
    p_hash_algorithm: 'sha256',
  });

  if (error) {
    if (isRequestStateConflict(error)) {
      return { ok: false as const, reason: 'request_state_conflict' as const };
    }
    if (isAuditChainConflict(error)) {
      return { ok: false as const, reason: 'audit_chain_conflict' as const };
    }
    if (error.code === '42883' || error.code === 'PGRST202') {
      return { ok: false as const, reason: 'transactional_rpc_unavailable' as const };
    }
    return { ok: false as const, reason: 'request_update_failed' as const };
  }

  const request = firstRpcRow(data);
  if (!request) return { ok: false as const, reason: 'request_update_failed' as const };

  return {
    ok: true as const,
    request,
    audit: {
      eventHash: chain.eventHash,
      previousHash: chain.previousHash,
      transactional: true as const,
    },
  };
}
