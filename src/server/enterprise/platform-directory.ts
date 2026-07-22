import { createAdminClient } from '@/lib/supabase/admin';

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null; count?: number | null }>;
};

export type PlatformEnterpriseOrganization = {
  organizationId: string;
  name: string;
  slug: string | null;
  createdAt: string;
  contractId: string | null;
  contractCode: string | null;
  contractMode: string | null;
  contractStatus: string;
  billingStatus: string;
  contractVersion: number | null;
  memberLimit: number;
  committedMembers: number;
  availableMembers: number;
  openAlerts: number;
};

type DirectoryRow = {
  organization_id?: unknown;
  organization_name?: unknown;
  organization_slug?: unknown;
  organization_created_at?: unknown;
  contract_id?: unknown;
  contract_code?: unknown;
  contract_mode?: unknown;
  contract_status?: unknown;
  billing_status?: unknown;
  contract_version?: unknown;
  member_limit?: unknown;
  committed_members?: unknown;
  available_members?: unknown;
  open_alerts?: unknown;
  total_count?: unknown;
};

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function integer(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number.parseInt(value, 10);
  return fallback;
}

function parseDirectoryRow(value: unknown): PlatformEnterpriseOrganization & { totalCount: number } {
  const row = value as DirectoryRow;
  const organizationId = stringField(row.organization_id);
  const name = stringField(row.organization_name);
  const createdAt = stringField(row.organization_created_at);
  const contractStatus = stringField(row.contract_status);
  const billingStatus = stringField(row.billing_status);
  if (!organizationId || !name || !createdAt || !contractStatus || !billingStatus) {
    throw new Error('platform_enterprise_directory_invalid_result');
  }

  return {
    organizationId,
    name,
    slug: stringField(row.organization_slug),
    createdAt,
    contractId: stringField(row.contract_id),
    contractCode: stringField(row.contract_code),
    contractMode: stringField(row.contract_mode),
    contractStatus,
    billingStatus,
    contractVersion: row.contract_version === null || row.contract_version === undefined
      ? null
      : integer(row.contract_version),
    memberLimit: integer(row.member_limit),
    committedMembers: integer(row.committed_members),
    availableMembers: integer(row.available_members),
    openAlerts: integer(row.open_alerts),
    totalCount: integer(row.total_count),
  };
}

export async function listPlatformEnterpriseOrganizations(input: {
  actorUserId: string;
  search?: string | null;
  contractStatus?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(Math.trunc(input.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Math.trunc(input.pageSize ?? 50), 1), 100);
  const client = createAdminClient() as unknown as RpcClient;
  const { data, error } = await client.rpc('list_platform_enterprise_organizations', {
    p_actor_user_id: input.actorUserId,
    p_search: input.search?.trim() || null,
    p_contract_status: input.contractStatus?.trim() || null,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });

  if (error) {
    console.warn('[platform-enterprise-directory] list_failed', { code: error.code ?? 'unknown' });
    throw new Error('platform_enterprise_directory_unavailable');
  }

  const parsed = (Array.isArray(data) ? data : data ? [data] : []).map(parseDirectoryRow);
  const total = parsed[0]?.totalCount ?? 0;
  return {
    organizations: parsed.map(({ totalCount: _totalCount, ...organization }) => organization),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPlatformEnterpriseOrganizationDetail(input: {
  actorUserId: string;
  organizationId: string;
}) {
  const client = createAdminClient() as unknown as RpcClient;
  const { data, error } = await client.rpc('get_platform_enterprise_organization_detail', {
    p_actor_user_id: input.actorUserId,
    p_organization_id: input.organizationId,
  });

  if (error) {
    console.warn('[platform-enterprise-directory] detail_failed', { code: error.code ?? 'unknown' });
    throw new Error('platform_enterprise_directory_unavailable');
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('platform_enterprise_directory_invalid_result');
  }

  return data as Record<string, unknown>;
}
