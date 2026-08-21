import { randomUUID } from 'node:crypto';

import { buildServerAuditMetadata } from '@/lib/security/audit-log';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildAuditChainRecord } from '@/server/security/audit-chain';

const MAX_ATOMIC_MUTATION_ATTEMPTS = 4;

export type AtomicCommercialOutcome =
  | 'created'
  | 'deleted'
  | 'quota_exceeded'
  | 'not_found_or_conflict'
  | 'invalid_input';

export type AtomicCommercialMutationResult<T> = {
  outcome: AtomicCommercialOutcome;
  record: T | null;
};

type AtomicRpcName =
  | 'create_vendor_with_quota_audit_atomic'
  | 'delete_vendor_with_audit_atomic'
  | 'create_risk_with_quota_audit_atomic'
  | 'delete_risk_with_audit_atomic';

type AtomicMutationInput = {
  rpcName: AtomicRpcName;
  organizationId: string;
  actorUserId: string;
  entityId: string;
  action: 'vendor.create' | 'vendor.delete' | 'risk.create' | 'risk.delete';
  entityType: 'vendor' | 'risk';
  auditMetadata?: Record<string, unknown>;
  rpcArgs: Record<string, unknown>;
};

type AtomicMutationRow<T> = {
  outcome?: unknown;
  record?: unknown;
};

function isPreviousHashMismatch(error: { code?: string; message?: string }) {
  return error.code === '40001' || /previous hash mismatch/i.test(error.message ?? '');
}

function isAtomicOutcome(value: unknown): value is AtomicCommercialOutcome {
  return ['created', 'deleted', 'quota_exceeded', 'not_found_or_conflict', 'invalid_input'].includes(String(value));
}

function parseAtomicMutationRow<T>(value: unknown): AtomicCommercialMutationResult<T> | null {
  if (!Array.isArray(value) || value.length !== 1) return null;

  const candidate = value[0];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;

  const row = candidate as AtomicMutationRow<T>;
  if (!isAtomicOutcome(row.outcome)) return null;

  if (row.outcome === 'created' || row.outcome === 'deleted') {
    if (!row.record || typeof row.record !== 'object' || Array.isArray(row.record)) return null;
    return { outcome: row.outcome, record: row.record as T };
  }

  return { outcome: row.outcome, record: null };
}

async function getPreviousAuditHash(organizationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('audit_events')
    .select('event_hash')
    .eq('organization_id', organizationId)
    .not('event_hash', 'is', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const hash = (data as { event_hash?: unknown } | null)?.event_hash;
  return typeof hash === 'string' ? hash : null;
}

async function runAtomicCommercialMutation<T>(input: AtomicMutationInput): Promise<AtomicCommercialMutationResult<T>> {
  const supabase = createAdminClient();
  const { metadata } = await buildServerAuditMetadata(input.auditMetadata);

  for (let attempt = 1; attempt <= MAX_ATOMIC_MUTATION_ATTEMPTS; attempt += 1) {
    const auditId = randomUUID();
    const createdAt = new Date().toISOString();
    const previousHash = await getPreviousAuditHash(input.organizationId);
    const chain = buildAuditChainRecord(
      {
        id: auditId,
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata,
        createdAt,
      },
      previousHash,
    );

    const { data, error } = await supabase.rpc(input.rpcName, {
      ...input.rpcArgs,
      p_audit_id: auditId,
      p_audit_metadata: metadata,
      p_audit_created_at: createdAt,
      p_previous_hash: chain.previousHash,
      p_event_hash: chain.eventHash,
      p_hash_signature: chain.signature ?? null,
    });

    if (error) {
      if (isPreviousHashMismatch(error) && attempt < MAX_ATOMIC_MUTATION_ATTEMPTS) continue;
      throw error;
    }

    const result = parseAtomicMutationRow<T>(data);
    if (!result) throw new Error(`${input.rpcName} returned an invalid result`);
    return result;
  }

  throw new Error(`${input.rpcName} exhausted audit-chain retries`);
}

export async function createVendorWithQuotaAndAuditAtomic<T>(input: {
  organizationId: string;
  actorUserId: string;
  maxAllowed: number | null;
  vendor: Record<string, unknown>;
  auditMetadata?: Record<string, unknown>;
}) {
  const vendorId = randomUUID();

  return runAtomicCommercialMutation<T>({
    rpcName: 'create_vendor_with_quota_audit_atomic',
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    entityId: vendorId,
    action: 'vendor.create',
    entityType: 'vendor',
    auditMetadata: input.auditMetadata,
    rpcArgs: {
      p_vendor_id: vendorId,
      p_organization_id: input.organizationId,
      p_actor_user_id: input.actorUserId,
      p_max_allowed: input.maxAllowed,
      p_vendor: input.vendor,
    },
  });
}

export async function deleteVendorWithAuditAtomic<T>(input: {
  organizationId: string;
  actorUserId: string;
  vendorId: string;
  expectedReviewVersion?: number | null;
}) {
  return runAtomicCommercialMutation<T>({
    rpcName: 'delete_vendor_with_audit_atomic',
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    entityId: input.vendorId,
    action: 'vendor.delete',
    entityType: 'vendor',
    auditMetadata: { operation: 'delete' },
    rpcArgs: {
      p_vendor_id: input.vendorId,
      p_organization_id: input.organizationId,
      p_actor_user_id: input.actorUserId,
      p_expected_review_version: input.expectedReviewVersion ?? null,
    },
  });
}

export async function createRiskWithQuotaAndAuditAtomic<T>(input: {
  organizationId: string;
  actorUserId: string;
  maxAllowed: number | null;
  risk: Record<string, unknown>;
  auditMetadata?: Record<string, unknown>;
}) {
  const riskId = randomUUID();

  return runAtomicCommercialMutation<T>({
    rpcName: 'create_risk_with_quota_audit_atomic',
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    entityId: riskId,
    action: 'risk.create',
    entityType: 'risk',
    auditMetadata: input.auditMetadata,
    rpcArgs: {
      p_risk_id: riskId,
      p_organization_id: input.organizationId,
      p_actor_user_id: input.actorUserId,
      p_max_allowed: input.maxAllowed,
      p_risk: input.risk,
    },
  });
}

export async function deleteRiskWithAuditAtomic<T>(input: {
  organizationId: string;
  actorUserId: string;
  riskId: string;
}) {
  return runAtomicCommercialMutation<T>({
    rpcName: 'delete_risk_with_audit_atomic',
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    entityId: input.riskId,
    action: 'risk.delete',
    entityType: 'risk',
    auditMetadata: { operation: 'delete' },
    rpcArgs: {
      p_risk_id: input.riskId,
      p_organization_id: input.organizationId,
      p_actor_user_id: input.actorUserId,
    },
  });
}
