import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell, Building2, CreditCard, ShieldCheck, UserRound, UsersRound } from 'lucide-react';

import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell';
import { ProfilePersonalControls } from '@/components/profile/profile-personal-controls';
import { roleHasPermission } from '@/lib/security/permissions';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { canManageDashboardBilling } from '@/server/queries/organization-dashboard';
import { getOrganizationBillingAuthority } from '@/server/queries/subscription';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type ProfileCopy = {
  eyebrow: string;
  title: string;
  body: string;
  personal: string;
  personalBody: string;
  name: string;
  email: string;
  workspace: string;
  workspaceBody: string;
  organization: string;
  role: string;
  accountControls: string;
  notifications: string;
  privacy: string;
  orgSettings: string;
  team: string;
  billing: string;
  addOns: string;
  restricted: string;
};

const copyByLocale: Record<Locale, ProfileCopy> = {
  en: { eyebrow: 'Personal account', title: 'Your profile, without workspace administration mixed in.', body: 'Personal identity stays here. Organization settings, team access, add-ons and billing live in their own dedicated areas.', personal: 'Personal identity', personalBody: 'Identity currently verified by your authenticated account.', name: 'Name', email: 'Email', workspace: 'Workspace membership', workspaceBody: 'Your organization context and role are read from server-side membership data.', organization: 'Organization', role: 'Role', accountControls: 'Account controls', notifications: 'Notifications', privacy: 'Privacy controls', orgSettings: 'Organization settings', team: 'Team & access', billing: 'Billing', addOns: 'Add-ons', restricted: 'Available to authorized workspace administrators only.' },
  pt: { eyebrow: 'Conta pessoal', title: 'O seu perfil, sem misturar administração da empresa.', body: 'A identidade pessoal fica aqui. Definições da organização, equipa, add-ons e faturação têm áreas próprias e dedicadas.', personal: 'Identidade pessoal', personalBody: 'Identidade atualmente verificada pela sua conta autenticada.', name: 'Nome', email: 'Email', workspace: 'Vínculo ao workspace', workspaceBody: 'A organização e a função são lidas dos dados de associação validados no servidor.', organization: 'Organização', role: 'Função', accountControls: 'Controlos da conta', notifications: 'Notificações', privacy: 'Controlos de privacidade', orgSettings: 'Definições da organização', team: 'Equipa e acessos', billing: 'Faturação', addOns: 'Add-ons', restricted: 'Disponível apenas para administradores autorizados do workspace.' },
  es: { eyebrow: 'Cuenta personal', title: 'Tu perfil, sin mezclar la administración de la empresa.', body: 'La identidad personal permanece aquí. Organización, equipo, add-ons y facturación tienen áreas dedicadas.', personal: 'Identidad personal', personalBody: 'Identidad verificada por tu cuenta autenticada.', name: 'Nombre', email: 'Email', workspace: 'Membresía del workspace', workspaceBody: 'La organización y el rol proceden de datos de membresía validados en el servidor.', organization: 'Organización', role: 'Rol', accountControls: 'Controles de cuenta', notifications: 'Notificaciones', privacy: 'Controles de privacidad', orgSettings: 'Configuración de organización', team: 'Equipo y accesos', billing: 'Facturación', addOns: 'Add-ons', restricted: 'Disponible solo para administradores autorizados del workspace.' },
  fr: { eyebrow: 'Compte personnel', title: 'Votre profil, séparé de l’administration de l’entreprise.', body: 'L’identité personnelle reste ici. Organisation, équipe, modules et facturation disposent de zones dédiées.', personal: 'Identité personnelle', personalBody: 'Identité vérifiée par votre compte authentifié.', name: 'Nom', email: 'E-mail', workspace: 'Appartenance au workspace', workspaceBody: 'L’organisation et le rôle proviennent des données d’adhésion validées côté serveur.', organization: 'Organisation', role: 'Rôle', accountControls: 'Contrôles du compte', notifications: 'Notifications', privacy: 'Contrôles de confidentialité', orgSettings: 'Paramètres organisation', team: 'Équipe et accès', billing: 'Facturation', addOns: 'Modules', restricted: 'Disponible uniquement pour les administrateurs autorisés du workspace.' },
  it: { eyebrow: 'Account personale', title: 'Il tuo profilo, separato dall’amministrazione aziendale.', body: 'L’identità personale resta qui. Organizzazione, team, add-on e fatturazione hanno aree dedicate.', personal: 'Identità personale', personalBody: 'Identità verificata dal tuo account autenticato.', name: 'Nome', email: 'Email', workspace: 'Appartenenza al workspace', workspaceBody: 'Organizzazione e ruolo provengono dai dati di membership validati sul server.', organization: 'Organizzazione', role: 'Ruolo', accountControls: 'Controlli account', notifications: 'Notifiche', privacy: 'Controlli privacy', orgSettings: 'Impostazioni organizzazione', team: 'Team e accessi', billing: 'Fatturazione', addOns: 'Add-on', restricted: 'Disponibile solo agli amministratori autorizzati del workspace.' },
  de: { eyebrow: 'Persönliches Konto', title: 'Ihr Profil, getrennt von der Workspace-Verwaltung.', body: 'Persönliche Identität bleibt hier. Organisation, Team, Add-ons und Abrechnung haben eigene Bereiche.', personal: 'Persönliche Identität', personalBody: 'Identität wird durch Ihr authentifiziertes Konto bestätigt.', name: 'Name', email: 'E-Mail', workspace: 'Workspace-Mitgliedschaft', workspaceBody: 'Organisation und Rolle stammen aus serverseitig validierten Mitgliedschaftsdaten.', organization: 'Organisation', role: 'Rolle', accountControls: 'Kontosteuerung', notifications: 'Benachrichtigungen', privacy: 'Datenschutzkontrollen', orgSettings: 'Organisationseinstellungen', team: 'Team & Zugriff', billing: 'Abrechnung', addOns: 'Add-ons', restricted: 'Nur für autorisierte Workspace-Administratoren verfügbar.' },
};

