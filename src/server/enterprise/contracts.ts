import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  ENTERPRISE_CONTRACT_STATUSES,
  type EnterpriseContractStatus,
} from '@/server/enterprise/licensing';

const isoDateTimeSchema = z.string().datetime({ offset: true });
const optionalIsoDateTimeSchema = isoDateTimeSchema.nullable().optional();
const safeIntegerSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

const entitlementShape = {
  memberLimit: z.number().int().min(1).max(1_000_000),
  fullUserLimit: z.number().int().min(0).max(1_000_000),
  participantLimit: z.number().int().min(0).max(1_000_000),
  viewerLimit: z.number().int().min(0).max(1_000_000),
  adminLimit: z.number().int().min(1).max(100_000),
  legalEntityLimit: z.number().int().min(0).max(100_000).default(1),
  aiSystemLimit: z.number().int().min(0).max(1_000_000).default(100),
  storageLimitBytes: safeIntegerSchema.default(10 * 1024 * 1024 * 1024),
  auditRetentionDays: z.number().int().min(0).max(3650).default(365),
  ssoEnabled: z.boolean().default(false),
  scimEnabled: z.boolean().default(false),
  apiEnabled: z.boolean().default(false),
  webhooksEnabled: z.boolean().default(false),
  customRolesEnabled: z.boolean().default(false),
  advancedReportsEnabled: z.boolean().default(false),
  prioritySupportEnabled: z.boolean().default(false),
};

type EntitlementValues = {
  memberLimit: number;
  fullUserLimit: number;
  participantLimit: number;
  viewerLimit: number;
  adminLimit: number;
};

function validateSeatLimits(value: EntitlementValues, context: z.RefinementCtx) {
  if (value.fullUserLimit + value.participantLimit + value.viewerLimit < value.memberLimit) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['memberLimit'],
      message: 'Seat-type limits must cover the total member limit.',
    });
  }

  if (value.adminLimit > value.memberLimit) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['adminLimit'],
      message: 'Administrator limit cannot exceed the member limit.',
    });
  }
}

export const createEnterpriseContractSchema = z
  .object({
    organizationId: z.string().uuid(),
    contractCode: z.string().trim().min(3).max(120).regex(/^[A-Za-z0-9._-]+$/),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
    annualValueMinor: safeIntegerSchema,
    startsAt: isoDateTimeSchema,
    endsAt: optionalIsoDateTimeSchema,
    renewsAt: optionalIsoDateTimeSchema,
    paymentTermsDays: z.number().int().min(0).max(365).default(30),
    gracePeriodDays: z.number().int().min(0).max(365).default(14),
    ...entitlementShape,
  })
  .superRefine((value, context) => {
    validateSeatLimits(value, context);

    if (value.endsAt && Date.parse(value.endsAt) <= Date.parse(value.startsAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'Contract end must be after its start.',
      });
    }
  });

export const updateEnterpriseEntitlementsSchema = z
  .object({
    contractId: z.string().uuid(),
    expectedVersion: z.number().int().min(1),
    reason: z.string().trim().min(5).max(1000),
    ...entitlementShape,
  })
  .superRefine(validateSeatLimits);

export const transitionEnterpriseContractSchema = z.object({
  contractId: z.string().uuid(),
  expectedStatus: z.enum(ENTERPRISE_CONTRACT_STATUSES),
  nextStatus: z.enum(ENTERPRISE_CONTRACT_STATUSES),
  reason: z.string().trim().min(5).max(1000),
});

export type CreateEnterpriseContractInput = z.infer<typeof createEnterpriseContractSchema>;
export type UpdateEnterpriseEntitlementsInput = z.infer<typeof updateEnterpriseEntitlementsSchema>;
export type TransitionEnterpriseContractInput = z.infer<typeof transitionEnterpriseContractSchema>;

type RpcError = { code?: string };
type RpcResponse = { data: unknown; error: RpcError | null };
type RpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResponse>;
};

type ContractProvisioningRow = {
  outcome?: unknown;
  contract_id?: unknown;
  organization_id?: unknown;
  contract_status?: unknown;
  version?: unknown;
};

type ContractTransitionRow = {
  outcome?: unknown;
  contract_id?: unknown;
  organization_id?: unknown;
  previous_status?: unknown;
  applied_status?: unknown;
  version?: unknown;
};

type EntitlementUpdateRow = {
  outcome?: unknown;
  contract_id?: unknown;
  organization_id?: unknown;
  contract_status?: unknown;
  version?: unknown;
  member_limit?: unknown;
  full_user_limit?: unknown;
  participant_limit?: unknown;
  viewer_limit?: unknown;
  admin_limit?: unknown;
};

