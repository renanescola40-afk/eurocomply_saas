import { createAdminClient } from '@/lib/supabase/admin';

export const ENTERPRISE_CONTRACT_STATUSES = [
  'draft',
  'pending_activation',
  'active',
  'past_due',
  'grace_period',
  'read_only',
  'suspended',
  'expired',
  'terminated',
] as const;

export const ENTERPRISE_SEAT_TYPES = ['full', 'participant', 'viewer'] as const;

export type EnterpriseContractStatus = (typeof ENTERPRISE_CONTRACT_STATUSES)[number];
export type EnterpriseSeatType = (typeof ENTERPRISE_SEAT_TYPES)[number];
export type EnterpriseProvisioningSource =
  | 'invitation'
  | 'csv'
  | 'scim'
  | 'sso'
  | 'api'
  | 'platform'
  | 'admin'
  | 'reactivation';

export type EnterpriseEntitlementContext = {
  organizationId: string;
  contractId: string;
  contractStatus: EnterpriseContractStatus;
  canAddMembers: boolean;
  limits: {
    members: number;
    fullUsers: number;
    participants: number;
    viewers: number;
    admins: number;
  };
  usage: {
    activeMembers: number;
    fullUsers: number;
    participants: number;
    viewers: number;
    activeAdmins: number;
  };
  features: {
    sso: boolean;
    scim: boolean;
    api: boolean;
    webhooks: boolean;
  };
};

export type SeatReservationResult = {
  outcome:
    | 'reserved'
    | 'already_active'
    | 'seat_changed'
    | 'duplicate'
    | 'member_limit_reached'
    | 'seat_limit_reached'
    | 'admin_limit_reached'
    | 'contract_missing'
    | 'contract_not_active'
    | 'entitlements_missing'
    | 'invalid_input'
    | 'invalid_idempotency_key'
    | 'invalid_role'
    | 'invalid_seat_type'
    | 'invalid_source'
    | 'unknown';
  membershipId: string | null;
  role: string | null;
  seatType: EnterpriseSeatType | null;
  activeMembers: number;
  seatUsage: number;
  seatLimit: number;
};

type RpcError = {
  code?: string;
};

type RpcResponse = {
  data: unknown;
  error: RpcError | null;
};

type RpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResponse>;
};

type EntitlementRow = {
  outcome?: unknown;
  contract_id?: unknown;
  contract_status?: unknown;
  member_limit?: unknown;
  full_user_limit?: unknown;
  participant_limit?: unknown;
  viewer_limit?: unknown;
  admin_limit?: unknown;
  active_members?: unknown;
  full_users?: unknown;
  participants?: unknown;
  viewers?: unknown;
  active_admins?: unknown;
  sso_enabled?: unknown;
  scim_enabled?: unknown;
  api_enabled?: unknown;
  webhooks_enabled?: unknown;
};

type SeatReservationRow = {
  outcome?: unknown;
  membership_id?: unknown;
  applied_role?: unknown;
  applied_seat_type?: unknown;
  active_members?: unknown;
  seat_usage?: unknown;
  seat_limit?: unknown;
};

const RESOLVE_ENTITLEMENTS_RPC = 'resolve_organization_entitlements';
const RESERVE_SEAT_RPC = 'reserve_organization_seat_atomic';
const LICENSING_UNAVAILABLE = 'enterprise_licensing_unavailable';

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  if (data && typeof data === 'object') return data as T;
  return null;
}