function initials(firstName?: string | null, lastName?: string | null, email?: string | null) {
  const value = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  if (value) return value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  return email?.slice(0, 2).toUpperCase() ?? 'RC';
}

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  noStore();

  const { locale } = await params;
  const safeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const copy = copyByLocale[safeLocale];
  const user = await getCurrentUser();

  if (!user) redirect(`/${safeLocale}/login?next=${encodeURIComponent(`/${safeLocale}/profile`)}`);

  const organization = await getCurrentOrganizationForUser(user.id);
  const authority = organization ? await getOrganizationBillingAuthority(organization.id) : null;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'RISCK COMPLY user';
  const canManageTeam = organization ? roleHasPermission(organization.role, 'manage_team') : false;
  const canManageSettings = organization ? roleHasPermission(organization.role, 'manage_settings') : false;
  const canManageBilling = organization ? canManageDashboardBilling(organization.role) : false;
  const localized = (path: string) => `/${safeLocale}${path}`;

  const content = (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        <header className="border-b border-white/[0.065] pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{copy.eyebrow}</p>
          <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-[-0.035em] text-white">{copy.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">{copy.body}</p>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
            <div className="flex items-center gap-4 border-b border-white/[0.06] px-5 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-300 text-sm font-black text-[#06100d]">
                {initials(user.firstName, user.lastName, user.email)}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/34">{copy.personal}</p>
                <h2 className="mt-1 truncate text-lg font-semibold text-white/88">{displayName}</h2>
                <p className="mt-0.5 text-xs text-white/38">{copy.personalBody}</p>
              </div>
            </div>

            <dl className="divide-y divide-white/[0.055] px-5">
              <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:items-center"><dt className="text-sm text-white/38">{copy.name}</dt><dd className="text-sm font-medium text-white/82">{displayName}</dd></div>
              <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:items-center"><dt className="text-sm text-white/38">{copy.email}</dt><dd className="break-all text-sm font-medium text-white/82">{user.email ?? '—'}</dd></div>
            </dl>
          </article>

          <article className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
              <Building2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-white/88">{copy.workspace}</h2>
            </div>
            <p className="px-5 pt-4 text-sm leading-6 text-white/44">{copy.workspaceBody}</p>
            <dl className="mt-3 divide-y divide-white/[0.055] border-t border-white/[0.055] px-5">
              <div className="grid gap-1 py-3.5 sm:grid-cols-[9rem_1fr]"><dt className="text-sm text-white/38">{copy.organization}</dt><dd className="text-sm font-medium text-white/82">{organization?.name ?? '—'}</dd></div>
              <div className="grid gap-1 py-3.5 sm:grid-cols-[9rem_1fr]"><dt className="text-sm text-white/38">{copy.role}</dt><dd className="text-sm font-medium capitalize text-white/82">{organization?.role ?? '—'}</dd></div>
            </dl>
          </article>
        </section>

        <ProfilePersonalControls locale={safeLocale} />

        <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
            <UserRound className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white/88">{copy.accountControls}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3">
            <Link href={localized('/notificacoes')} className="flex items-center gap-3 border-b border-white/[0.055] px-5 py-4 text-sm text-white/65 transition hover:bg-white/[0.025] hover:text-white sm:border-r"><Bell className="h-4 w-4 text-emerald-300" aria-hidden="true" /><span className="font-medium">{copy.notifications}</span></Link>
            <Link href={localized('/dashboard/privacy')} className="flex items-center gap-3 border-b border-white/[0.055] px-5 py-4 text-sm text-white/65 transition hover:bg-white/[0.025] hover:text-white lg:border-r"><ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" /><span className="font-medium">{copy.privacy}</span></Link>
            {canManageSettings ? <Link href={localized('/settings/organization')} className="flex items-center gap-3 border-b border-white/[0.055] px-5 py-4 text-sm text-white/65 transition hover:bg-white/[0.025] hover:text-white"><Building2 className="h-4 w-4 text-emerald-300" aria-hidden="true" /><span className="font-medium">{copy.orgSettings}</span></Link> : null}
            {canManageTeam ? <Link href={localized('/dashboard/organizations/team')} className="flex items-center gap-3 border-b border-white/[0.055] px-5 py-4 text-sm text-white/65 transition hover:bg-white/[0.025] hover:text-white sm:border-r lg:border-b-0"><UsersRound className="h-4 w-4 text-emerald-300" aria-hidden="true" /><span className="font-medium">{copy.team}</span></Link> : null}
            {canManageBilling ? <Link href={localized('/dashboard/organizations/billing')} className="flex items-center gap-3 border-b border-white/[0.055] px-5 py-4 text-sm text-white/65 transition hover:bg-white/[0.025] hover:text-white lg:border-b-0 lg:border-r"><CreditCard className="h-4 w-4 text-emerald-300" aria-hidden="true" /><span className="font-medium">{copy.billing}</span></Link> : null}
            {canManageBilling ? <Link href={localized('/dashboard/organizations/add-ons')} className="flex items-center gap-3 px-5 py-4 text-sm text-white/65 transition hover:bg-white/[0.025] hover:text-white"><Building2 className="h-4 w-4 text-emerald-300" aria-hidden="true" /><span className="font-medium">{copy.addOns}</span></Link> : null}
          </div>
          {!canManageSettings && !canManageTeam && !canManageBilling ? <p className="border-t border-white/[0.055] px-5 py-4 text-sm text-white/40">{copy.restricted}</p> : null}
        </section>
      </div>
    </main>
  );

  if (!organization) {
    return <div className="min-h-screen bg-[#0b100f] p-4 md:p-6">{content}</div>;
  }

  return (
    <EnterpriseDashboardShell
      locale={safeLocale}
      organizationName={organization.name}
      userDisplayName={displayName}
      role={organization.role}
      selectedPlan={authority?.plan}
    >
      {content}
    </EnterpriseDashboardShell>
  );
}
