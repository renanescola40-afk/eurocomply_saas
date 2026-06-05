import { randomUUID } from 'crypto';

import { inviteMemberSchema, type InviteMemberInput } from '@/lib/validation/organization';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/server/actions/audit';

export async function inviteOrganizationMember(input: InviteMemberInput, invitedByUserId: string) {
  const payload = inviteMemberSchema.parse(input);
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
