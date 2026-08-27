import { getTeamWorkflowCopy } from '@/lib/i18n/team-workflow-copy';
import { TeamActionButton } from './team-action-button';

export type TeamMemberItem = {
  id: string;
  user_id?: string | null;
  role: string;
  created_at?: string | null;
  profiles?: { full_name?: string | null } | null;
};

export type PendingInvitationItem = {
  id: string;
  email: string;
  role: string;
  expires_at?: string | null;
};

type TeamManagementCardProps = {
  locale: string;
  members: TeamMemberItem[];
  invitations: PendingInvitationItem[];
  currentUserId?: string;
  onRemoveMember?: (memberId: string) => Promise<void> | void;
  onCancelInvitation?: (invitationId: string) => Promise<void> | void;
};

export function TeamManagementCard({ locale, members, invitations, currentUserId, onRemoveMember, onCancelInvitation }: TeamManagementCardProps) {
  const copy = getTeamWorkflowCopy(locale).access;

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]" aria-labelledby="team-access-title">
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
        <h2 id="team-access-title" className="text-sm font-semibold text-white/88">{copy.title}</h2>
        <span className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-xs font-semibold text-white/45">{members.length} + {invitations.length}</span>
      </div>

      <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-white/[0.055]">
        <section aria-labelledby="team-members-title" className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 id="team-members-title" className="text-xs font-semibold uppercase tracking-[0.13em] text-white/40">{copy.members}</h3>
            <span className="text-xs text-white/28">{members.length}</span>
          </div>
          <div className="mt-3 divide-y divide-white/[0.055]">
            {members.length === 0 ? (
              <p className="py-4 text-sm text-white/40" role="status">{copy.noMembers}</p>
            ) : members.map((member) => {
              const isCurrentUser = member.user_id === currentUserId;
              const canRemove = Boolean(onRemoveMember) && !isCurrentUser;
              const displayName = member.profiles?.full_name || (isCurrentUser ? copy.you : copy.member);
              return (
                <div key={member.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-white/82">{displayName}</p>
                    <p className="mt-0.5 text-xs text-white/36">{copy.role}: {member.role}</p>
                  </div>
                  {canRemove && onRemoveMember ? <TeamActionButton message={copy.removeConfirm(displayName)} onConfirm={() => onRemoveMember(member.id)}>{copy.remove}</TeamActionButton> : null}
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="pending-invitations-title" className="border-t border-white/[0.055] p-5 lg:border-t-0">
          <div className="flex items-center justify-between gap-3">
            <h3 id="pending-invitations-title" className="text-xs font-semibold uppercase tracking-[0.13em] text-white/40">{copy.pending}</h3>
            <span className="text-xs text-white/28">{invitations.length}</span>
          </div>
          <div className="mt-3 divide-y divide-white/[0.055]">
            {invitations.length === 0 ? (
              <p className="py-4 text-sm text-white/40" role="status">{copy.noPending}</p>
            ) : invitations.map((invitation) => (
              <div key={invitation.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-all text-sm font-medium text-white/82">{invitation.email}</p>
                  <p className="mt-0.5 text-xs text-white/36">{copy.role}: {invitation.role}</p>
                </div>
                {onCancelInvitation ? <TeamActionButton message={copy.cancelConfirm(invitation.email)} onConfirm={() => onCancelInvitation(invitation.id)}>{copy.cancel}</TeamActionButton> : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
