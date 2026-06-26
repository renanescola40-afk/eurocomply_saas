import { sendEmail } from '@/lib/email/client';
import { onboardingEmail } from '@/lib/email/templates';
import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { createOrganizationSchema, type CreateOrganizationInput } from '@/lib/validation/organization';
import { logAuditEvent } from './audit';

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getOrganizationOwnerInsert(userId: string) {
  if (isUuid(userId)) {
    return {
      created_by: userId,
      created_by_clerk_user_id: null,
    };
  }

  return {
    created_by: null,
    created_by_clerk_user_id: userId,
  };
}

export async function createOrganization(input: CreateOrganizationInput, userId: string, userEmail?: string | null) {
  const payload = createOrganizationSchema.parse(input);
  const supabase = createAdminClient();
  const ownerInsert = getOrganizationOwnerInsert(userId);

  const { data: organization, error } = await supabase
    .from('organizations')
    .insert({ name: payload.name, slug: payload.slug, ...ownerInsert })
    .select('*')
    .single();

  if (error) throw error;

  const memberInsert = isUuid(userId)
    ? {
        organization_id: organization.id,
        user_id: userId,
        clerk_user_id: null,
        role: 'owner',
      }
    : {
        organization_id: organization.id,
        user_id: null,
        clerk_user_id: userId,
        role: 'owner',
      };

  const { error: memberError } = await supabase
    .from('organization_members')
    .insert(memberInsert as never);

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
        template: email.template,
        organizationId: organization.id,
        userId,
        metadata: {
          source: 'organization_created_action',
          organizationSlug: payload.slug,
        },
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
