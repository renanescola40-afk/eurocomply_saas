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

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-PT' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function roleTone(role: string) {
  const normalized = role.toLowerCase();
  if (normalized === 'owner') return 'border-blue-400/25 bg-blue-400/10 text-blue-300';
  if (normalized === 'admin') return 'border-violet-400/25 bg-violet-400/10 text-violet-300';
  return 'border-slate-700 bg-slate-900/60 text-slate-400';
}

export function TeamManagementCard({ locale, members, invitations, currentUserId, onRemoveMember, onCancelInvitation }: TeamManagementCardProps) {
  const copy = getTeamWorkflowCopy(locale).access;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b121e]" aria-labelledby="team-access-title">
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-6">
        <div>
          <h2 id="team-access-title" className="text-sm font-semibold text-slate-100">{copy.title}</h2>
          <p className="mt-1 text-xs text-slate-600">Access records, assigned roles and pending invitations for this organization.</p>
        </div>
        <span className="rounded-md border border-slate-800 bg-[#0d1624] px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-slate-400">{members.length + invitations.length}</span>
      </div>

      <section aria-labelledby="team-members-title">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-[#09101a] px-5 py-3 sm:px-6">
          <h3 id="team-members-title" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">{copy.members}</h3>
          <span className="font-mono text-[11px] tabular-nums text-slate-600">{members.length}</span>
        </div>
        {members.length === 0 ? (
          <p className="p-6 text-sm text-slate-500" role="status">{copy.noMembers}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full border-collapse text-left">
              <thead className="bg-[#080e18]">
                <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-600">
                  <th className="px-5 py-3 sm:px-6">Identity</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-5 py-3 text-right sm:px-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {members.map((member) => {
                  const isCurrentUser = member.user_id === currentUserId;
                  const canRemove = Boolean(onRemoveMember) && !isCurrentUser;
                  const displayName = member.profiles?.full_name || (isCurrentUser ? copy.you : copy.member);
                  return (
                    <tr key={member.id} className="bg-[#0b121e] transition hover:bg-[#0e1827]">
                      <td className="px-5 py-4 sm:px-6">
                        <p className="max-w-[320px] truncate text-sm font-semibold text-slate-100">{displayName}</p>
                        {isCurrentUser ? <p className="mt-1 text-[11px] text-blue-400">Current session identity</p> : null}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${roleTone(member.role)}`}>{member.role}</span>
                      </td>
                      <td className="px-4 py-4 font-mono text-[11px] tabular-nums text-slate-500">{formatDate(member.created_at, locale)}</td>
                      <td className="px-5 py-4 text-right sm:px-6">
                        {canRemove && onRemoveMember ? <TeamActionButton message={copy.removeConfirm(displayName)} onConfirm={() => onRemoveMember(member.id)}>{copy.remove}</TeamActionButton> : <span className="text-xs text-slate-700">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="pending-invitations-title" className="border-t border-slate-800">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-[#09101a] px-5 py-3 sm:px-6">
          <h3 id="pending-invitations-title" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">{copy.pending}</h3>
          <span className="font-mono text-[11px] tabular-nums text-slate-600">{invitations.length}</span>
        </div>
        {invitations.length === 0 ? (
          <p className="p-6 text-sm text-slate-500" role="status">{copy.noPending}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full border-collapse text-left">
              <thead className="bg-[#080e18]">
                <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-600">
                  <th className="px-5 py-3 sm:px-6">Email</th>
                  <th className="px-4 py-3">Requested role</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-5 py-3 text-right sm:px-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="bg-[#0b121e] transition hover:bg-[#0e1827]">
                    <td className="px-5 py-4 sm:px-6"><p className="max-w-[360px] truncate text-sm font-semibold text-slate-100">{invitation.email}</p></td>
                    <td className="px-4 py-4"><span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${roleTone(invitation.role)}`}>{invitation.role}</span></td>
                    <td className="px-4 py-4 font-mono text-[11px] tabular-nums text-slate-500">{formatDate(invitation.expires_at, locale)}</td>
                    <td className="px-5 py-4 text-right sm:px-6">
                      {onCancelInvitation ? <TeamActionButton message={copy.cancelConfirm(invitation.email)} onConfirm={() => onCancelInvitation(invitation.id)}>{copy.cancel}</TeamActionButton> : <span className="text-xs text-slate-700">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
