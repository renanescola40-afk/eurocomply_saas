import { redirect } from 'next/navigation';

import { UpgradeRequiredCard } from '@/components/billing/upgrade-required-card';
import { AuthenticatedProductShell } from '@/components/dashboard/authenticated-product-shell';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { listComplianceTasks } from '@/server/queries/compliance-tasks';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

import ComplianceCalendarClient from './compliance-calendar-client';

type PageProps = { params: Promise<{ locale: string }> };

export default async function ComplianceCalendarPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) redirect(`/${locale}/onboarding`);

  const entitlements = await getOrganizationEntitlements(organization.id);
  const professionalCalendar = entitlements.licensed && ['professional', 'business', 'enterprise'].includes(entitlements.plan);
  const tasks = professionalCalendar ? await listComplianceTasks(organization.id) : [];

  const content = (
    <div className="min-h-0 bg-transparent text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        {professionalCalendar ? (
          <ComplianceCalendarClient locale={locale} plan={entitlements.plan} tasks={tasks} />
        ) : (
          <UpgradeRequiredCard
            locale={locale}
            title="Compliance calendar is available on Professional and higher plans"
            description="Use organization-scoped compliance tasks and due dates as a real operational calendar."
            requiredPlan="Professional"
          />
        )}
      </div>
    </div>
  );

  return <AuthenticatedProductShell locale={locale}>{content}</AuthenticatedProductShell>;
}
