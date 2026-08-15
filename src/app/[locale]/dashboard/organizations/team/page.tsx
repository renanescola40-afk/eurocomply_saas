import { redirect } from 'next/navigation';

import { PlanGate } from '@/components/billing/plan-gate';
import { EnterpriseAccessConsole } from '@/components/team/enterprise-access-console';
import { TeamSettingsSection } from '@/components/team/team-settings-section';
import { getTeamWorkflowCopy } from '@/lib/i18n/team-workflow-copy';
import { roleHasPermission } from '@/lib/security/permissions';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationBillingContext } from '@/server/queries/billing';
import { listOrganizationMembers, listPendingInvitations } from '@/server/queries/members';

type TeamPageProps = { params: Promise<{ locale: string }> };

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function OrganizationTeamPage({ params }: TeamPageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) redirect(`/${locale}/onboarding`);

  const copy = getTeamWorkflowCopy(locale).page;
  const canManageTeam = roleHasPermission(organization.role, 'manage_team');
  const [members, invitations, billing] = await Promise.all([
    listOrganizationMembers(organization.id),
    listPendingInvitations(organization.id),
    getOrganizationBillingContext(organization.id),
  ]);

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.16),_transparent_34rem),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_30rem),linear-gradient(180deg,#050505_0%,#080b12_46%,#050505_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-20" />
      <div className="relative mx-auto max-w-7xl space-y-10">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">{copy.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">{copy.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60 md:text-base">{copy.body}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/55">
            {copy.badges.map((badge) => <span key={badge} className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5">{badge}</span>)}
          </div>
        </header>

        <PlanGate planId={billing.plan} metric="users" currentUsage={billing.usage.users}>
          <div className="space-y-10">
            <TeamSettingsSection locale={locale} members={members} invitations={invitations} currentUserId={user.id} canManageTeam={canManageTeam} />
            {canManageTeam ? <EnterpriseAccessConsole /> : null}
          </div>
        </PlanGate>
      </div>
    </main>
  );
}
