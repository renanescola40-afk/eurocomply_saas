import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';

export const groupAccessPolicyInputSchema = z.object({
  groupId: z.string().uuid(),
  role: z.enum(['admin', 'editor', 'viewer']),
  seatType: z.enum(['full', 'participant', 'viewer']),
  departmentKey: z.string().trim().max(160).nullable().optional(),
  priority: z.number().int().min(0).max(10_000),
  enabled: z.boolean().default(true),
  expectedVersion: z.number().int().min(0),
  reason: z.string().trim().min(3).max(500),
});

export type GroupAccessPolicyInput = z.infer<typeof groupAccessPolicyInputSchema>;

type RpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { code?: string } | null;
  }>;
};

function client(): RpcClient {
  return createAdminClient() as unknown as RpcClient;
}

function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return (data[0] as Record<string, unknown> | undefined) ?? null;
  return data && typeof data === 'object' ? data as Record<string, unknown> : null;
}

function integer(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : 0;
}

export async function previewGroupAccessPolicy(input: {
  organizationId: string;
  policy: GroupAccessPolicyInput;
}) {
  const { data, error } = await client().rpc('preview_enterprise_group_access_policy_change', {
    p_organization_id: input.organizationId,
    p_group_id: input.policy.groupId,
    p_role: input.policy.role,
    p_seat_type: input.policy.seatType,
    p_department_key: input.policy.departmentKey ?? null,
    p_priority: input.policy.priority,
  });
  if (error) throw new Error('group_access_preview_unavailable');
  const row = firstRow(data);
  if (!row || row.outcome !== 'previewed') throw new Error(String(row?.outcome ?? 'group_access_preview_unavailable'));
  return {
    affectedMembers: integer(row.affected_members),
    adminPromotions: integer(row.admin_promotions),
    adminDemotions: integer(row.admin_demotions),
    seatChanges: integer(row.seat_changes),
    conflictCount: integer(row.conflict_count),
    wouldRemoveLastAdmin: row.would_remove_last_admin === true,
  };
}

export async function applyGroupAccessPolicy(input: {
  organizationId: string;
  actorUserId: string;
  policy: GroupAccessPolicyInput;
}) {
  const { data, error } = await client().rpc('apply_enterprise_group_access_policy_change_atomic', {
    p_organization_id: input.organizationId,
    p_group_id: input.policy.groupId,
    p_role: input.policy.role,
    p_seat_type: input.policy.seatType,
    p_department_key: input.policy.departmentKey ?? null,
    p_priority: input.policy.priority,
    p_enabled: input.policy.enabled,
    p_expected_version: input.policy.expectedVersion,
    p_actor_user_id: input.actorUserId,
    p_reason: input.policy.reason,
  });
  if (error) throw new Error('group_access_apply_unavailable');
  const row = firstRow(data);
  if (!row || typeof row.outcome !== 'string') throw new Error('group_access_apply_unavailable');
  return {
    outcome: row.outcome,
    policyId: typeof row.policy_id === 'string' ? row.policy_id : null,
    appliedVersion: integer(row.applied_version),
    affectedMembers: integer(row.affected_members),
  };
}