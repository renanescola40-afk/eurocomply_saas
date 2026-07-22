import { createAdminClient } from '@/lib/supabase/admin';
import {
  ENTERPRISE_CONTRACT_STATUSES,
  type EnterpriseContractStatus,
  type EnterpriseSeatType,
} from '@/server/enterprise/licensing';

export type EnterpriseEntitlementSnapshot = {
  organizationId: string;
  contractId: string;
  contractStatus: EnterpriseContractStatus;
  contractVersion: number;
  canAddMembers: boolean;
  limits: {
    members: number;
    fullUsers: number;
    participants: number;
    viewers: number;
    admins: number;
    legalEntities: number;
    aiSystems: number;
    storageBytes: number;
    auditRetentionDays: number;
  };
  usage: {
    activeMembers: number;
    fullUsers: number;
    participants: number;
    viewers: number;
    activeAdmins: number;
  };
  pending: {
    invitations: number;
    fullUsers: number;
    participants: number;
    viewers: number;
    admins: number;
  };
  features: {
    sso: boolean;
    scim: boolean;
    api: boolean;
    webhooks: boolean;
    customRoles: boolean;
    advancedReports: boolean;
    prioritySupport: boolean;
  };
};

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

type SnapshotRow = {
  outcome?: unknown;
  contract_id?: unknown;
  contract_status?: unknown;
  contract_version?: unknown;
  member_limit?: unknown;
  full_user_limit?: unknown;
  participant_limit?: unknown;
  viewer_limit?: unknown;
  admin_limit?: unknown;
  legal_entity_limit?: unknown;
  ai_system_limit?: unknown;
  storage_limit_bytes?: unknown;
  audit_retention_days?: unknown;
  active_members?: unknown;
  full_users?: unknown;
  participants?: unknown;
  viewers?: unknown;
  active_admins?: unknown;
  pending_invitations?: unknown;
  pending_full_users?: unknown;
  pending_participants?: unknown;
  pending_viewers?: unknown;
  pending_admins?: unknown;
  sso_enabled?: unknown;
  scim_enabled?: unknown;
  api_enabled?: unknown;
  webhooks_enabled?: unknown;
  custom_roles_enabled?: unknown;
  advanced_reports_enabled?: unknown;
  priority_support_enabled?: unknown;
};

const SNAPSHOT_RPC = 'resolve_organization_entitlements_v3';
const SNAPSHOT_UNAVAILABLE = 'enterprise_entitlement_snapshot_unavailable';

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === 'object' ? (data as T) : null;
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function contractStatus(value: unknown): EnterpriseContractStatus | null {
  return typeof value === 'string'
    && ENTERPRISE_CONTRACT_STATUSES.includes(value as EnterpriseContractStatus)
    ? (value as EnterpriseContractStatus)
    : null;
}

export function getCommittedMemberCount(snapshot: EnterpriseEntitlementSnapshot) {
  return snapshot.usage.activeMembers + snapshot.pending.invitations;
}

export function getCommittedAdminCount(snapshot: EnterpriseEntitlementSnapshot) {
  return snapshot.usage.activeAdmins + snapshot.pending.admins;
}

export function getSnapshotSeatAvailability(
  snapshot: EnterpriseEntitlementSnapshot,
  seatType: EnterpriseSeatType,
): number {
  if (!snapshot.canAddMembers) return 0;

  const memberCapacity = Math.max(snapshot.limits.members - getCommittedMemberCount(snapshot), 0);
  const seatCapacity = seatType === 'full'
    ? Math.max(snapshot.limits.fullUsers - snapshot.usage.fullUsers - snapshot.pending.fullUsers, 0)
    : seatType === 'participant'
      ? Math.max(
          snapshot.limits.participants - snapshot.usage.participants - snapshot.pending.participants,
          0,
        )
      : Math.max(snapshot.limits.viewers - snapshot.usage.viewers - snapshot.pending.viewers, 0);

  return Math.min(memberCapacity, seatCapacity);
}

export async function resolveEnterpriseEntitlementSnapshot(
  organizationId: string,
): Promise<EnterpriseEntitlementSnapshot> {
  const client = createAdminClient() as unknown as RpcClient;
  const { data, error } = await client.rpc(SNAPSHOT_RPC, { p_organization_id: organizationId });

  if (error) {
    console.warn('[enterprise-entitlements] snapshot_failed', { code: error.code ?? 'unknown' });
    throw new Error(SNAPSHOT_UNAVAILABLE);
  }

  const row = firstRow<SnapshotRow>(data);
  const id = stringValue(row?.contract_id);
  const status = contractStatus(row?.contract_status);
  const version = positiveInteger(row?.contract_version);

  if (
    !row
    || row.outcome !== 'resolved'
    || !id
    || !status
    || !version
  ) {
    throw new Error(SNAPSHOT_UNAVAILABLE);
  }

  return {
    organizationId,
    contractId: id,
    contractStatus: status,
    contractVersion: version,
    canAddMembers: status === 'active',
    limits: {
      members: nonNegativeInteger(row.member_limit),
      fullUsers: nonNegativeInteger(row.full_user_limit),
      participants: nonNegativeInteger(row.participant_limit),
      viewers: nonNegativeInteger(row.viewer_limit),
      admins: nonNegativeInteger(row.admin_limit),
      legalEntities: nonNegativeInteger(row.legal_entity_limit),
      aiSystems: nonNegativeInteger(row.ai_system_limit),
      storageBytes: nonNegativeInteger(row.storage_limit_bytes),
      auditRetentionDays: nonNegativeInteger(row.audit_retention_days),
    },
    usage: {
      activeMembers: nonNegativeInteger(row.active_members),
      fullUsers: nonNegativeInteger(row.full_users),
      participants: nonNegativeInteger(row.participants),
      viewers: nonNegativeInteger(row.viewers),
      activeAdmins: nonNegativeInteger(row.active_admins),
    },
    pending: {
      invitations: nonNegativeInteger(row.pending_invitations),
      fullUsers: nonNegativeInteger(row.pending_full_users),
      participants: nonNegativeInteger(row.pending_participants),
      viewers: nonNegativeInteger(row.pending_viewers),
      admins: nonNegativeInteger(row.pending_admins),
    },
    features: {
      sso: booleanValue(row.sso_enabled),
      scim: booleanValue(row.scim_enabled),
      api: booleanValue(row.api_enabled),
      webhooks: booleanValue(row.webhooks_enabled),
      customRoles: booleanValue(row.custom_roles_enabled),
      advancedReports: booleanValue(row.advanced_reports_enabled),
      prioritySupport: booleanValue(row.priority_support_enabled),
    },
  };
}
