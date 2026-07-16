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

const ATOMIC_ORGANIZATION_CREATION_RPC = 'create_organization_with_owner_atomic';

type OrganizationCreationResult = {
  outcome: string;
  organization_id: string | null;
  organization_name: string | null;
  organization_slug: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function firstCreationResult(data: unknown): OrganizationCreationResult | null {
  if (Array.isArray(data)) return (data[0] as OrganizationCreationResult | undefined) ?? null;
  if (data && typeof data === 'object') return data as OrganizationCreationResult;
  return null;
}

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

    const { data, error } = await supabase.rpc(ATOMIC_ORGANIZATION_CREATION_RPC, {
      p_name: payload.name,
      p_slug: payload.slug,
      p_user_id: user.id,
    });

    if (error) {
      throw error;
    }

    const creation = firstCreationResult(data);
    if (
      !creation ||
      creation.outcome !== 'created' ||
      !creation.organization_id ||
      !creation.organization_name ||
      !creation.organization_slug
    ) {
      throw organizationActionError('Unable to create organization');
    }

    const organization = {
      id: creation.organization_id,
      name: creation.organization_name,
      slug: creation.organization_slug,
      created_by: creation.created_by,
      created_at: creation.created_at,
      updated_at: creation.updated_at,
    };

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
