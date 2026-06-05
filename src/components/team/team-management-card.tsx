import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type TeamMemberItem = {
  id: string;
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
};

export function TeamManagementCard({ members, invitations }: TeamManagementCardProps) {
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
              members.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{member.profiles?.full_name || 'Team member'}</p>
                    <p className="text-xs text-muted-foreground">Role: {member.role}</p>
                  </div>
                </div>
              ))
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
                <div key={invitation.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground">Role: {invitation.role}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
