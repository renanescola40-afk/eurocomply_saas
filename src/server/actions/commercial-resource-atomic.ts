import { randomUUID } from 'node:crypto';

import { buildServerAuditMetadata } from '@/lib/security/audit-log';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildAuditChainRecord } from '@/server/security/audit-chain';

const ATOMIC_COMMERCIAL_RESOURCE_RPC = 'mutate_commercial_resource_with_audit_atomic';
const MAX_ATOMIC_MUTATION_ATTEMPTS = 4;

type CommercialResource = 'vendor' | 'risk';
type CommercialOperation = 'create' | 'delete';

type AtomicMutationRow = {
  outcome: 'created' | 'deleted' | 'quota_exceeded' | 'not_found_or_conflict' | 'invalid_input';
  resource_record: Record<string, unknown> | null;
  current_count: number;
  max_count: number | null;
};

type AtomicMutationInput = {
  resource: CommercialResource;
  operation: CommercialOperation;
  organizationId: string;
  actorUserId: string;
  entityId: string;
  payload?: Record<string, unknown> | null;
  maxCount?: number | null;
  expectedReviewVersion?: number | null;
  auditMetadata?: Record<string, unknown>;
};

function isPreviousHashMismatch(error: { code?: string; message?: string }) {
  return error.code === '40001' || /previous hash mismatch/i.test(error.message ?? '');
}

function firstAtomicMutationRow(value: unknown): AtomicMutationRow | null {
  if (!Array.isArray(value) || value.length !== 1) return null;
  const candidate = value[0];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;

  const row = candidate as Partial<AtomicMutationRow>;
  if (!['created', 'deleted', 'quota_exceeded', 'not_found_or_conflict', 'invalid_input'].includes(String(row.outcome))) {
    return null;
  }

  if ((row.outcome === 'created' || row.outcome === 'deleted') && (!row.resource_record || typeof row.resource_record !== 'object')) {
    return null;
  }

  return row as AtomicMutationRow;
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
  const eventHash = (data as { event_hash?: unknown } | null)?.event_hash;
  return typeof eventHash === 'string' ? eventHash : null;
}

export async function mutateCommercialResourceAtomic(input: AtomicMutationInput): Promise<AtomicMutationRow> {
  const supabase = createAdminClient();
  const { metadata: auditMetadata } = await buildServerAuditMetadata(input.auditMetadata);
  const maxCount = input.maxCount == null || !Number.isFinite(input.maxCount) ? null : Math.max(0, Math.trunc(input.maxCount));

  for (let attempt = 1; attempt <= MAX_ATOMIC_MUTATION_ATTEMPTS; attempt += 1) {
    const auditId = randomUUID();
    const createdAt = new Date().toISOString();
    const previousHash = await getPreviousAuditHash(input.organizationId);
    const chain = buildAuditChainRecord(
      {
        id: auditId,
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: `${input.resource}.${input.operation}`,
        entityType: input.resource,
        entityId: input.entityId,
        metadata: auditMetadata,
        createdAt,
      },
      previousHash,
    );

    const { data, error } = await supabase.rpc(ATOMIC_COMMERCIAL_RESOURCE_RPC, {
      p_resource_type: input.resource,
      p_operation: input.operation,
      p_organization_id: input.organizationId,
      p_actor_user_id: input.actorUserId,
      p_entity_id: input.entityId,
      p_payload: input.payload ?? null,
      p_max_count: maxCount,
      p_expected_review_version: input.expectedReviewVersion ?? null,
      p_audit_id: auditId,
      p_audit_metadata: auditMetadata,
      p_audit_created_at: createdAt,
      p_previous_hash: chain.previousHash,
      p_event_hash: chain.eventHash,
      p_hash_signature: chain.signature ?? null,
    });

    if (error) {
      if (isPreviousHashMismatch(error) && attempt < MAX_ATOMIC_MUTATION_ATTEMPTS) continue;
      throw error;
    }

    const result = firstAtomicMutationRow(data);
    if (!result) throw new Error('Commercial resource atomic RPC returned an invalid result');
    return result;
  }

  throw new Error('Commercial resource atomic mutation exhausted audit-chain retries');
}
