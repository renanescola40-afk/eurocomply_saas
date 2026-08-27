import { redirect } from 'next/navigation';

import { EnterpriseAccessConsole } from '@/components/team/enterprise-access-console';
import { TeamSettingsSection } from '@/components/team/team-settings-section';
import { isWithinPlanLimit } from '@/lib/billing/entitlements';
import { getTeamWorkflowCopy } from '@/lib/i18n/team-workflow-copy';
import { roleHasPermission } from '@/lib/security/permissions';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationBillingContext } from '@/server/queries/billing';
import { listOrganizationMembers, listPendingInvitations } from '@/server/queries/members';
import { isPlanAtLeast } from '@/server/queries/subscription';

type TeamPageProps = { params: Promise<{ locale: string }> };

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const deniedCopy: Record<string, { title: string; body: string }> = {
  en: { title: 'Team access is restricted', body: 'Your organization role does not include team-management access. Ask an owner or administrator if you need member or invitation changes.' },
  pt: { title: 'O acesso à equipa é restrito', body: 'A sua função na organização não inclui gestão da equipa. Fale com um owner ou administrador se precisar de alterar membros ou convites.' },
  es: { title: 'El acceso al equipo está restringido', body: 'Tu rol en la organización no incluye gestión del equipo. Contacta con un owner o administrador si necesitas cambiar miembros o invitaciones.' },
  fr: { title: 'L’accès à l’équipe est restreint', body: 'Votre rôle dans l’organisation n’inclut pas la gestion de l’équipe. Contactez un owner ou un administrateur pour modifier les membres ou invitations.' },
  it: { title: 'L’accesso al team è limitato', body: 'Il tuo ruolo nell’organizzazione non include la gestione del team. Contatta un owner o un amministratore per modificare membri o inviti.' },
  de: { title: 'Der Teamzugriff ist eingeschränkt', body: 'Ihre Organisationsrolle umfasst keine Teamverwaltung. Wenden Sie sich an einen Owner oder Administrator, wenn Mitglieder oder Einladungen geändert werden müssen.' },
};

export default async function OrganizationTeamPage({ params }: TeamPageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) redirect(`/${locale}/onboarding`);

  const copy = getTeamWorkflowCopy(locale).page;
  const canManageTeam = roleHasPermission(organization.role, 'manage_team');

  if (!canManageTeam) {
    const denied = deniedCopy[locale] ?? deniedCopy.en;
    return (
      <main className="min-h-0 bg-transparent text-white">
        <section className="max-w-3xl rounded-xl border border-white/[0.075] bg-[#101715] p-5 md:p-6" role="status">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{copy.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-white">{denied.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{denied.body}</p>
        </section>
      </main>
    );
  }

  const [members, invitations, billing, entitlements] = await Promise.all([
    listOrganizationMembers(organization.id),
    listPendingInvitations(organization.id),
    getOrganizationBillingContext(organization.id),
    getOrganizationEntitlements(organization.id),
  ]);
  const withinSeatCapacity = isWithinPlanLimit(billing.plan, 'users', billing.usage.users);
  const canInviteMembers = entitlements.employeeInvites && withinSeatCapacity;
  const inviteBlockReason = !entitlements.employeeInvites ? 'plan' as const : !withinSeatCapacity ? 'capacity' as const : null;
  const canInviteAdmin = isPlanAtLeast(entitlements.plan, 'enterprise');

  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="border-b border-white/[0.065] pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{copy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">{copy.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">{copy.body}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/46">
            {copy.badges.map((badge) => <span key={badge} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1">{badge}</span>)}
          </div>
        </header>

        <div className="space-y-6">
          <TeamSettingsSection
            locale={locale}
            members={members}
            invitations={invitations}
            currentUserId={user.id}
            canManageTeam
            canInviteMembers={canInviteMembers}
            canInviteAdmin={canInviteAdmin}
            inviteBlockReason={inviteBlockReason}
          />
          <EnterpriseAccessConsole />
        </div>
      </div>
    </main>
  );
}
