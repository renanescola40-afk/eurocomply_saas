'use client';

import { InviteMemberForm, type InviteMemberInput } from './invite-member-form';
import { TeamManagementCard } from './team-management-card';

type TeamMember = {
  id: string;
  role: string;
  user_id?: string | null;
  created_at?: string | null;
};

type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  created_at?: string | null;
  expires_at?: string | null;
};

type TeamSettingsSectionProps = {
  members: TeamMember[];
  invitations: PendingInvitation[];
  onInvite: (input: InviteMemberInput) => Promise<void> | void;
};

export function TeamSettingsSection({ members, invitations, onInvite }: TeamSettingsSectionProps) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Team</p>
        <h2 className="text-2xl font-semibold tracking-tight">Manage access</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Invite teammates, review pending invitations, and keep access aligned with your compliance responsibilities.
        </p>
      </div>

      <InviteMemberForm onSubmit={onInvite} />
      <TeamManagementCard members={members} invitations={invitations} />
    </section>
  );
}
