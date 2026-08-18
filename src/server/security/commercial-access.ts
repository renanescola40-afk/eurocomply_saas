import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import {
  getOrganizationBillingAuthority,
  type OrganizationBillingAuthority,
} from '@/server/queries/subscription';

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
type CurrentOrganization = NonNullable<Awaited<ReturnType<typeof getCurrentOrganizationForUser>>>;

export type LicensedCommercialAccess = {
  status: 'licensed';
  user: CurrentUser;
  organization: CurrentOrganization;
  authority: OrganizationBillingAuthority & { licensed: true };
};

export type CommercialAccessResolution =
  | LicensedCommercialAccess
  | { status: 'authentication_required' }
  | { status: 'organization_required'; user: CurrentUser }
  | {
      status: 'subscription_required';
      user: CurrentUser;
      organization: CurrentOrganization;
      authority: OrganizationBillingAuthority;
    }
  | { status: 'commercial_authority_unavailable' };

export const resolveCommercialProductAccess = cache(async (): Promise<CommercialAccessResolution> => {
  try {
    const user = await getCurrentUser();
    if (!user) return { status: 'authentication_required' };

    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization?.id) return { status: 'organization_required', user };

    const authority = await getOrganizationBillingAuthority(organization.id);
    if (!authority.licensed) {
      return {
        status: 'subscription_required',
        user,
        organization,
        authority,
      };
    }

    return {
      status: 'licensed',
      user,
      organization,
      authority: authority as OrganizationBillingAuthority & { licensed: true },
    };
  } catch {
    console.warn('[commercial-access] authority_resolution_failed');
    return { status: 'commercial_authority_unavailable' };
  }
});

export async function requireLicensedCommercialPageAccess(input: {
  locale: string;
  pathname: string;
}): Promise<LicensedCommercialAccess> {
  const access = await resolveCommercialProductAccess();
  if (access.status === 'licensed') return access;

  const safeNext = input.pathname || `/${input.locale}/dashboard/organizations`;

  if (access.status === 'authentication_required') {
    redirect(`/${input.locale}/login?next=${encodeURIComponent(safeNext)}`);
  }

  if (access.status === 'organization_required') {
    redirect(`/${input.locale}/onboarding`);
  }

  if (access.status === 'subscription_required') {
    redirect(`/${input.locale}/pricing?billing=subscription_required`);
  }

  redirect(`/${input.locale}/pricing?billing=billing_authority_unavailable`);
}
