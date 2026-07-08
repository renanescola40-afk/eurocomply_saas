import 'server-only';

import { sendEmail } from '@/lib/email/client';
import { onboardingEmail } from '@/lib/email/templates';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { createOrganizationSchema, type CreateOrganizationInput } from '@/lib/validation/organization';
import { requireCurrentUser } from '@/server/queries/auth';
import { logAuditEvent } from './audit';

const ORGANIZATION_CREATE_RATE_LIMIT = {
  limit: 3,
  windowMs: 10 * 60 * 1000,
} as const;

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function organizationActionError(message: string) {
  return new Error(message);
}

export async function createOrganization(input: CreateOrganizationInput) {
  const user = await requireCurrentUser();
  const parsed = createOrganizationSchema.safeParse(input);

  if (!parsed.success) {
    throw organizationActionError('Invalid organization input');
  }

  const payload = parsed.data;
  const rateLimit = await checkDistributedRateLimit({
    key: `organization:create:${user.id}`,
    userId: user.id,
    action: 'organization.create',
    route: 'server-action:createOrganization',
    policy: 'general-api',
    ...ORGANIZATION_CREATE_RATE_LIMIT,
  });

  if (!rateLimit.allowed) {
    throw organizationActionError('Too many organization creation attempts. Please try again later.');
  }

  const context = {
    area: 'organization_created_action',
    userId: user.id,
    organizationSlug: payload.slug,
  };

  try {
    const supabase = createAdminClient();

    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({ name: payload.name, slug: payload.slug, created_by: user.id })
      .select('*')
      .single();

    if (error) {
      reportError(error, context);
      throw organizationActionError('Unable to create organization');
    }

    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: 'owner',
      } as never);

    if (memberError) {
      reportError(memberError, { ...context, organizationId: organization.id });
      throw organizationActionError('Unable to create organization');
    }

    if (user.email) {
      const dashboardUrl = `${getAppUrl()}/dashboard/organizations`;
      const email = onboardingEmail({ organizationName: organization.name, dashboardUrl });

      try {
        await sendEmail({
          to: user.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
          template: email.template,
          organizationId: organization.id,
          userId: user.id,
          metadata: {
            source: 'organization_created_action',
            organizationSlug: payload.slug,
          },
        });
      } catch (emailError) {
        reportError(emailError, { area: 'organization_onboarding_email', organizationId: organization.id, userId: user.id });
      }
    }

    await logAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'organization.created',
      entityType: 'organization',
      entityId: organization.id,
      metadata: { slug: payload.slug, onboardingEmailAttempted: Boolean(user.email) },
    });

    return organization;
  } catch (error) {
    reportError(error, context);
    throw organizationActionError('Unable to create organization');
  }
}
