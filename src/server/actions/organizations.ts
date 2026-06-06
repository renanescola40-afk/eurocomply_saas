import { sendEmail } from '@/lib/email/client';
import { onboardingEmail } from '@/lib/email/templates';
import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { createOrganizationSchema, type CreateOrganizationInput } from '@/lib/validation/organization';
import { logAuditEvent } from './audit';

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export async function createOrganization(input: CreateOrganizationInput, userId: string, userEmail?: string | null) {
  const payload = createOrganizationSchema.parse(input);
  const supabase = createAdminClient();

  const { data: organization, error } = await supabase
    .from('organizations')
    .insert({ name: payload.name, slug: payload.slug, created_by: userId })
    .select('*')
    .single();

  if (error) throw error;

  const { error: memberError } = await supabase.from('organization_members').insert({
    organization_id: organization.id,
    user_id: userId,
    role: 'owner',
  });

  if (memberError) throw memberError;

  if (userEmail) {
    const dashboardUrl = `${getAppUrl()}/dashboard/organizations`;
    const email = onboardingEmail({ organizationName: organization.name, dashboardUrl });

    try {
      await sendEmail({
        to: userEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
    } catch (emailError) {
      reportError(emailError, { area: 'organization_onboarding_email', organizationId: organization.id, userId });
    }
  }

  await logAuditEvent({
    organizationId: organization.id,
    actorUserId: userId,
    action: 'organization.created',
    entityType: 'organization',
    entityId: organization.id,
    metadata: { slug: payload.slug, onboardingEmailAttempted: Boolean(userEmail) },
  });

  return organization;
}
