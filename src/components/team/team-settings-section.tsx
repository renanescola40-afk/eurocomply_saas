'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import { STEP_UP_TOKEN_HEADER, StepUpMfaDialog } from '@/components/security/step-up-mfa-dialog';
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

type PendingTeamOperation =
  | {
      type: 'invite';
      payload: { email: string; role: string };
      resolve: () => void;
      reject: (error: Error) => void;
    }
  | {
      type: 'remove-member';
      payload: { memberId: string };
      resolve: () => void;
      reject: (error: Error) => void;
    }
  | {
      type: 'cancel-invitation';
      payload: { invitationId: string };
      resolve: () => void;
      reject: (error: Error) => void;
    };

type TeamSettingsSectionProps = {
  members: TeamMember[];
  invitations: PendingInvitation[];
  currentUserId?: string;
};

async function parseError(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  return body.message ?? body.error ?? 'Team action failed.';
}

function toApiInviteRole(role: InviteMemberInput['role']) {
  return role === 'admin' ? 'Admin' : 'Visualizador';
}

function teamActionRequest(operation: PendingTeamOperation, token: string) {
  const headers = {
    'Content-Type': 'application/json',
    [STEP_UP_TOKEN_HEADER]: token,
  };

  if (operation.type === 'invite') {
    return fetch('/api/team/invites', {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify(operation.payload),
    });
  }

  if (operation.type === 'remove-member') {
    return fetch('/api/team/members/remove', {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify(operation.payload),
    });
  }

  return fetch('/api/team/invitations/cancel', {
    method: 'POST',
    headers,
    credentials: 'same-origin',
    body: JSON.stringify(operation.payload),
  });
}

export function TeamSettingsSection({ members, invitations, currentUserId }: TeamSettingsSectionProps) {
  const router = useRouter();
  const [pendingOperation, setPendingOperation] = useState<PendingTeamOperation | null>(null);

  const enqueueInvite = useCallback((payload: { email: string; role: string }) => {
    return new Promise<void>((resolve, reject) => {
      setPendingOperation({ type: 'invite', payload, resolve, reject });
    });
  }, []);

  const enqueueRemoveMember = useCallback((payload: { memberId: string }) => {
    return new Promise<void>((resolve, reject) => {
      setPendingOperation({ type: 'remove-member', payload, resolve, reject });
    });
  }, []);

  const enqueueCancelInvitation = useCallback((payload: { invitationId: string }) => {
    return new Promise<void>((resolve, reject) => {
      setPendingOperation({ type: 'cancel-invitation', payload, resolve, reject });
    });
  }, []);

  const handleInvite = useCallback(
    (input: InviteMemberInput) =>
      enqueueInvite({
        email: input.email,
        role: toApiInviteRole(input.role),
      }),
    [enqueueInvite],
  );

  const handleRemoveMember = useCallback(
    (memberId: string) => enqueueRemoveMember({ memberId }),
    [enqueueRemoveMember],
  );

  const handleCancelInvitation = useCallback(
    (invitationId: string) => enqueueCancelInvitation({ invitationId }),
    [enqueueCancelInvitation],
  );

  const handleStepUpToken = useCallback(
    async (token: string) => {
      const operation = pendingOperation;
      if (!operation) return;

      try {
        const response = await teamActionRequest(operation, token);

        if (!response.ok) {
          throw new Error(await parseError(response));
        }

        operation.resolve();
        setPendingOperation(null);
        router.refresh();
      } catch (error) {
        operation.reject(error instanceof Error ? error : new Error('Team action failed.'));
        setPendingOperation(null);
      }
    },
    [pendingOperation, router],
  );

  const handleStepUpCancel = useCallback(() => {
    if (pendingOperation) {
      pendingOperation.reject(new Error('Security verification was cancelled.'));
      setPendingOperation(null);
    }
  }, [pendingOperation]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Team</p>
        <h2 className="text-2xl font-semibold tracking-tight">Manage access</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Invite teammates, review pending invitations, and keep access aligned with your compliance responsibilities.
        </p>
      </div>

      <InviteMemberForm onSubmit={handleInvite} />
      <TeamManagementCard
        members={members}
        invitations={invitations}
        currentUserId={currentUserId}
        onRemoveMember={handleRemoveMember}
        onCancelInvitation={handleCancelInvitation}
      />
      <StepUpMfaDialog
        action="manage_team"
        open={Boolean(pendingOperation)}
        title="Verify team management"
        description="Team invitations and access changes require MFA or enterprise identity verification."
        onCancel={handleStepUpCancel}
        onToken={handleStepUpToken}
      />
    </section>
  );
}
