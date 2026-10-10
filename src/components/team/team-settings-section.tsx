'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import { STEP_UP_TOKEN_HEADER, StepUpMfaDialog } from '@/components/security/step-up-mfa-dialog';
import { getTeamWorkflowCopy } from '@/lib/i18n/team-workflow-copy';
import { InviteMemberForm, type InviteMemberInput } from './invite-member-form';
import { TeamManagementCard } from './team-management-card';

type TeamMember = { id: string; role: string; user_id?: string | null; created_at?: string | null };
type PendingInvitation = { id: string; email: string; role: string; created_at?: string | null; expires_at?: string | null };
type InviteBlockReason = 'plan' | 'capacity' | null;

type PendingTeamOperation =
  | { type: 'invite'; payload: { email: string; role: string; locale: string }; resolve: () => void; reject: (error: Error) => void }
  | { type: 'remove-member'; payload: { memberId: string }; resolve: () => void; reject: (error: Error) => void }
  | { type: 'cancel-invitation'; payload: { invitationId: string }; resolve: () => void; reject: (error: Error) => void };

type TeamSettingsSectionProps = {
  locale: string;
  members: TeamMember[];
  invitations: PendingInvitation[];
  currentUserId?: string;
  canManageTeam: boolean;
  canInviteMembers: boolean;
  canInviteAdmin: boolean;
  inviteBlockReason: InviteBlockReason;
};

const READ_ONLY_COPY = 'Your role can review team access but cannot invite, remove or cancel invitations.';
const INVITE_BLOCKED_COPY = {
  plan: 'New team invitations are not available on the current subscription entitlement. Existing member access remains manageable.',
  capacity: 'The current team-seat capacity is full. Remove an unused member or review the subscription before sending another invitation.',
  action: 'Review billing and capacity',
};

async function parseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  return body.message ?? body.error ?? fallback;
}

function toApiInviteRole(role: InviteMemberInput['role']) {
  if (role === 'admin') return 'Admin';
  if (role === 'editor') return 'Editor';
  return 'Viewer';
}

function teamActionRequest(operation: PendingTeamOperation, token: string) {
  const headers = { 'Content-Type': 'application/json', [STEP_UP_TOKEN_HEADER]: token };
  if (operation.type === 'invite') return fetch('/api/team/invites', { method: 'POST', headers, credentials: 'same-origin', body: JSON.stringify(operation.payload) });
  if (operation.type === 'remove-member') return fetch('/api/team/members/remove', { method: 'POST', headers, credentials: 'same-origin', body: JSON.stringify(operation.payload) });
  return fetch('/api/team/invitations/cancel', { method: 'POST', headers, credentials: 'same-origin', body: JSON.stringify(operation.payload) });
}

export function TeamSettingsSection({
  locale,
  members,
  invitations,
  currentUserId,
  canManageTeam,
  canInviteMembers,
  canInviteAdmin,
  inviteBlockReason,
}: TeamSettingsSectionProps) {
  const router = useRouter();
  const copy = getTeamWorkflowCopy(locale);
  const [pendingOperation, setPendingOperation] = useState<PendingTeamOperation | null>(null);

  const enqueueInvite = useCallback((payload: { email: string; role: string; locale: string }) => new Promise<void>((resolve, reject) => setPendingOperation({ type: 'invite', payload, resolve, reject })), []);
  const enqueueRemoveMember = useCallback((payload: { memberId: string }) => new Promise<void>((resolve, reject) => setPendingOperation({ type: 'remove-member', payload, resolve, reject })), []);
  const enqueueCancelInvitation = useCallback((payload: { invitationId: string }) => new Promise<void>((resolve, reject) => setPendingOperation({ type: 'cancel-invitation', payload, resolve, reject })), []);

  const handleInvite = useCallback((input: InviteMemberInput) => enqueueInvite({ email: input.email, role: toApiInviteRole(input.role), locale: 'en' }), [enqueueInvite]);
  const handleRemoveMember = useCallback((memberId: string) => enqueueRemoveMember({ memberId }), [enqueueRemoveMember]);
  const handleCancelInvitation = useCallback((invitationId: string) => enqueueCancelInvitation({ invitationId }), [enqueueCancelInvitation]);

  const handleStepUpToken = useCallback(async (token: string) => {
    const operation = pendingOperation;
    if (!operation || !canManageTeam) return;
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
  }, [canManageTeam, copy.section.actionFailed, pendingOperation, router]);

  const handleStepUpCancel = useCallback(() => {
    if (pendingOperation) {
      pendingOperation.reject(new Error(copy.section.cancelled));
      setPendingOperation(null);
    }
  }, [copy.section.cancelled, pendingOperation]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-400">{copy.section.eyebrow}</p>
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-100">{copy.section.title}</h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-400">{copy.section.body}</p>
      </div>

      {!canManageTeam ? (
        <p className="rounded-xl border border-slate-800 bg-[#0b121e] p-4 text-sm text-slate-400" role="status">{READ_ONLY_COPY}</p>
      ) : canInviteMembers ? (
        <div className="rounded-xl border border-slate-800 bg-[#0b121e] p-5 sm:p-6">
          <InviteMemberForm locale="en" canInviteAdmin={canInviteAdmin} onSubmit={handleInvite} />
        </div>
      ) : (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.07] p-4 text-sm text-amber-200" role="status">
          <p>{inviteBlockReason === 'capacity' ? INVITE_BLOCKED_COPY.capacity : INVITE_BLOCKED_COPY.plan}</p>
          <Link href="/en/dashboard/organizations/billing" className="mt-3 inline-flex rounded-lg border border-amber-400/20 px-3 py-2 text-xs font-semibold outline-none transition hover:bg-amber-400/[0.08] focus-visible:ring-2 focus-visible:ring-amber-400/40">{INVITE_BLOCKED_COPY.action}</Link>
        </div>
      )}

      <TeamManagementCard
        locale="en"
        members={members}
        invitations={invitations}
        currentUserId={currentUserId}
        onRemoveMember={canManageTeam ? handleRemoveMember : undefined}
        onCancelInvitation={canManageTeam ? handleCancelInvitation : undefined}
      />
      {canManageTeam ? <StepUpMfaDialog action="manage_team" open={Boolean(pendingOperation)} title={copy.section.verifyTitle} description={copy.section.verifyBody} onCancel={handleStepUpCancel} onToken={handleStepUpToken} /> : null}
    </section>
  );
}
