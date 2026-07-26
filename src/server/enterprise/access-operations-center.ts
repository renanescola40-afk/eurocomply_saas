import { createAdminClient } from '@/lib/supabase/admin';
import { provisionEnterpriseIdentity } from '@/server/enterprise/provisioning';
import type { EnterpriseSeatType } from '@/server/enterprise/licensing';

type RpcError = { code?: string };
type RpcClient = {
  rpc: (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcError | null }>;
};

type ClaimedOperation = {
  operation_id: string;
  organization_id: string;
  operation_type: 'group_reconciliation' | 'member_export' | 'policy_recompute';
  batch_size: number;
  lease_token: string;
};

type ClaimedItem = {
  identity_id: string;
  organization_id: string;
  membership_id: string | null;
  user_id: string;
  source_group_id: string | null;
  department_key: string | null;
  requested_role: string;
  requested_seat_type: EnterpriseSeatType;
  idempotency_key: string;
};

const SERVICE_ERROR = 'enterprise_access_operations_unavailable';

function client(): RpcClient {
  return createAdminClient() as unknown as RpcClient;
}

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === 'object' ? (data as T) : null;
}

function errorCode(error: unknown): string {
  if (error instanceof Error && error.message) return error.message.slice(0, 120);
  return SERVICE_ERROR;
}

export async function createEnterpriseAccessOperation(input: {
  organizationId: string;
  requestedBy: string;
  reason: string;
  operationType?: 'group_reconciliation' | 'member_export' | 'policy_recompute';
  batchSize?: number;
}) {
  const db = client();
  const { data, error } = await db.rpc('create_enterprise_access_operation', {
    p_organization_id: input.organizationId,
    p_operation_type: input.operationType ?? 'group_reconciliation',
    p_requested_by: input.requestedBy,
    p_reason: input.reason,
    p_batch_size: Math.min(Math.max(input.batchSize ?? 100, 1), 500),
  });
  if (error || typeof data !== 'string') throw new Error(SERVICE_ERROR);

  const seeded = await db.rpc('seed_enterprise_access_operation_items', {
    p_operation_id: data,
    p_limit: 10000,
  });
  if (seeded.error || typeof seeded.data !== 'number') throw new Error(SERVICE_ERROR);

  return { operationId: data, seededItems: seeded.data };
}

export async function controlEnterpriseAccessOperation(input: {
  operationId: string;
  organizationId: string;
  actorUserId: string;
  action: 'pause' | 'resume' | 'cancel' | 'retry_failed';
  reason: string;
}) {
  const { data, error } = await client().rpc('control_enterprise_access_operation', {
    p_operation_id: input.operationId,
    p_organization_id: input.organizationId,
    p_actor_user_id: input.actorUserId,
    p_action: input.action,
    p_reason: input.reason,
  });
  if (error || typeof data !== 'string') throw new Error(SERVICE_ERROR);
  return { outcome: data };
}

async function finishItem(input: {
  operationId: string;
  identityId: string;
  status: 'succeeded' | 'failed' | 'skipped' | 'compensated';
  outcomeCode: string;
  afterSnapshot?: Record<string, unknown>;
  errorDetail?: string | null;
}) {
  const { data, error } = await client().rpc('finish_enterprise_access_operation_item', {
    p_operation_id: input.operationId,
    p_identity_id: input.identityId,
    p_status: input.status,
    p_outcome_code: input.outcomeCode,
    p_after_snapshot: input.afterSnapshot ?? {},
    p_error_detail: input.errorDetail ?? null,
  });
  if (error || data !== 'recorded') throw new Error(SERVICE_ERROR);
}

export async function processNextEnterpriseAccessOperation(actorUserId: string) {
  const db = client();
  const claim = await db.rpc('claim_enterprise_access_operation');
  if (claim.error) throw new Error(SERVICE_ERROR);
  const operation = firstRow<ClaimedOperation>(claim.data);
  if (!operation) return { outcome: 'idle' as const, processed: 0 };

  let processed = 0;
  for (let index = 0; index < operation.batch_size; index += 1) {
    const itemClaim = await db.rpc('claim_enterprise_access_operation_item', {
      p_operation_id: operation.operation_id,
      p_lease_token: operation.lease_token,
    });
    if (itemClaim.error) throw new Error(SERVICE_ERROR);
    const item = firstRow<ClaimedItem>(itemClaim.data);
    if (!item) break;

    try {
      if (operation.operation_type === 'member_export') {
        await finishItem({
          operationId: operation.operation_id,
          identityId: item.identity_id,
          status: 'succeeded',
          outcomeCode: 'export_ready',
          afterSnapshot: {
            role: item.requested_role,
            seatType: item.requested_seat_type,
            departmentKey: item.department_key,
          },
        });
        processed += 1;
        continue;
      }

      const result = await provisionEnterpriseIdentity({
        organizationId: item.organization_id,
        userId: item.user_id,
        actorUserId,
        role: item.requested_role,
        seatType: item.requested_seat_type,
        source: 'scim',
        idempotencyKey: item.idempotency_key,
      });

      if (['reserved', 'already_active', 'seat_changed', 'duplicate'].includes(result.outcome)) {
        const persisted = await db.rpc('persist_enterprise_group_access_reconciliation', {
          p_organization_id: item.organization_id,
          p_identity_id: item.identity_id,
          p_membership_id: result.membershipId ?? item.membership_id,
          p_role: item.requested_role,
          p_seat_type: item.requested_seat_type,
          p_department_key: item.department_key,
          p_source_group_id: item.source_group_id,
          p_source_priority: 0,
        });
        if (persisted.error || persisted.data !== 'persisted') {
          await finishItem({
            operationId: operation.operation_id,
            identityId: item.identity_id,
            status: 'compensated',
            outcomeCode: 'metadata_persistence_failed',
            errorDetail: 'seat mutation succeeded but metadata persistence failed',
          });
          processed += 1;
          continue;
        }

        await finishItem({
          operationId: operation.operation_id,
          identityId: item.identity_id,
          status: 'succeeded',
          outcomeCode: result.outcome,
          afterSnapshot: {
            membershipId: result.membershipId ?? item.membership_id,
            role: item.requested_role,
            seatType: item.requested_seat_type,
            departmentKey: item.department_key,
          },
        });
      } else {
        await finishItem({
          operationId: operation.operation_id,
          identityId: item.identity_id,
          status: 'failed',
          outcomeCode: result.outcome,
          errorDetail: result.outcome,
        });
      }
      processed += 1;
    } catch (error) {
      await finishItem({
        operationId: operation.operation_id,
        identityId: item.identity_id,
        status: 'failed',
        outcomeCode: errorCode(error),
        errorDetail: errorCode(error),
      });
      processed += 1;
    }
  }

  const finalized = await db.rpc('finalize_enterprise_access_operation', {
    p_operation_id: operation.operation_id,
    p_lease_token: operation.lease_token,
  });
  if (finalized.error || finalized.data !== 'finalized') throw new Error(SERVICE_ERROR);

  return {
    outcome: 'processed' as const,
    operationId: operation.operation_id,
    processed,
  };
}

export async function exportEnterpriseAccessOperationMembers(input: {
  operationId: string;
  organizationId: string;
}) {
  const { data, error } = await client().rpc('export_enterprise_access_operation_members', {
    p_operation_id: input.operationId,
    p_organization_id: input.organizationId,
  });
  if (error) throw new Error(SERVICE_ERROR);
  return Array.isArray(data) ? data : [];
}
