import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';

const uuid = z.string().uuid();
const seatType = z.enum(['full', 'participant', 'viewer']);

const rpcClient = () => createAdminClient() as unknown as {
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return (data[0] as Record<string, unknown> | undefined) ?? null;
  return data && typeof data === 'object' ? data as Record<string, unknown> : null;
}

export async function reserveSeatWithConcurrencyGuard(input: {
  organizationId: string;
  membershipId: string;
  requestedSeatType: 'full' | 'participant' | 'viewer';
  expectedContractVersion?: number | null;
  actorUserId: string;
  correlationId?: string;
}) {
  const client = rpcClient();
  const { data, error } = await client.rpc('reserve_enterprise_seat_with_concurrency_guard', {
    p_organization_id: uuid.parse(input.organizationId),
    p_membership_id: uuid.parse(input.membershipId),
    p_requested_seat_type: seatType.parse(input.requestedSeatType),
    p_expected_contract_version: input.expectedContractVersion ?? null,
    p_actor_user_id: uuid.parse(input.actorUserId),
    p_correlation_id: input.correlationId ? uuid.parse(input.correlationId) : undefined,
  });
  if (error) throw new Error('enterprise_seat_concurrency_unavailable');
  const row = firstRow(data);
  if (!row || typeof row.outcome !== 'string') throw new Error('enterprise_seat_concurrency_invalid_result');
  return {
    outcome: row.outcome,
    usedSeats: Number(row.used_seats ?? 0),
    seatLimit: Number(row.seat_limit ?? 0),
    contractVersion: Number(row.contract_version ?? 0),
  };
}

export async function enqueueAccessEscalations() {
  const { data, error } = await rpcClient().rpc('enqueue_enterprise_access_escalations');
  if (error) throw new Error('enterprise_access_escalation_enqueue_failed');
  return { enqueued: Number(data ?? 0) };
}

export async function processNextAccessNotification(deliver: (input: {
  notificationId: string;
  organizationId: string;
  channel: string;
  payload: Record<string, unknown>;
}) => Promise<void>) {
  const client = rpcClient();
  const claim = await client.rpc('claim_enterprise_access_notification');
  if (claim.error) throw new Error('enterprise_access_notification_claim_failed');
  const row = firstRow(claim.data);
  if (!row) return { outcome: 'idle' as const };

  const notificationId = uuid.parse(row.notification_id);
  const organizationId = uuid.parse(row.organization_id);
  const leaseToken = uuid.parse(row.lease_token);
  const channel = String(row.channel ?? 'in_app');
  const payload = row.payload && typeof row.payload === 'object' ? row.payload as Record<string, unknown> : {};

  try {
    await deliver({ notificationId, organizationId, channel, payload });
    const completed = await client.rpc('complete_enterprise_access_notification', {
      p_notification_id: notificationId,
      p_lease_token: leaseToken,
      p_delivered: true,
      p_error_code: null,
    });
    if (completed.error || completed.data !== 'delivered') throw new Error('enterprise_access_notification_completion_failed');
    return { outcome: 'delivered' as const, notificationId };
  } catch (error) {
    const failed = await client.rpc('complete_enterprise_access_notification', {
      p_notification_id: notificationId,
      p_lease_token: leaseToken,
      p_delivered: false,
      p_error_code: error instanceof Error ? error.message.slice(0, 120) : 'delivery_failed',
    });
    if (failed.error) throw new Error('enterprise_access_notification_failure_record_failed');
    return { outcome: String(failed.data) as 'retry' | 'dead_letter', notificationId };
  }
}

export async function getSeatContentionSummary(organizationId: string) {
  const client = createAdminClient();
  const { data, error } = await client
    .from('enterprise_seat_contention_events')
    .select('outcome,created_at,used_seats,seat_limit')
    .eq('organization_id', uuid.parse(organizationId))
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error('enterprise_seat_contention_summary_failed');

  const events = Array.isArray(data) ? data : [];
  const totals = {
    total: events.length,
    capacity_exhausted: events.filter((event) => event.outcome === 'capacity_exhausted').length,
    version_conflicts: events.filter((event) => event.outcome === 'version_conflict').length,
    reservations: events.filter((event) => event.outcome === 'reserved').length,
  };

  return {
    totals,
    recent: events.slice(0, 20),
    // Compatibility aliases for existing internal consumers while the UI uses
    // the stable totals/recent contract above.
    total: totals.total,
    capacityExhausted: totals.capacity_exhausted,
    versionConflicts: totals.version_conflicts,
    reservations: totals.reservations,
    latest: events.slice(0, 20),
  };
}
