import { redirect } from 'next/navigation';
import { AcceptInvitationCard } from '@/components/team/accept-invitation-card';
import { acceptInvitation } from '@/server/actions/invitations';
import { getCurrentUser } from '@/server/queries/auth';
import { canAcceptInvitation, getInvitationByToken } from '@/server/queries/invitations';

interface AcceptInvitationPageProps {
  params: {
    token: string;
  };
}

export default async function AcceptInvitationPage({ params }: AcceptInvitationPageProps) {
  const invitation = await getInvitationByToken(params.token);
  const canAccept = canAcceptInvitation(invitation);
  const user = await getCurrentUser();
  const organization = Array.isArray(invitation?.organizations)
    ? invitation?.organizations[0]
    : invitation?.organizations;
  const organizationName = organization?.name ?? 'EuroComply organization';

  async function acceptCurrentInvitation() {
    'use server';

    await acceptInvitation({ token: params.token });
    redirect('/dashboard/organizations');
  }

  if (!user && canAccept) {
    redirect(`/login?redirectedFrom=/invite/${params.token}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="w-full max-w-lg">
        <AcceptInvitationCard
          email={invitation?.email ?? 'Unknown invitee'}
          organizationName={organizationName}
          disabled={!canAccept}
          onAccept={acceptCurrentInvitation}
        />
        {!canAccept && (
          <p className="mt-4 text-center text-sm text-slate-400">
            This invitation is no longer available. It may have expired or already been accepted.
          </p>
        )}
      </div>
    </main>
  );
}
