import { randomUUID } from 'crypto';

import { sendEmail } from '@/lib/email/client';
import { invitationEmail } from '@/lib/email/templates';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { inviteMemberSchema, type InviteMemberInput } from '@/lib/validation/organization';
import { logAuditEvent } from '@/server/actions/audit';

const INVITE_LIMIT = 10;
const INVITE_WINDOW_MS = 60 * 60 * 1000;

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export async function inviteOrganizationMember(input: InviteMemberInput, invitedByUserId: string) {
  const payload = inviteMemberSchema.parse(input);
  const context = { area: 'member_invitation', organizationId: payload.organizationId, userId: invitedByUserId };
  const rateLimit = await checkDistributedRateLimit({
    key: `invite:${payload.organizationId}:${invitedByUserId}`,
    limit: INVITE_LIMIT,
    windowMs: INVITE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    const error = new Error('Too many invitations sent. Please try again later.');
    reportError(error, context);
    throw error;
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
    .select('*, organizations(name)')
    .single();

  if (error) {
    reportError(error, { ...context, role: payload.role });
    throw new Error(error.message);
  }

  const organizationName = data.organizations?.name ?? 'your organization';
  const inviteUrl = `${getAppUrl()}/invite/${token}`;
  const email = invitationEmail({
    organizationName,
    role: payload.role,
    inviteUrl,
  });

  try {
    await sendEmail({
      to: payload.email.toLowerCase(),
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  } catch (emailError) {
    reportError(emailError, { ...context, area: 'member_invitation_email', invitationId: data.id });
  }

  await logAuditEvent({
    organizationId: payload.organizationId,
    actorUserId: invitedByUserId,
    action: 'member.invited',
    entityType: 'invitation',
    entityId: data.id,
    metadata: { email: payload.email.toLowerCase(), role: payload.role, emailAttempted: true },
  });

  return data;
}
