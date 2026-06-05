import { redirect } from 'next/navigation';

import { PlanGate } from '@/components/billing/plan-gate';
import { TeamSettingsSection } from '@/components/team/team-settings-section';
import { inviteOrganizationMember } from '@/server/actions/members';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationBillingContext } from '@/server/queries/billing';
import { listOrganizationMembers, listPendingInvitations } from '@/server/queries/members';

type TeamPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function OrganizationTeamPage({ params }: TeamPageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);

  if (!organization) {
    redirect(`/${locale}/onboarding`);
  }

  const [members, invitations, billing] = await Promise.all([
    listOrganizationMembers(organization.id),
    listPendingInvitations(organization.id),
    getOrganizationBillingContext(organization.id),
  ]);

  async function inviteMember(input: { email: string; role: 'admin' | 'compliance_manager' | 'member' | 'viewer' }) {
    'use server';

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(`/${locale}/login`);
    }

    await inviteOrganizationMember(
      {
        organizationId: organization.id,
        email: input.email,
        role: input.role,
      },
      currentUser.id,
    );

    redirect(`/${locale}/dashboard/organizations/team`);
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <PlanGate planId={billing.plan} metric="users" currentUsage={billing.usage.users}>
          <TeamSettingsSection members={members} invitations={invitations} onInvite={inviteMember} />
        </PlanGate>
      </div>
    </main>
  );
}
