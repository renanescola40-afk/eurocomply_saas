import { redirect } from 'next/navigation';
import { CreateOrganizationForm } from '@/components/onboarding/create-organization-form';
import { OnboardingProgressCard } from '@/components/onboarding/onboarding-progress-card';
import { getBillingPlan } from '@/lib/billing/plans';
import { createOrganization } from '@/server/actions/organizations';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

type OnboardingSearchParams = {
  plan?: string;
};

type OnboardingPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<OnboardingSearchParams>;
};

function getPlanQuery(planId?: string) {
  const plan = getBillingPlan(planId);
  return plan ? `?plan=${encodeURIComponent(plan.id)}` : '';
}

export default async function OnboardingPage({ params, searchParams }: OnboardingPageProps) {
  const emptySearchParams: OnboardingSearchParams = {};
  const [{ locale }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve(emptySearchParams),
  ]);
  const planQuery = getPlanQuery(resolvedSearchParams.plan);
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/onboarding${planQuery}`)}`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (organization) {
    redirect(`/${locale}/dashboard/organizations${planQuery}`);
  }

  async function createOrganizationFromOnboarding(input: { name: string; slug: string }) {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/onboarding${planQuery}`)}`);
    }

    await createOrganization(input, currentUser.id, currentUser.email);
    redirect(`/${locale}/dashboard/organizations${planQuery}`);
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-sm text-muted-foreground">Welcome to EuroComply</p>
          <h1 className="text-3xl font-semibold tracking-tight">Set up your compliance workspace</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Start by creating an organization. After that, invite your team and add your first compliance tasks, documents and vendors.
          </p>
        </div>

        <CreateOrganizationForm onCreate={createOrganizationFromOnboarding} />

        <OnboardingProgressCard
          state={{
            hasOrganization: false,
            hasMembers: false,
            hasComplianceTasks: false,
            hasDocuments: false,
            hasVendors: false,
          }}
        />
      </div>
    </main>
  );
}
