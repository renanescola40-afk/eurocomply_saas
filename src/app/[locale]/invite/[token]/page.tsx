import { AcceptInvitationCard } from '@/components/team/accept-invitation-card';
import { canAcceptInvitation, getInvitationByToken } from '@/server/queries/invitations';

interface AcceptInvitationPageProps {
  params: {
    token: string;
  };
}

export default async function AcceptInvitationPage({ params }: AcceptInvitationPageProps) {
  const invitation = await getInvitationByToken(params.token);
  const canAccept = canAcceptInvitation(invitation);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="w-full max-w-lg">
        <AcceptInvitationCard
          email={invitation?.email ?? 'Unknown invitee'}
          organizationName={invitation?.organizations?.name ?? 'EuroComply workspace'}
          disabled={!canAccept}
          onAccept={async () => {
            'use server';
          }}
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
