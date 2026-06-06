import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamActionButton } from './team-action-button';

export type TeamMemberItem = {
  id: string;
  user_id?: string | null;
  role: string;
  created_at?: string | null;
  profiles?: {
    full_name?: string | null;
  } | null;
};

export type PendingInvitationItem = {
  id: string;
  email: string;
  role: string;
  expires_at?: string | null;
};

type TeamManagementCardProps = {
  members: TeamMemberItem[];
  invitations: PendingInvitationItem[];
  currentUserId?: string;
  onRemoveMember?: (formData: FormData) => Promise<void> | void;
  onCancelInvitation?: (formData: FormData) => Promise<void> | void;
};

export function TeamManagementCard({ members, invitations, currentUserId, onRemoveMember, onCancelInvitation }: TeamManagementCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section>
          <h3 className="text-sm font-medium">Members</h3>
          <div className="mt-3 space-y-2">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team members found.</p>
            ) : (
              members.map((member) => {
                const isCurrentUser = member.user_id === currentUserId;
                const canRemove = Boolean(onRemoveMember) && !isCurrentUser;
                const displayName = member.profiles?.full_name || (isCurrentUser ? 'You' : 'Team member');

                return (
                  <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{displayName}</p>
                      <p className="text-xs text-muted-foreground">Role: {member.role}</p>
                    </div>
                    {canRemove && (
                      <form action={onRemoveMember}>
                        <input type="hidden" name="memberId" value={member.id} />
                        <TeamActionButton message={`Remove ${displayName} from this organization?`}>
                          Remove
                        </TeamActionButton>
                      </form>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium">Pending invitations</h3>
          <div className="mt-3 space-y-2">
            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invitations.</p>
            ) : (
              invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground">Role: {invitation.role}</p>
                  </div>
                  {onCancelInvitation && (
                    <form action={onCancelInvitation}>
                      <input type="hidden" name="invitationId" value={invitation.id} />
                      <TeamActionButton message={`Cancel the invitation for ${invitation.email}?`}>
                        Cancel
                      </TeamActionButton>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