function integer(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function boolean(value: unknown): boolean {
  return value === true;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function isContractStatus(value: unknown): value is EnterpriseContractStatus {
  return typeof value === 'string' && ENTERPRISE_CONTRACT_STATUSES.includes(value as EnterpriseContractStatus);
}

export function normalizeEnterpriseSeatType(value: unknown): EnterpriseSeatType | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return ENTERPRISE_SEAT_TYPES.includes(normalized as EnterpriseSeatType)
    ? (normalized as EnterpriseSeatType)
    : null;
}

export function contractAllowsNewSeats(status: EnterpriseContractStatus): boolean {
  return status === 'active';
}

export function getSeatAvailability(
  context: EnterpriseEntitlementContext,
  seatType: EnterpriseSeatType,
): number {
  if (!context.canAddMembers) return 0;

  const memberAvailability = Math.max(context.limits.members - context.usage.activeMembers, 0);
  const seatAvailability =
    seatType === 'full'
      ? Math.max(context.limits.fullUsers - context.usage.fullUsers, 0)
      : seatType === 'participant'
        ? Math.max(context.limits.participants - context.usage.participants, 0)
        : Math.max(context.limits.viewers - context.usage.viewers, 0);

  return Math.min(memberAvailability, seatAvailability);
}

function getRpcClient(): RpcClient {
  const client = createAdminClient();
  return client as unknown as RpcClient;
}

export async function resolveEnterpriseEntitlements(
  organizationId: string,
): Promise<EnterpriseEntitlementContext> {
  const { data, error } = await getRpcClient().rpc(RESOLVE_ENTITLEMENTS_RPC, {
    p_organization_id: organizationId,
  });

  if (error) {
    console.warn('[enterprise-licensing] entitlement_resolution_failed', {
      code: error.code ?? 'unknown',
    });
    throw new Error(LICENSING_UNAVAILABLE);
  }

  const row = firstRow<EntitlementRow>(data);
  const contractId = stringOrNull(row?.contract_id);
  const contractStatus = row?.contract_status;

  if (!row || row.outcome === 'contract_missing' || row.outcome === 'entitlements_missing' || row.outcome === 'usage_missing') {
    throw new Error(LICENSING_UNAVAILABLE);
  }

  if (!contractId || !isContractStatus(contractStatus)) {
    throw new Error(LICENSING_UNAVAILABLE);
  }

  return {
    organizationId,
    contractId,
    contractStatus,
    canAddMembers: row.outcome === 'resolved' && contractAllowsNewSeats(contractStatus),
    limits: {
      members: integer(row.member_limit),
      fullUsers: integer(row.full_user_limit),
      participants: integer(row.participant_limit),
      viewers: integer(row.viewer_limit),
      admins: integer(row.admin_limit),
    },
    usage: {
      activeMembers: integer(row.active_members),
      fullUsers: integer(row.full_users),
      participants: integer(row.participants),
      viewers: integer(row.viewers),
      activeAdmins: integer(row.active_admins),
    },
    features: {
      sso: boolean(row.sso_enabled),
      scim: boolean(row.scim_enabled),
      api: boolean(row.api_enabled),
      webhooks: boolean(row.webhooks_enabled),
    },
  };
}

export async function reserveEnterpriseSeat(input: {
  organizationId: string;
  userId: string;
  actorUserId: string;
  role: string;
  seatType: EnterpriseSeatType;
  source: EnterpriseProvisioningSource;
  idempotencyKey: string;
}): Promise<SeatReservationResult> {
  const { data, error } = await getRpcClient().rpc(RESERVE_SEAT_RPC, {
    p_organization_id: input.organizationId,
    p_user_id: input.userId,
    p_role: input.role,
    p_seat_type: input.seatType,
    p_actor_user_id: input.actorUserId,
    p_idempotency_key: input.idempotencyKey,
    p_source: input.source,
  });

  if (error) {
    console.warn('[enterprise-licensing] seat_reservation_failed', {
      code: error.code ?? 'unknown',
      source: input.source,
    });
    throw new Error(LICENSING_UNAVAILABLE);
  }

  const row = firstRow<SeatReservationRow>(data);
  if (!row || typeof row.outcome !== 'string') throw new Error(LICENSING_UNAVAILABLE);

  const seatType = normalizeEnterpriseSeatType(row.applied_seat_type);
  const knownOutcomes = new Set<SeatReservationResult['outcome']>([
    'reserved',
    'already_active',
    'seat_changed',
    'duplicate',
    'member_limit_reached',
    'seat_limit_reached',
    'admin_limit_reached',
    'contract_missing',
    'contract_not_active',
    'entitlements_missing',
    'invalid_input',
    'invalid_idempotency_key',
    'invalid_role',
    'invalid_seat_type',
    'invalid_source',
  ]);

  const outcome = knownOutcomes.has(row.outcome as SeatReservationResult['outcome'])
    ? (row.outcome as SeatReservationResult['outcome'])
    : 'unknown';

  return {
    outcome,
    membershipId: stringOrNull(row.membership_id),
    role: stringOrNull(row.applied_role),
    seatType,
    activeMembers: integer(row.active_members),
    seatUsage: integer(row.seat_usage),
    seatLimit: integer(row.seat_limit),
  };
}
