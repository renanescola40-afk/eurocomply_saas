import { redirect } from 'next/navigation';
import { CreateOrganizationForm } from '@/components/onboarding/create-organization-form';
import { OnboardingProgressCard } from '@/components/onboarding/onboarding-progress-card';
import { createOrganization } from '@/server/actions/organizations';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (organization) {
    redirect('/dashboard/organizations');
  }

  async function createOrganizationFromOnboarding(input: { name: string; slug: string }) {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect('/login');
    }

    await createOrganization(input, currentUser.id, currentUser.email);
    redirect('/dashboard/organizations');
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
