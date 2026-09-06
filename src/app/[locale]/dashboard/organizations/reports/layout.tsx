import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { assertPlanAtLeast } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

export default async function ExecutiveReportsLayout({
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

  const planCheck = await assertPlanAtLeast(organization.id, 'business');
  if (!planCheck.ok) {
    redirect(`/${params.locale}/dashboard/organizations/billing?upgrade=business&feature=executive-reports`);
  }

  return children;
}
