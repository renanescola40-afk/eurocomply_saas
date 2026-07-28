import { createHash } from 'node:crypto';

import { createAdminClient } from '@/lib/supabase/admin';

export type BreakGlassDecision = 'approved' | 'rejected';

function hashEvent(input: unknown) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export async function createBreakGlassRequest(input: {
  organizationId: string;
  requesterUserId: string;
  targetMembershipId: string;
  requestedRole: 'admin' | 'owner';
  incidentReference: string;
  justification: string;
  requestedMinutes: number;
}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from('enterprise_break_glass_requests')
    .insert({
      organization_id: input.organizationId,
      requester_user_id: input.requesterUserId,
      target_membership_id: input.targetMembershipId,
      requested_role: input.requestedRole,
      incident_reference: input.incidentReference,
      justification: input.justification,
      requested_minutes: input.requestedMinutes,
    })
    .select('*')
    .single();
  if (error) throw error;

  await appendBreakGlassEvent({
    organizationId: input.organizationId,
    requestId: data.id,
    actorUserId: input.requesterUserId,
    eventType: 'requested',
    evidence: { requestedRole: input.requestedRole, requestedMinutes: input.requestedMinutes },
  });
  return data;
}

export async function decideBreakGlassRequest(input: {
  organizationId: string;
  requestId: string;
  approverUserId: string;
  decision: BreakGlassDecision;
  rationale: string;
}) {
  const db = createAdminClient();
  const { data: request, error: lookupError } = await db
    .from('enterprise_break_glass_requests')
    .select('*')
    .eq('organization_id', input.organizationId)
    .eq('id', input.requestId)
    .single();
  if (lookupError) throw lookupError;
  if (request.requester_user_id === input.approverUserId) throw new Error('break_glass_self_approval_forbidden');
  if (request.status !== 'pending') throw new Error('break_glass_request_not_pending');

  const { error: approvalError } = await db.from('enterprise_break_glass_approvals').insert({
    organization_id: input.organizationId,
    request_id: input.requestId,
    approver_user_id: input.approverUserId,
    decision: input.decision,
    rationale: input.rationale,
  });
  if (approvalError) throw approvalError;

  const { count } = await db
    .from('enterprise_break_glass_approvals')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', input.requestId)
    .eq('decision', 'approved');

  const nextStatus = input.decision === 'rejected'
    ? 'rejected'
    : (count ?? 0) >= request.approvals_required ? 'approved' : 'pending';

  const { data, error } = await db
    .from('enterprise_break_glass_requests')
    .update({ approvals_received: count ?? 0, status: nextStatus, updated_at: new Date().toISOString() })
    .eq('organization_id', input.organizationId)
    .eq('id', input.requestId)
    .select('*')
    .single();
  if (error) throw error;

  await appendBreakGlassEvent({
    organizationId: input.organizationId,
    requestId: input.requestId,
    actorUserId: input.approverUserId,
    eventType: input.decision,
    evidence: { rationale: input.rationale, approvalsReceived: count ?? 0 },
  });
  return data;
}

export async function revokeBreakGlassRequest(input: {
  organizationId: string;
  requestId: string;
  actorUserId: string;
  reason: string;
}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from('enterprise_break_glass_requests')
    .update({ status: 'review_required', revoked_at: new Date().toISOString(), review_due_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), updated_at: new Date().toISOString() })
    .eq('organization_id', input.organizationId)
    .eq('id', input.requestId)
    .in('status', ['approved', 'active'])
    .select('*')
    .single();
  if (error) throw error;
  await appendBreakGlassEvent({ organizationId: input.organizationId, requestId: input.requestId, actorUserId: input.actorUserId, eventType: 'revoked', evidence: { reason: input.reason } });
  return data;
}

export async function expireBreakGlassRequests(limit = 100) {
  const { data, error } = await createAdminClient().rpc('expire_enterprise_break_glass_requests', { p_limit: limit });
  if (error) throw error;
  return data ?? [];
}

async function appendBreakGlassEvent(input: {
  organizationId: string;
  requestId: string;
  actorUserId: string | null;
  eventType: string;
  evidence: Record<string, unknown>;
}) {
  const db = createAdminClient();
  const { data: previous } = await db
    .from('enterprise_break_glass_events')
    .select('event_hash')
    .eq('organization_id', input.organizationId)
    .eq('request_id', input.requestId)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  const eventHash = hashEvent({ ...input, previousEventHash: previous?.event_hash ?? null });
  const { error } = await db.from('enterprise_break_glass_events').insert({
    organization_id: input.organizationId,
    request_id: input.requestId,
    actor_user_id: input.actorUserId,
    event_type: input.eventType,
    evidence: input.evidence,
    previous_event_hash: previous?.event_hash ?? null,
    event_hash: eventHash,
  });
  if (error) throw error;
}
