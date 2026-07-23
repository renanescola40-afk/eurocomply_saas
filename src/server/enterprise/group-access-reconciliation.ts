import { createHash } from 'node:crypto';

import { createAdminClient } from '@/lib/supabase/admin';
import { provisionEnterpriseIdentity } from '@/server/enterprise/provisioning';
import type { EnterpriseSeatType } from '@/server/enterprise/licensing';

type Candidate = {
  identity_id: string;
  user_id: string;
  membership_id: string;
  current_role: string;
  current_seat_type: EnterpriseSeatType;
  resolved_role: string;
  resolved_seat_type: EnterpriseSeatType;
  department_key: string | null;
  source_group_id: string;
  source_priority: number;
};

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

function client(): RpcClient {
  return createAdminClient() as unknown as RpcClient;
}

function operationKey(candidate: Candidate) {
  return `group-access:${createHash('sha256')
    .update(
      [
        candidate.identity_id,
        candidate.resolved_role,
        candidate.resolved_seat_type,
        candidate.department_key ?? '',
        candidate.source_group_id,
        String(candidate.source_priority),
      ].join(':'),
      'utf8',
    )
    .digest('hex')}`;
}

export async function reconcileEnterpriseGroupAccess(input: {
  organizationId: string;
  actorUserId: string;
  batchSize?: number;
}) {
  const batchSize = Math.min(Math.max(input.batchSize ?? 100, 1), 500);
  const db = client();
  const { data, error } = await db.rpc(
    'list_enterprise_group_access_reconciliation_candidates',
    {
      p_organization_id: input.organizationId,
      p_limit: batchSize,
    },
  );

  if (error) throw new Error('enterprise_group_access_candidates_unavailable');
  const candidates = (Array.isArray(data) ? data : []) as Candidate[];

  const results: Array<{
    identityId: string;
    outcome: string;
    membershipId: string | null;
  }> = [];

  for (const candidate of candidates) {
    const reservation = await provisionEnterpriseIdentity({
      organizationId: input.organizationId,
      userId: candidate.user_id,
      actorUserId: input.actorUserId,
      role: candidate.resolved_role,
      seatType: candidate.resolved_seat_type,
      source: 'scim',
      idempotencyKey: operationKey(candidate),
    });

    if (!['reserved', 'already_active', 'seat_changed', 'duplicate'].includes(reservation.outcome)) {
      results.push({
        identityId: candidate.identity_id,
        outcome: reservation.outcome,
        membershipId: reservation.membershipId,
      });
      continue;
    }

    const membershipId = reservation.membershipId ?? candidate.membership_id;
    const persisted = await db.rpc('persist_enterprise_group_access_reconciliation', {
      p_organization_id: input.organizationId,
      p_identity_id: candidate.identity_id,
      p_membership_id: membershipId,
      p_role: candidate.resolved_role,
      p_seat_type: candidate.resolved_seat_type,
      p_department_key: candidate.department_key,
      p_source_group_id: candidate.source_group_id,
      p_source_priority: candidate.source_priority,
    });

    if (persisted.error || persisted.data !== 'persisted') {
      throw new Error('enterprise_group_access_persistence_unavailable');
    }

    results.push({
      identityId: candidate.identity_id,
      outcome: reservation.outcome,
      membershipId,
    });
  }

  return {
    organizationId: input.organizationId,
    processed: results.length,
    results,
  };
}
