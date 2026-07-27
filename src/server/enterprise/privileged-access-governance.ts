import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';

const uuidSchema = z.string().uuid();
const requestSchema = z.object({
  organizationId: z.string().uuid(),
  requesterUserId: z.string().uuid(),
  targetMembershipId: z.string().uuid(),
  requestedRole: z.enum(['admin', 'owner']),
  justification: z.string().trim().min(12).max(1000),
  durationMinutes: z.number().int().min(15).max(1440),
});

export async function createPrivilegedAccessRequest(input: z.input<typeof requestSchema>) {
  const parsed = requestSchema.parse(input);
  const db = createAdminClient();
  const expiresAt = new Date(Date.now() + parsed.durationMinutes * 60_000).toISOString();
  const { data, error } = await db
    .from('enterprise_privileged_access_requests')
    .insert({
      organization_id: parsed.organizationId,
      requester_user_id: parsed.requesterUserId,
      target_membership_id: parsed.targetMembershipId,
      requested_role: parsed.requestedRole,
      justification: parsed.justification,
      expires_at: expiresAt,
    })
    .select('id,organization_id,status,requested_role,expires_at,required_approvals,approval_count')
    .single();
  if (error || !data) throw new Error('privileged_access_request_create_failed');
  await db.from('enterprise_privileged_access_events').insert({
    organization_id: parsed.organizationId,
    request_id: data.id,
    actor_user_id: parsed.requesterUserId,
    event_type: 'requested',
  });
  return data;
}

export async function decidePrivilegedAccessRequest(input: {
  organizationId: string;
  requestId: string;
  approverUserId: string;
  decision: 'approved' | 'rejected';
  reason: string;
}) {
  const organizationId = uuidSchema.parse(input.organizationId);
  const requestId = uuidSchema.parse(input.requestId);
  const approverUserId = uuidSchema.parse(input.approverUserId);
  const reason = z.string().trim().min(8).max(500).parse(input.reason);
  const db = createAdminClient();
  const { data: request, error } = await db
    .from('enterprise_privileged_access_requests')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', requestId)
    .maybeSingle();
  if (error) throw new Error('privileged_access_request_lookup_failed');
  if (!request) return { outcome: 'not_found' as const };
  if (request.status !== 'pending') return { outcome: 'invalid_state' as const };
  if (request.requester_user_id === approverUserId) return { outcome: 'separation_of_duties' as const };

  const approval = await db.from('enterprise_privileged_access_approvals').insert({
    organization_id: organizationId,
    request_id: requestId,
    approver_user_id: approverUserId,
    decision: input.decision,
    reason,
  });
  if (approval.error) throw new Error('privileged_access_approval_failed');

  if (input.decision === 'rejected') {
    await db.from('enterprise_privileged_access_requests').update({ status: 'rejected', completed_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', requestId);
  } else {
    const nextCount = Number(request.approval_count ?? 0) + 1;
    await db.from('enterprise_privileged_access_requests').update({
      approval_count: nextCount,
      status: nextCount >= Number(request.required_approvals) ? 'approved' : 'pending',
    }).eq('organization_id', organizationId).eq('id', requestId);
  }

  await db.from('enterprise_privileged_access_events').insert({
    organization_id: organizationId,
    request_id: requestId,
    actor_user_id: approverUserId,
    event_type: input.decision,
    reason_code: input.decision,
  });
  return { outcome: input.decision as 'approved' | 'rejected' };
}

export async function expirePrivilegedAccess(limit = 100) {
  const bounded = Math.min(Math.max(limit, 1), 500);
  const { data, error } = await createAdminClient().rpc('expire_enterprise_privileged_access', { p_limit: bounded });
  if (error) throw new Error('privileged_access_expiry_failed');
  return { expired: Array.isArray(data) ? data : [] };
}