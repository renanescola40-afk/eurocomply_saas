import { createHash } from 'node:crypto';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';

export const seatTypeSchema = z.enum(['full', 'participant', 'viewer']);

export const reserveSeatInputSchema = z.object({
  organizationId: z.string().uuid(),
  seatType: seatTypeSchema,
  idempotencyKey: z.string().trim().min(16).max(200),
  expectedPolicyVersion: z.number().int().positive(),
  actorUserId: z.string().uuid(),
  memberId: z.string().uuid().nullable().optional(),
  inviteEmail: z.string().email().max(320).nullable().optional(),
  ttlSeconds: z.number().int().min(60).max(86_400).default(900),
}).refine((value) => Boolean(value.memberId || value.inviteEmail), {
  message: 'memberId or inviteEmail is required',
});

export const consumeSeatInputSchema = z.object({
  organizationId: z.string().uuid(),
  reservationId: z.string().uuid(),
  memberId: z.string().uuid(),
  expectedMemberSeatVersion: z.number().int().positive(),
  actorUserId: z.string().uuid(),
});

export type ReserveSeatInput = z.infer<typeof reserveSeatInputSchema>;
export type ConsumeSeatInput = z.infer<typeof consumeSeatInputSchema>;

interface RpcResult {
  data: unknown;
  error: { code?: string; message?: string } | null;
}

interface RpcClient {
  rpc(name: string, args: Record<string, unknown>): Promise<RpcResult>;
}

function client(): RpcClient {
  return createAdminClient() as unknown as RpcClient;
}

function row(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return (data[0] as Record<string, unknown> | undefined) ?? null;
  return data && typeof data === 'object' ? data as Record<string, unknown> : null;
}

function integer(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : 0;
}

function emailHash(email: string | null | undefined): string | null {
  if (!email) return null;
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

export async function reserveEnterpriseSeat(raw: ReserveSeatInput) {
  const input = reserveSeatInputSchema.parse(raw);
  const { data, error } = await client().rpc('reserve_enterprise_seat_atomic', {
    p_organization_id: input.organizationId,
    p_seat_type: input.seatType,
    p_idempotency_key: input.idempotencyKey,
    p_expected_policy_version: input.expectedPolicyVersion,
    p_actor_user_id: input.actorUserId,
    p_member_id: input.memberId ?? null,
    p_invite_email_hash: emailHash(input.inviteEmail),
    p_ttl_seconds: input.ttlSeconds,
  });
  if (error) throw new Error('seat_reservation_unavailable');
  const result = row(data);
  if (!result || typeof result.outcome !== 'string') throw new Error('seat_reservation_unavailable');
  return {
    outcome: result.outcome,
    reservationId: typeof result.reservation_id === 'string' ? result.reservation_id : null,
    policyVersion: integer(result.policy_version),
    usedCount: integer(result.used_count),
    reservedCount: integer(result.reserved_count),
    seatLimit: integer(result.seat_limit),
  };
}

export async function consumeEnterpriseSeatReservation(raw: ConsumeSeatInput) {
  const input = consumeSeatInputSchema.parse(raw);
  const { data, error } = await client().rpc('consume_enterprise_seat_reservation_atomic', {
    p_organization_id: input.organizationId,
    p_reservation_id: input.reservationId,
    p_member_id: input.memberId,
    p_expected_member_seat_version: input.expectedMemberSeatVersion,
    p_actor_user_id: input.actorUserId,
  });
  if (error) throw new Error('seat_reservation_consume_unavailable');
  const result = row(data);
  if (!result || typeof result.outcome !== 'string') throw new Error('seat_reservation_consume_unavailable');
  return {
    outcome: result.outcome,
    memberSeatVersion: integer(result.member_seat_version),
  };
}
