import { redirect } from 'next/navigation';

import { UpgradeRequiredCard } from '@/components/billing/upgrade-required-card';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

import RaciClient from './raci-client';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function RaciPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  const entitlements = organization ? await getOrganizationEntitlements(organization.id) : null;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-6 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <DashboardCommandNavigation locale={locale} />
        {entitlements?.approvalWorkflows ? (
          <RaciClient locale={locale} />
        ) : (
          <UpgradeRequiredCard
            locale={locale}
            title="Matriz RACI disponível no Business"
            description="Coordene responsabilidades entre compliance, jurídico, financeiro e operações com governação clara por função. Esta funcionalidade é indicada para equipas em crescimento e organizações multi-país."
            requiredPlan="Business"
          />
        )}
      </div>
    </main>
  );
}
