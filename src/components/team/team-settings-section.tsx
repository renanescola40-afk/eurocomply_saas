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

const readOnlyCopy: Record<string, string> = {
  en: 'Your role can review team access but cannot invite, remove or cancel invitations.',
  pt: 'A sua função pode consultar o acesso da equipa, mas não pode convidar, remover membros ou cancelar convites.',
  es: 'Tu rol puede consultar el acceso del equipo, pero no puede invitar, eliminar miembros ni cancelar invitaciones.',
  fr: 'Votre rôle peut consulter les accès de l’équipe, mais ne peut pas inviter, retirer des membres ou annuler des invitations.',
  it: 'Il tuo ruolo può consultare gli accessi del team, ma non può invitare, rimuovere membri o annullare inviti.',
  de: 'Ihre Rolle kann Teamzugriffe einsehen, aber keine Einladungen senden, Mitglieder entfernen oder Einladungen abbrechen.',
};

const inviteBlockedCopy: Record<string, { plan: string; capacity: string; action: string }> = {
  en: { plan: 'New team invitations are not available on the current subscription entitlement. Existing member access remains manageable.', capacity: 'The current team-seat capacity is full. Remove an unused member or review the subscription before sending another invitation.', action: 'Review billing and capacity' },
  pt: { plan: 'Novos convites de equipa não estão disponíveis no entitlement atual da subscrição. O acesso dos membros existentes continua gerível.', capacity: 'A capacidade atual de lugares da equipa está esgotada. Remova um membro sem utilização ou reveja a subscrição antes de enviar outro convite.', action: 'Rever faturação e capacidade' },
  es: { plan: 'Las nuevas invitaciones de equipo no están disponibles con el entitlement actual de la suscripción. El acceso de miembros existentes sigue siendo gestionable.', capacity: 'La capacidad actual del equipo está completa. Elimina un miembro sin uso o revisa la suscripción antes de enviar otra invitación.', action: 'Revisar facturación y capacidad' },
  fr: { plan: 'Les nouvelles invitations d’équipe ne sont pas disponibles avec l’entitlement actuel. Les accès existants restent gérables.', capacity: 'La capacité actuelle de l’équipe est atteinte. Retirez un membre inutilisé ou révisez l’abonnement avant une nouvelle invitation.', action: 'Vérifier facturation et capacité' },
  it: { plan: 'I nuovi inviti al team non sono disponibili con l’entitlement corrente. Gli accessi esistenti restano gestibili.', capacity: 'La capacità attuale del team è completa. Rimuovi un membro non utilizzato o rivedi l’abbonamento prima di inviare un altro invito.', action: 'Controlla fatturazione e capacità' },
  de: { plan: 'Neue Teameinladungen sind mit dem aktuellen Subscription-Entitlement nicht verfügbar. Bestehende Zugriffe bleiben verwaltbar.', capacity: 'Die aktuelle Teamkapazität ist ausgeschöpft. Entfernen Sie ein nicht benötigtes Mitglied oder prüfen Sie das Abonnement vor einer weiteren Einladung.', action: 'Abrechnung und Kapazität prüfen' },
};

async function parseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  return body.message ?? body.error ?? fallback;
}

function toApiInviteRole(role: InviteMemberInput['role']) {
  if (role === 'admin') return 'Admin';
  if (role === 'editor') return 'Editor';
  return 'Visualizador';
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
  const blockedCopy = inviteBlockedCopy[locale] ?? inviteBlockedCopy.en;
  const [pendingOperation, setPendingOperation] = useState<PendingTeamOperation | null>(null);

  const enqueueInvite = useCallback((payload: { email: string; role: string; locale: string }) => new Promise<void>((resolve, reject) => setPendingOperation({ type: 'invite', payload, resolve, reject })), []);
  const enqueueRemoveMember = useCallback((payload: { memberId: string }) => new Promise<void>((resolve, reject) => setPendingOperation({ type: 'remove-member', payload, resolve, reject })), []);
  const enqueueCancelInvitation = useCallback((payload: { invitationId: string }) => new Promise<void>((resolve, reject) => setPendingOperation({ type: 'cancel-invitation', payload, resolve, reject })), []);

  const handleInvite = useCallback((input: InviteMemberInput) => enqueueInvite({ email: input.email, role: toApiInviteRole(input.role), locale }), [enqueueInvite, locale]);
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
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{copy.section.eyebrow}</p>
        <h2 className="text-2xl font-semibold tracking-tight">{copy.section.title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{copy.section.body}</p>
      </div>

      {!canManageTeam ? (
        <p className="rounded-xl border bg-muted/35 p-4 text-sm text-muted-foreground" role="status">{readOnlyCopy[locale] ?? readOnlyCopy.en}</p>
      ) : canInviteMembers ? (
        <InviteMemberForm locale={locale} canInviteAdmin={canInviteAdmin} onSubmit={handleInvite} />
      ) : (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100" role="status">
          <p>{inviteBlockReason === 'capacity' ? blockedCopy.capacity : blockedCopy.plan}</p>
          <Link href={`/${locale}/dashboard/organizations/billing`} className="mt-3 inline-flex rounded-full border border-current/20 px-4 py-2 font-semibold outline-none focus-visible:ring-2">{blockedCopy.action}</Link>
        </div>
      )}

      <TeamManagementCard
        locale={locale}
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
