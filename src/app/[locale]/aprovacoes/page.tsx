import { redirect } from 'next/navigation';

import { UpgradeRequiredCard } from '@/components/billing/upgrade-required-card';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { listDocuments } from '@/server/queries/documents';

import ApprovalsClient from './approvals-client';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ApprovalsPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  const documents = organization ? await listDocuments(organization.id) : [];
  const entitlements = organization ? await getOrganizationEntitlements(organization.id) : null;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-6 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <DashboardCommandNavigation locale={locale} />
        {entitlements?.approvalWorkflows ? (
          <ApprovalsClient locale={locale} initialDocuments={documents} />
        ) : (
          <UpgradeRequiredCard
            locale={locale}
            title="Workflows de aprovação disponíveis no Business"
            description="Aprovações estruturadas, responsabilidades claras e evidências prontas para fiscalização são recursos pensados para equipas com operação real de compliance."
            requiredPlan="Business"
          />
        )}
      </div>
    </main>
  );
}
