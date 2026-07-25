import { createHash } from 'node:crypto';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';

export const entitlementSnapshotSchema = z.object({
  organizationId: z.string().uuid(),
  sourceId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(8).max(200),
  expectedSourceVersion: z.number().int().positive(),
  planCode: z.string().trim().min(1).max(120),
  fullSeatLimit: z.number().int().min(0).max(1_000_000),
  participantSeatLimit: z.number().int().min(0).max(1_000_000),
  viewerSeatLimit: z.number().int().min(0).max(1_000_000),
  entitlements: z.record(z.string(), z.union([z.boolean(), z.number(), z.string(), z.null()])),
  observedAt: z.string().datetime(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().nullable(),
  actorUserId: z.string().uuid().nullable(),
});

export type EntitlementSnapshot = z.infer<typeof entitlementSnapshotSchema>;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function entitlementPayloadDigest(input: EntitlementSnapshot): string {
  const canonical = {
    planCode: input.planCode,
    fullSeatLimit: input.fullSeatLimit,
    participantSeatLimit: input.participantSeatLimit,
    viewerSeatLimit: input.viewerSeatLimit,
    entitlements: input.entitlements,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
  };
  return createHash('sha256').update(stable(canonical)).digest('hex');
}

export function validateEntitlementWindow(input: Pick<EntitlementSnapshot, 'observedAt' | 'validFrom' | 'validUntil'>) {
  const observedAt = new Date(input.observedAt);
  const validFrom = new Date(input.validFrom);
  const validUntil = input.validUntil ? new Date(input.validUntil) : null;
  if ([observedAt, validFrom, ...(validUntil ? [validUntil] : [])].some((date) => Number.isNaN(date.valueOf()))) {
    return { ok: false, reason: 'invalid_timestamp' } as const;
  }
  if (validUntil && validUntil <= validFrom) return { ok: false, reason: 'invalid_window' } as const;
  return { ok: true } as const;
}

type RpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
};

function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return (data[0] as Record<string, unknown> | undefined) ?? null;
  return data && typeof data === 'object' ? data as Record<string, unknown> : null;
}

export async function reconcileEntitlementSnapshot(raw: unknown) {
  const input = entitlementSnapshotSchema.parse(raw);
  const window = validateEntitlementWindow(input);
  if (!window.ok) return { outcome: window.reason } as const;

  const client = createAdminClient() as unknown as RpcClient;
  const { data, error } = await client.rpc('apply_enterprise_entitlement_snapshot_atomic', {
    p_organization_id: input.organizationId,
    p_source_id: input.sourceId,
    p_idempotency_key: input.idempotencyKey,
    p_expected_source_version: input.expectedSourceVersion,
    p_plan_code: input.planCode,
    p_full_seat_limit: input.fullSeatLimit,
    p_participant_seat_limit: input.participantSeatLimit,
    p_viewer_seat_limit: input.viewerSeatLimit,
    p_entitlements: input.entitlements,
    p_source_payload_sha256: entitlementPayloadDigest(input),
    p_observed_at: input.observedAt,
    p_valid_from: input.validFrom,
    p_valid_until: input.validUntil,
    p_actor_user_id: input.actorUserId,
  });
  if (error) throw new Error('entitlement_reconciliation_unavailable');
  const row = firstRow(data);
  if (!row || typeof row.outcome !== 'string') throw new Error('entitlement_reconciliation_invalid_response');
  return {
    outcome: row.outcome,
    snapshotId: typeof row.snapshot_id === 'string' ? row.snapshot_id : null,
    appliedPolicyVersion: typeof row.applied_policy_version === 'number' ? row.applied_policy_version : null,
    sourceVersion: typeof row.source_version === 'number' ? row.source_version : null,
  } as const;
}
