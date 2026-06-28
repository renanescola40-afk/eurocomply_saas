import { redirect } from 'next/navigation';
import { CheckCircle2, LockKeyhole, ShieldCheck, UsersRound } from 'lucide-react';

import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { Badge } from '@/components/ui/badge';
import { isSupportedLocale } from '@/lib/i18n/locales';
import { getCurrentUser } from '@/server/queries/auth';
import { listOrganizationMembers } from '@/server/queries/members';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { getOrganizationMembership, getRolePermissions, normalizeOrganizationRole, ORGANIZATION_PERMISSIONS } from '@/server/security/rbac';

const copy = {
  en: { title: 'Workspace security center', subtitle: 'Review AI governance accountability, current role, permissions and the owner/admin/member/viewer workflow.', role: 'Current role', permissions: 'Available permissions', noOrg: 'No organization was found for your account.', workflow: 'Governance workflow', members: 'Current members', emptyMembers: 'No member records were returned for this organization.' },
  pt: { title: 'Centro de segurança do workspace', subtitle: 'Reveja responsabilidades de governação de IA, papel atual, permissões e workflow owner/admin/member/viewer.', role: 'Papel atual', permissions: 'Permissões disponíveis', noOrg: 'Não foi encontrada uma organização para a sua conta.', workflow: 'Workflow de governação', members: 'Membros atuais', emptyMembers: 'Nenhum registo de membro foi retornado para esta organização.' },
  es: { title: 'Centro de seguridad del workspace', subtitle: 'Revisa responsabilidad de gobierno de IA, rol actual, permisos y workflow owner/admin/member/viewer.', role: 'Rol actual', permissions: 'Permisos disponibles', noOrg: 'No se encontró ninguna organización para tu cuenta.', workflow: 'Workflow de gobierno', members: 'Miembros actuales', emptyMembers: 'No se devolvieron miembros para esta organización.' },
  fr: { title: 'Centre sécurité workspace', subtitle: 'Consultez responsabilité de gouvernance IA, rôle actuel, permissions et workflow owner/admin/member/viewer.', role: 'Rôle actuel', permissions: 'Permissions disponibles', noOrg: 'Aucune organisation trouvée pour votre compte.', workflow: 'Workflow gouvernance', members: 'Membres actuels', emptyMembers: 'Aucun membre retourné pour cette organisation.' },
  it: { title: 'Centro sicurezza workspace', subtitle: 'Verifica responsabilità governance IA, ruolo attuale, permessi e workflow owner/admin/member/viewer.', role: 'Ruolo attuale', permissions: 'Permessi disponibili', noOrg: 'Nessuna organizzazione trovata per il tuo account.', workflow: 'Workflow governance', members: 'Membri attuali', emptyMembers: 'Nessun membro restituito per questa organizzazione.' },
  de: { title: 'Workspace Security Center', subtitle: 'Prüfen Sie KI-Governance-Verantwortung, aktuelle Rolle, Berechtigungen und owner/admin/member/viewer Workflow.', role: 'Aktuelle Rolle', permissions: 'Verfügbare Berechtigungen', noOrg: 'Für Ihr Konto wurde keine Organisation gefunden.', workflow: 'Governance-Workflow', members: 'Aktuelle Mitglieder', emptyMembers: 'Keine Mitglieder für diese Organisation zurückgegeben.' },
} as const;

const workflow = [
  { role: 'owner', title: 'Accountable owner', body: 'Approves AI governance scope, board/audit summary, high-risk escalation and policy pack release.' },
  { role: 'admin', title: 'Governance admin', body: 'Maintains AI inventory, classification, vendors, incident workflow and evidence coverage.' },
  { role: 'member', title: 'Operational contributor', body: 'Adds use-case facts, vendor evidence, owner notes, incident details and task updates.' },
  { role: 'viewer', title: 'Read-only reviewer', body: 'Reviews readiness, board summary, evidence pack and reports without changing records.' },
];

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatPermission(permission: string) {
  return permission
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default async function SecurityCenterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requestedLocale } = await params;
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : 'en';
  const t = copy[locale];
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  const [membership, members] = organization
    ? await Promise.all([
        getOrganizationMembership(user.id, organization.id),
        listOrganizationMembers(organization.id).catch(() => []),
      ])
    : [null, []];
  const role = normalizeOrganizationRole(membership?.membership?.role);
  const permissions = getRolePermissions(role);
  const coverage = Math.round((permissions.length / ORGANIZATION_PERMISSIONS.length) * 100);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.12),_transparent_32%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <DashboardCommandNavigation locale={locale} activePage="Access Center" />
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <section className="rounded-[2rem] border bg-background/85 p-8 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="outline" className="rounded-full"><LockKeyhole className="mr-1 h-3.5 w-3.5" />Role-based workflow</Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">{t.title}</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{t.subtitle}</p>
            </div>
            <div className="rounded-3xl border bg-muted/40 p-5 text-center">
              <ShieldCheck className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 text-3xl font-semibold">{coverage}%</p>
              <p className="text-sm text-muted-foreground">RBAC</p>
            </div>
          </div>
        </section>

        {!organization ? (
          <section className="rounded-3xl border bg-background p-8 text-muted-foreground">{t.noOrg}</section>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-3xl border bg-background p-6 shadow-sm">
                <div className="flex items-center gap-3"><UsersRound className="h-5 w-5 text-primary" /><p className="text-sm font-medium text-muted-foreground">{t.role}</p></div>
                <p className="mt-4 text-3xl font-semibold">{formatRole(role)}</p>
                <p className="mt-2 text-sm text-muted-foreground">{organization.name}</p>
              </article>
              <article className="rounded-3xl border bg-background p-6 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">{t.permissions}</p>
                <p className="mt-4 text-3xl font-semibold">{permissions.length}/{ORGANIZATION_PERMISSIONS.length}</p>
                <p className="mt-2 text-sm text-muted-foreground">Role-based coverage</p>
              </article>
            </section>

            <section className="rounded-3xl border bg-background p-6 shadow-sm">
              <h2 className="text-xl font-semibold">{t.workflow}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {workflow.map((item) => (
                  <article key={item.role} className="rounded-2xl border bg-muted/30 p-4">
                    <Badge variant="outline" className="rounded-full">{item.role}</Badge>
                    <h3 className="mt-3 font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border bg-background p-6 shadow-sm">
              <h2 className="text-xl font-semibold">{t.permissions}</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {permissions.map((permission) => (
                  <div key={permission} className="flex items-center gap-2 rounded-2xl border bg-muted/30 px-4 py-3 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span>{formatPermission(permission)}</span></div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border bg-background p-6 shadow-sm">
              <h2 className="text-xl font-semibold">{t.members}</h2>
              {members.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">{t.emptyMembers}</div>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {members.map((member) => (
                    <article key={member.id} className="rounded-2xl border bg-muted/30 p-4">
                      <Badge variant="outline" className="rounded-full">{member.role}</Badge>
                      <p className="mt-3 break-all text-sm font-medium">{member.user_id ?? member.id}</p>
                      <p className="mt-1 text-xs text-muted-foreground">organization_id: {member.organization_id}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
