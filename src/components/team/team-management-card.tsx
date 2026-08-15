import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader><CardTitle>{copy.title}</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <section aria-labelledby="team-members-title">
          <h3 id="team-members-title" className="text-sm font-medium">{copy.members}</h3>
          <div className="mt-3 space-y-2">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground" role="status">{copy.noMembers}</p>
            ) : members.map((member) => {
              const isCurrentUser = member.user_id === currentUserId;
              const canRemove = Boolean(onRemoveMember) && !isCurrentUser;
              const displayName = member.profiles?.full_name || (isCurrentUser ? copy.you : copy.member);
              return (
                <div key={member.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0"><p className="break-words text-sm font-medium">{displayName}</p><p className="text-xs text-muted-foreground">{copy.role}: {member.role}</p></div>
                  {canRemove && onRemoveMember ? <TeamActionButton message={copy.removeConfirm(displayName)} onConfirm={() => onRemoveMember(member.id)}>{copy.remove}</TeamActionButton> : null}
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="pending-invitations-title">
          <h3 id="pending-invitations-title" className="text-sm font-medium">{copy.pending}</h3>
          <div className="mt-3 space-y-2">
            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground" role="status">{copy.noPending}</p>
            ) : invitations.map((invitation) => (
              <div key={invitation.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="break-all text-sm font-medium">{invitation.email}</p><p className="text-xs text-muted-foreground">{copy.role}: {invitation.role}</p></div>
                {onCancelInvitation ? <TeamActionButton message={copy.cancelConfirm(invitation.email)} onConfirm={() => onCancelInvitation(invitation.id)}>{copy.cancel}</TeamActionButton> : null}
              </div>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
