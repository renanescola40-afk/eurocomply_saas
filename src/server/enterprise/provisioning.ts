import { createAdminClient } from '@/lib/supabase/admin';
import {
  reserveEnterpriseSeat,
  type EnterpriseProvisioningSource,
  type EnterpriseSeatType,
  type SeatReservationResult,
} from '@/server/enterprise/licensing';

export type EnterpriseIdentityProvisioningInput = {
  organizationId: string;
  userId: string;
  actorUserId: string;
  role: string;
  seatType: EnterpriseSeatType;
  source: EnterpriseProvisioningSource;
  idempotencyKey: string;
};

export type EnterpriseSeatReleaseResult = {
  outcome: 'released' | 'already_released' | 'duplicate' | 'not_found' | 'invalid_input' | 'invalid_source' | 'unknown';
  membershipId: string | null;
  releasedSeatType: EnterpriseSeatType | null;
  activeMembers: number;
};

type RpcError = { code?: string };
type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcError | null }>;
};

type SeatReleaseRow = {
  outcome?: unknown;
  membership_id?: unknown;
  released_seat_type?: unknown;
  active_members?: unknown;
};

const RELEASE_SEAT_RPC = 'release_organization_seat_atomic';
const PROVISIONING_UNAVAILABLE = 'enterprise_provisioning_unavailable';

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  if (data && typeof data === 'object') return data as T;
  return null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function seatTypeOrNull(value: unknown): EnterpriseSeatType | null {
  return value === 'full' || value === 'participant' || value === 'viewer' ? value : null;
}

function integer(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function rpcClient(): RpcClient {
  return createAdminClient() as unknown as RpcClient;
}

export async function provisionEnterpriseIdentity(
  input: EnterpriseIdentityProvisioningInput,
): Promise<SeatReservationResult> {
  return reserveEnterpriseSeat(input);
}

export async function deprovisionEnterpriseIdentity(input: {
  organizationId: string;
  membershipId: string;
  actorUserId: string;
  source: EnterpriseProvisioningSource;
  idempotencyKey: string;
}): Promise<EnterpriseSeatReleaseResult> {
  const { data, error } = await rpcClient().rpc(RELEASE_SEAT_RPC, {
    p_organization_id: input.organizationId,
    p_member_id: input.membershipId,
    p_actor_user_id: input.actorUserId,
    p_idempotency_key: input.idempotencyKey,
    p_source: input.source,
  });

  if (error) {
    console.warn('[enterprise-provisioning] seat_release_failed', {
      code: error.code ?? 'unknown',
      source: input.source,
    });
    throw new Error(PROVISIONING_UNAVAILABLE);
  }

  const row = firstRow<SeatReleaseRow>(data);
  if (!row || typeof row.outcome !== 'string') throw new Error(PROVISIONING_UNAVAILABLE);

  const knownOutcomes = new Set<EnterpriseSeatReleaseResult['outcome']>([
    'released',
    'already_released',
    'duplicate',
    'not_found',
    'invalid_input',
    'invalid_source',
  ]);

  return {
    outcome: knownOutcomes.has(row.outcome as EnterpriseSeatReleaseResult['outcome'])
      ? (row.outcome as EnterpriseSeatReleaseResult['outcome'])
      : 'unknown',
    membershipId: stringOrNull(row.membership_id),
    releasedSeatType: seatTypeOrNull(row.released_seat_type),
    activeMembers: integer(row.active_members),
  };
}
