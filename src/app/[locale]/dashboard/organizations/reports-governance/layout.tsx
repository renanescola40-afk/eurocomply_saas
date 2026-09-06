import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

export default async function ReportsGovernanceCommercialLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${params.locale}/login`);

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) redirect(`/${params.locale}/onboarding`);

  const entitlements = await getOrganizationEntitlements(organization.id);
  if (!entitlements.licensed) {
    redirect(`/${params.locale}/dashboard/organizations/billing?upgrade=required&feature=reports-governance`);
  }

  return children;
}