export type ContractProvisioningResult = {
  outcome:
    | 'created'
    | 'invalid_input'
    | 'invalid_contract'
    | 'platform_role_required'
    | 'organization_not_found'
    | 'current_contract_exists'
    | 'limits_below_current_usage'
    | 'unavailable';
  contractId: string | null;
  organizationId: string | null;
  contractStatus: EnterpriseContractStatus | null;
  version: number | null;
};

export type ContractTransitionResult = {
  outcome:
    | 'changed'
    | 'unchanged'
    | 'invalid_input'
    | 'reason_required'
    | 'platform_role_required'
    | 'insufficient_platform_role'
    | 'not_found'
    | 'state_changed'
    | 'invalid_transition'
    | 'unavailable';
  contractId: string | null;
  organizationId: string | null;
  previousStatus: EnterpriseContractStatus | null;
  appliedStatus: EnterpriseContractStatus | null;
  version: number | null;
};

export type EntitlementUpdateResult = {
  outcome:
    | 'changed'
    | 'invalid_input'
    | 'reason_required'
    | 'invalid_limits'
    | 'platform_role_required'
    | 'not_found'
    | 'contract_terminated'
    | 'version_changed'
    | 'entitlements_missing'
    | 'limits_below_committed_usage'
    | 'unavailable';
  contractId: string | null;
  organizationId: string | null;
  contractStatus: EnterpriseContractStatus | null;
  version: number | null;
  limits: {
    members: number | null;
    fullUsers: number | null;
    participants: number | null;
    viewers: number | null;
    admins: number | null;
  };
};

const PROVISION_CONTRACT_RPC = 'provision_enterprise_contract_atomic';
const TRANSITION_CONTRACT_RPC = 'transition_enterprise_contract_status_atomic';
const UPDATE_ENTITLEMENTS_RPC = 'update_enterprise_contract_entitlements_atomic';
const CONTRACT_CONTROL_UNAVAILABLE = 'enterprise_contract_control_unavailable';

function rpcClient(): RpcClient {
  return createAdminClient() as unknown as RpcClient;
}

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  if (data && typeof data === 'object') return data as T;
  return null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function integerOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

function contractStatusOrNull(value: unknown): EnterpriseContractStatus | null {
  return typeof value === 'string'
    && ENTERPRISE_CONTRACT_STATUSES.includes(value as EnterpriseContractStatus)
    ? (value as EnterpriseContractStatus)
    : null;
}

export async function provisionEnterpriseContract(
  input: CreateEnterpriseContractInput,
  actorUserId: string,
): Promise<ContractProvisioningResult> {
  const payload = createEnterpriseContractSchema.parse(input);
  const { data, error } = await rpcClient().rpc(PROVISION_CONTRACT_RPC, {
    p_organization_id: payload.organizationId,
    p_contract_code: payload.contractCode,
    p_currency: payload.currency,
    p_annual_value_minor: payload.annualValueMinor,
    p_starts_at: payload.startsAt,
    p_ends_at: payload.endsAt ?? null,
    p_renews_at: payload.renewsAt ?? null,
    p_payment_terms_days: payload.paymentTermsDays,
    p_grace_period_days: payload.gracePeriodDays,
    p_member_limit: payload.memberLimit,
    p_full_user_limit: payload.fullUserLimit,
    p_participant_limit: payload.participantLimit,
    p_viewer_limit: payload.viewerLimit,
    p_admin_limit: payload.adminLimit,
    p_legal_entity_limit: payload.legalEntityLimit,
    p_ai_system_limit: payload.aiSystemLimit,
    p_storage_limit_bytes: payload.storageLimitBytes,
    p_audit_retention_days: payload.auditRetentionDays,
    p_sso_enabled: payload.ssoEnabled,
    p_scim_enabled: payload.scimEnabled,
    p_api_enabled: payload.apiEnabled,
    p_webhooks_enabled: payload.webhooksEnabled,
    p_custom_roles_enabled: payload.customRolesEnabled,
    p_advanced_reports_enabled: payload.advancedReportsEnabled,
    p_priority_support_enabled: payload.prioritySupportEnabled,
    p_actor_user_id: actorUserId,
  });

  if (error) {
    console.warn('[enterprise-contracts] provision_failed', { code: error.code ?? 'unknown' });
    throw new Error(CONTRACT_CONTROL_UNAVAILABLE);
  }

  const row = firstRow<ContractProvisioningRow>(data);
  if (!row || typeof row.outcome !== 'string') throw new Error(CONTRACT_CONTROL_UNAVAILABLE);

  const knownOutcomes = new Set<ContractProvisioningResult['outcome']>([
    'created',
    'invalid_input',
    'invalid_contract',
    'platform_role_required',
    'organization_not_found',
    'current_contract_exists',
    'limits_below_current_usage',
  ]);

  return {
    outcome: knownOutcomes.has(row.outcome as ContractProvisioningResult['outcome'])
      ? (row.outcome as ContractProvisioningResult['outcome'])
      : 'unavailable',
    contractId: stringOrNull(row.contract_id),
    organizationId: stringOrNull(row.organization_id),
    contractStatus: contractStatusOrNull(row.contract_status),
    version: integerOrNull(row.version),
  };
}

