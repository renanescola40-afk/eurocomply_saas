import { randomUUID } from 'crypto';

import { inviteMemberSchema, type InviteMemberInput } from '@/lib/validation/organization';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';

const INVITE_LIMIT = 10;
const INVITE_WINDOW_MS = 60 * 60 * 1000;

export async function inviteOrganizationMember(input: InviteMemberInput, invitedByUserId: string) {
  const payload = inviteMemberSchema.parse(input);
  const rateLimit = checkRateLimit({
    key: `invite:${payload.organizationId}:${invitedByUserId}`,
    limit: INVITE_LIMIT,
    windowMs: INVITE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    throw new Error('Too many invitations sent. Please try again later.');
  }

  const supabase = createAdminClient();
  const token = randomUUID();

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      organization_id: payload.organizationId,
      email: payload.email.toLowerCase(),
      role: payload.role,
      token,
      invited_by: invitedByUserId,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logAuditEvent({
    organizationId: payload.organizationId,
    actorUserId: invitedByUserId,
    action: 'member.invited',
    entityType: 'invitation',
    entityId: data.id,
    metadata: { email: payload.email.toLowerCase(), role: payload.role },
  });

  return data;
}
