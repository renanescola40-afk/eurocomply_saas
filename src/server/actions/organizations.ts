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

function organizationActionError(message: string) {
  return new Error(message);
}

export async function createOrganization(input: CreateOrganizationInput, _legacyUserId?: string, _legacyEmail?: string | null) {
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
    const ownerInsert = getOrganizationOwnerInsert(user.id);

    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({ name: payload.name, slug: payload.slug, ...ownerInsert })
      .select('*')
      .single();

    if (error) throw error;

    const memberInsert = isUuid(user.id)
      ? {
          organization_id: organization.id,
          user_id: user.id,
          clerk_user_id: null,
          role: 'owner',
        }
      : {
          organization_id: organization.id,
          user_id: null,
          clerk_user_id: user.id,
          role: 'owner',
        };

    const { error: memberError } = await supabase
      .from('organization_members')
      .insert(memberInsert as never);

    if (memberError) throw memberError;

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
