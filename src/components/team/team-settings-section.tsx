'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { STEP_UP_TOKEN_HEADER, StepUpMfaDialog } from '@/components/security/step-up-mfa-dialog';
import { getTeamWorkflowCopy } from '@/lib/i18n/team-workflow-copy';
import { InviteMemberForm, type InviteMemberInput } from './invite-member-form';
import { TeamManagementCard } from './team-management-card';
import type { TeamRole } from './team-member-role-editor';

type TeamMember = { id: string; role: string; user_id?: string | null; created_at?: string | null };
type PendingInvitation = { id: string; email: string; role: string; created_at?: string | null; expires_at?: string | null };
type InviteBlockReason = 'plan' | 'capacity' | null;

type PendingTeamOperation =
  | { type: 'invite'; payload: { email: string; role: string; locale: string }; resolve: () => void; reject: (error: Error) => void }
  | { type: 'remove-member'; payload: { memberId: string }; resolve: () => void; reject: (error: Error) => void }
  | { type: 'change-member-role'; payload: { memberId: string; role: TeamRole }; resolve: () => void; reject: (error: Error) => void }
  | { type: 'cancel-invitation'; payload: { invitationId: string }; resolve: () => void; reject: (error: Error) => void };

type TeamSettingsSectionProps = {
  locale: string;
  members: TeamMember[];
  invitations: PendingInvitation[];
  currentUserId?: string;
  canManageTeam: boolean;
  currentUserRole: string;
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

const TEAM_IDENTITY_ERROR_COPY: Record<string, string> = {
  clerk_only_removal_requires_review: 'This member cannot be removed until their identity has been reviewed. Contact support.',
  clerk_only_role_change_requires_review: 'This member cannot change roles until their identity has been reviewed. Contact support.',
};

async function parseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string } | null;
  const identityReviewCopy = body?.error ? TEAM_IDENTITY_ERROR_COPY[body.error] : undefined;
  return identityReviewCopy ?? body?.message ?? body?.error ?? fallback;
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
  if (operation.type === 'change-member-role') return fetch('/api/team/members/role', { method: 'POST', headers, credentials: 'same-origin', body: JSON.stringify(operation.payload) });
  return fetch('/api/team/invitations/cancel', { method: 'POST', headers, credentials: 'same-origin', body: JSON.stringify(operation.payload) });
}

export function TeamSettingsSection({
  locale,
  members,
  invitations,
  currentUserId,
  canManageTeam,
  currentUserRole,
  canInviteMembers,
  canInviteAdmin,
  inviteBlockReason,
}: TeamSettingsSectionProps) {
  const router = useRouter();
  const copy = getTeamWorkflowCopy(locale);
  const [pendingOperation, setPendingOperation] = useState<PendingTeamOperation | null>(null);
  const pendingOperationRef = useRef<PendingTeamOperation | null>(null);
  const requestInFlightRef = useRef(false);

  // A single active MFA operation prevents orphaned promises and misrouted tokens.
  const scheduleOperation = useCallback((
    create: (resolve: () => void, reject: (error: Error) => void) => PendingTeamOperation,
  ) => new Promise<void>((resolve, reject) => {
    if (pendingOperationRef.current) {
      reject(new Error('Finish the current team action before starting another.'));
      return;
    }
    const operation = create(resolve, reject);
    pendingOperationRef.current = operation;
    setPendingOperation(operation);
  }), []);

  const enqueueInvite = useCallback((payload: { email: string; role: string; locale: string }) =>
    scheduleOperation((resolve, reject) => ({ type: 'invite', payload, resolve, reject })), [scheduleOperation]);
  const enqueueRemoveMember = useCallback((payload: { memberId: string }) =>
    scheduleOperation((resolve, reject) => ({ type: 'remove-member', payload, resolve, reject })), [scheduleOperation]);
  const enqueueChangeMemberRole = useCallback((payload: { memberId: string; role: TeamRole }) =>
    scheduleOperation((resolve, reject) => ({ type: 'change-member-role', payload, resolve, reject })), [scheduleOperation]);
  const enqueueCancelInvitation = useCallback((payload: { invitationId: string }) =>
    scheduleOperation((resolve, reject) => ({ type: 'cancel-invitation', payload, resolve, reject })), [scheduleOperation]);

  const handleInvite = useCallback((input: InviteMemberInput) => enqueueInvite({ email: input.email, role: toApiInviteRole(input.role), locale: 'en' }), [enqueueInvite]);
  const handleRemoveMember = useCallback((memberId: string) => enqueueRemoveMember({ memberId }), [enqueueRemoveMember]);
  const handleChangeMemberRole = useCallback((memberId: string, role: TeamRole) => enqueueChangeMemberRole({ memberId, role }), [enqueueChangeMemberRole]);
  const handleCancelInvitation = useCallback((invitationId: string) => enqueueCancelInvitation({ invitationId }), [enqueueCancelInvitation]);

  const handleStepUpToken = useCallback(async (token: string) => {
    const operation = pendingOperationRef.current;
    if (!operation || !canManageTeam) return;
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    try {
      const response = await teamActionRequest(operation, token);
      if (!response.ok) throw new Error(await parseError(response, copy.section.actionFailed));
      operation.resolve();
      router.refresh();
    } catch (error) {
      operation.reject(error instanceof Error ? error : new Error(copy.section.actionFailed));
    } finally {
      pendingOperationRef.current = null;
      requestInFlightRef.current = false;
      setPendingOperation(null);
    }
  }, [canManageTeam, copy.section.actionFailed, router]);

  const handleStepUpCancel = useCallback(() => {
    if (requestInFlightRef.current) return;
    const operation = pendingOperationRef.current;
    if (operation) {
      pendingOperationRef.current = null;
      setPendingOperation(null);
      operation.reject(new Error(copy.section.cancelled));
    }
  }, [copy.section.cancelled]);

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
        currentUserRole={currentUserRole}
        canAssignAdmin={canInviteAdmin}
        onChangeMemberRole={canManageTeam ? handleChangeMemberRole : undefined}
        onRemoveMember={canManageTeam ? handleRemoveMember : undefined}
        onCancelInvitation={canManageTeam ? handleCancelInvitation : undefined}
      />
      {canManageTeam ? <StepUpMfaDialog action="manage_team" open={Boolean(pendingOperation)} title={copy.section.verifyTitle} description={copy.section.verifyBody} onCancel={handleStepUpCancel} onToken={handleStepUpToken} /> : null}
    </section>
  );
}
