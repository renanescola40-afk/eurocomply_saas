'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import { STEP_UP_TOKEN_HEADER, StepUpMfaDialog } from '@/components/security/step-up-mfa-dialog';
import { getTeamWorkflowCopy } from '@/lib/i18n/team-workflow-copy';
import { InviteMemberForm, type InviteMemberInput } from './invite-member-form';
import { TeamManagementCard } from './team-management-card';

type TeamMember = { id: string; role: string; user_id?: string | null; created_at?: string | null };
type PendingInvitation = { id: string; email: string; role: string; created_at?: string | null; expires_at?: string | null };

type PendingTeamOperation =
  | { type: 'invite'; payload: { email: string; role: string; locale: string }; resolve: () => void; reject: (error: Error) => void }
  | { type: 'remove-member'; payload: { memberId: string }; resolve: () => void; reject: (error: Error) => void }
  | { type: 'cancel-invitation'; payload: { invitationId: string }; resolve: () => void; reject: (error: Error) => void };

type TeamSettingsSectionProps = {
  locale: string;
  members: TeamMember[];
  invitations: PendingInvitation[];
  currentUserId?: string;
};

async function parseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  return body.message ?? body.error ?? fallback;
}

function toApiInviteRole(role: InviteMemberInput['role']) {
  return role === 'admin' ? 'Admin' : 'Visualizador';
}

function teamActionRequest(operation: PendingTeamOperation, token: string) {
  const headers = { 'Content-Type': 'application/json', [STEP_UP_TOKEN_HEADER]: token };
  if (operation.type === 'invite') return fetch('/api/team/invites', { method: 'POST', headers, credentials: 'same-origin', body: JSON.stringify(operation.payload) });
  if (operation.type === 'remove-member') return fetch('/api/team/members/remove', { method: 'POST', headers, credentials: 'same-origin', body: JSON.stringify(operation.payload) });
  return fetch('/api/team/invitations/cancel', { method: 'POST', headers, credentials: 'same-origin', body: JSON.stringify(operation.payload) });
}

export function TeamSettingsSection({ locale, members, invitations, currentUserId }: TeamSettingsSectionProps) {
  const router = useRouter();
  const copy = getTeamWorkflowCopy(locale);
  const [pendingOperation, setPendingOperation] = useState<PendingTeamOperation | null>(null);

  const enqueueInvite = useCallback((payload: { email: string; role: string; locale: string }) => new Promise<void>((resolve, reject) => setPendingOperation({ type: 'invite', payload, resolve, reject })), []);
  const enqueueRemoveMember = useCallback((payload: { memberId: string }) => new Promise<void>((resolve, reject) => setPendingOperation({ type: 'remove-member', payload, resolve, reject })), []);
  const enqueueCancelInvitation = useCallback((payload: { invitationId: string }) => new Promise<void>((resolve, reject) => setPendingOperation({ type: 'cancel-invitation', payload, resolve, reject })), []);

  const handleInvite = useCallback((input: InviteMemberInput) => enqueueInvite({ email: input.email, role: toApiInviteRole(input.role), locale }), [enqueueInvite, locale]);
  const handleRemoveMember = useCallback((memberId: string) => enqueueRemoveMember({ memberId }), [enqueueRemoveMember]);
  const handleCancelInvitation = useCallback((invitationId: string) => enqueueCancelInvitation({ invitationId }), [enqueueCancelInvitation]);

  const handleStepUpToken = useCallback(async (token: string) => {
    const operation = pendingOperation;
    if (!operation) return;
    try {
      const response = await teamActionRequest(operation, token);
      if (!response.ok) throw new Error(await parseError(response, copy.section.actionFailed));
      operation.resolve();
      setPendingOperation(null);
      router.refresh();
    } catch (error) {
      operation.reject(error instanceof Error ? error : new Error(copy.section.actionFailed));
      setPendingOperation(null);
    }
  }, [copy.section.actionFailed, pendingOperation, router]);

  const handleStepUpCancel = useCallback(() => {
    if (pendingOperation) {
      pendingOperation.reject(new Error(copy.section.cancelled));
      setPendingOperation(null);
    }
  }, [copy.section.cancelled, pendingOperation]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{copy.section.eyebrow}</p>
        <h2 className="text-2xl font-semibold tracking-tight">{copy.section.title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{copy.section.body}</p>
      </div>

      <InviteMemberForm locale={locale} onSubmit={handleInvite} />
      <TeamManagementCard locale={locale} members={members} invitations={invitations} currentUserId={currentUserId} onRemoveMember={handleRemoveMember} onCancelInvitation={handleCancelInvitation} />
      <StepUpMfaDialog action="manage_team" open={Boolean(pendingOperation)} title={copy.section.verifyTitle} description={copy.section.verifyBody} onCancel={handleStepUpCancel} onToken={handleStepUpToken} />
    </section>
  );
}
