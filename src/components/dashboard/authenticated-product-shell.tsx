import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell';
import { getBillingPlan } from '@/lib/billing/plans';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { getOrganizationBillingAuthority } from '@/server/queries/subscription';

type AuthenticatedProductShellProps = {
  locale: string;
  children: ReactNode;
};

function getPaymentRequiredPath(locale: string, selectedPlanId: string | null) {
  const selectedPlan = getBillingPlan(selectedPlanId) ?? getBillingPlan('starter');

  if (selectedPlan?.salesLed) {
    return `/${locale}/contact?intent=sales&plan=${encodeURIComponent(selectedPlan.id)}&access=required`;
  }

  const planId = selectedPlan?.id ?? 'starter';
  return `/${locale}/checkout?plan=${encodeURIComponent(planId)}&checkout=required`;
}

export async function AuthenticatedProductShell({ locale, children }: AuthenticatedProductShellProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    redirect(`/${locale}/onboarding`);
  }

  const authority = await getOrganizationBillingAuthority(organization.id);

  if (!authority.licensed) {
    redirect(getPaymentRequiredPath(locale, organization.selected_plan));
  }

  const userDisplayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.email ||
    'RISCK COMPLY user';

  return (
    <EnterpriseDashboardShell
      locale={locale}
      organizationName={organization.name}
      userDisplayName={userDisplayName}
      role={organization.role}
      selectedPlan={authority.plan}
    >
      {children}
    </EnterpriseDashboardShell>
  );
}