export async function updateEnterpriseEntitlements(
  input: UpdateEnterpriseEntitlementsInput,
  actorUserId: string,
): Promise<EntitlementUpdateResult> {
  const payload = updateEnterpriseEntitlementsSchema.parse(input);
  const { data, error } = await rpcClient().rpc(UPDATE_ENTITLEMENTS_RPC, {
    p_contract_id: payload.contractId,
    p_expected_version: payload.expectedVersion,
    p_member_limit: payload.memberLimit,
    p_full_user_limit: payload.fullUserLimit,
    p_participant_limit: payload.participantLimit,
    p_viewer_limit: payload.viewerLimit,
    p_admin_limit: payload.adminLimit,
    p_legal_entity_limit: payload.legalEntityLimit,
    p_ai_system_limit: payload.aiSystemLimit,
    p_storage_limit_bytes: payload.storageLimitBytes,
    p_audit_retention_days: payload.auditRetentionDays,
    p_sso_enabled: payload.ssoEnabled,
    p_scim_enabled: payload.scimEnabled,
    p_api_enabled: payload.apiEnabled,
    p_webhooks_enabled: payload.webhooksEnabled,
    p_custom_roles_enabled: payload.customRolesEnabled,
    p_advanced_reports_enabled: payload.advancedReportsEnabled,
    p_priority_support_enabled: payload.prioritySupportEnabled,
    p_actor_user_id: actorUserId,
    p_reason: payload.reason,
  });

  if (error) {
    console.warn('[enterprise-contracts] entitlement_update_failed', { code: error.code ?? 'unknown' });
    throw new Error(CONTRACT_CONTROL_UNAVAILABLE);
  }

  const row = firstRow<EntitlementUpdateRow>(data);
  if (!row || typeof row.outcome !== 'string') throw new Error(CONTRACT_CONTROL_UNAVAILABLE);

  const knownOutcomes = new Set<EntitlementUpdateResult['outcome']>([
    'changed',
    'invalid_input',
    'reason_required',
    'invalid_limits',
    'platform_role_required',
    'not_found',
    'contract_terminated',
    'version_changed',
    'entitlements_missing',
    'limits_below_committed_usage',
  ]);

  return {
    outcome: knownOutcomes.has(row.outcome as EntitlementUpdateResult['outcome'])
      ? (row.outcome as EntitlementUpdateResult['outcome'])
      : 'unavailable',
    contractId: stringOrNull(row.contract_id),
    organizationId: stringOrNull(row.organization_id),
    contractStatus: contractStatusOrNull(row.contract_status),
    version: integerOrNull(row.version),
    limits: {
      members: integerOrNull(row.member_limit),
      fullUsers: integerOrNull(row.full_user_limit),
      participants: integerOrNull(row.participant_limit),
      viewers: integerOrNull(row.viewer_limit),
      admins: integerOrNull(row.admin_limit),
    },
  };
}

export async function transitionEnterpriseContract(
  input: TransitionEnterpriseContractInput,
  actorUserId: string,
): Promise<ContractTransitionResult> {
  const payload = transitionEnterpriseContractSchema.parse(input);
  const { data, error } = await rpcClient().rpc(TRANSITION_CONTRACT_RPC, {
    p_contract_id: payload.contractId,
    p_expected_status: payload.expectedStatus,
    p_next_status: payload.nextStatus,
    p_actor_user_id: actorUserId,
    p_reason: payload.reason,
  });

  if (error) {
    console.warn('[enterprise-contracts] transition_failed', { code: error.code ?? 'unknown' });
    throw new Error(CONTRACT_CONTROL_UNAVAILABLE);
  }

  const row = firstRow<ContractTransitionRow>(data);
  if (!row || typeof row.outcome !== 'string') throw new Error(CONTRACT_CONTROL_UNAVAILABLE);

  const knownOutcomes = new Set<ContractTransitionResult['outcome']>([
    'changed',
    'unchanged',
    'invalid_input',
    'reason_required',
    'platform_role_required',
    'insufficient_platform_role',
    'not_found',
    'state_changed',
    'invalid_transition',
  ]);

  return {
    outcome: knownOutcomes.has(row.outcome as ContractTransitionResult['outcome'])
      ? (row.outcome as ContractTransitionResult['outcome'])
      : 'unavailable',
    contractId: stringOrNull(row.contract_id),
    organizationId: stringOrNull(row.organization_id),
    previousStatus: contractStatusOrNull(row.previous_status),
    appliedStatus: contractStatusOrNull(row.applied_status),
    version: integerOrNull(row.version),
  };
}
