import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell, Building2, CreditCard, ShieldCheck, UserRound, UsersRound } from 'lucide-react';

import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { ProfilePersonalControls } from '@/components/profile/profile-personal-controls';
import { roleHasPermission } from '@/lib/security/permissions';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { canManageDashboardBilling } from '@/server/queries/organization-dashboard';

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
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'RISCK COMPLY user';
  const canManageTeam = organization ? roleHasPermission(organization.role, 'manage_team') : false;
  const canManageSettings = organization ? roleHasPermission(organization.role, 'manage_settings') : false;
  const canManageBilling = organization ? canManageDashboardBilling(organization.role) : false;
  const localized = (path: string) => `/${safeLocale}${path}`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.14),_transparent_32rem),linear-gradient(180deg,#050505_0%,#080b12_48%,#050505_100%)] text-white">
      <DashboardCommandNavigation locale={safeLocale} activePage="Profile" />
      <div className="pointer-events-none fixed inset-0 tech-grid opacity-20" />

      <div className="relative mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200/70">{copy.eyebrow}</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.04em] md:text-5xl">{copy.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/58 md:text-base">{copy.body}</p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 md:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white text-lg font-black text-black shadow-lg">
                {initials(user.firstName, user.lastName, user.email)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">{copy.personal}</p>
                <h2 className="mt-1 truncate text-2xl font-semibold">{displayName}</h2>
                <p className="mt-1 text-sm text-white/48">{copy.personalBody}</p>
              </div>
            </div>

            <dl className="mt-8 divide-y divide-white/10 rounded-2xl border border-white/10 bg-black/20 px-5">
              <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:items-center"><dt className="text-sm text-white/45">{copy.name}</dt><dd className="text-sm font-medium text-white/88">{displayName}</dd></div>
              <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:items-center"><dt className="text-sm text-white/45">{copy.email}</dt><dd className="break-all text-sm font-medium text-white/88">{user.email ?? '—'}</dd></div>
            </dl>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 md:p-8">
            <div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-blue-200" aria-hidden="true" /><h2 className="text-xl font-semibold">{copy.workspace}</h2></div>
            <p className="mt-2 text-sm leading-6 text-white/50">{copy.workspaceBody}</p>
            <dl className="mt-6 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><dt className="text-xs uppercase tracking-[0.18em] text-white/38">{copy.organization}</dt><dd className="mt-1 text-base font-semibold">{organization?.name ?? '—'}</dd></div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><dt className="text-xs uppercase tracking-[0.18em] text-white/38">{copy.role}</dt><dd className="mt-1 text-base font-semibold capitalize">{organization?.role ?? '—'}</dd></div>
            </dl>
          </article>
        </section>

        <ProfilePersonalControls locale={safeLocale} />

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 md:p-8">
          <div className="flex items-center gap-3"><UserRound className="h-5 w-5 text-blue-200" aria-hidden="true" /><h2 className="text-xl font-semibold">{copy.accountControls}</h2></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link href={localized('/notificacoes')} className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-blue-300/30 hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"><Bell className="h-5 w-5 text-blue-200" aria-hidden="true" /><p className="mt-3 font-medium">{copy.notifications}</p></Link>
            <Link href={localized('/dashboard/privacy')} className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-blue-300/30 hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"><ShieldCheck className="h-5 w-5 text-blue-200" aria-hidden="true" /><p className="mt-3 font-medium">{copy.privacy}</p></Link>
            {canManageSettings ? <Link href={localized('/settings/organization')} className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-blue-300/30 hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"><Building2 className="h-5 w-5 text-blue-200" aria-hidden="true" /><p className="mt-3 font-medium">{copy.orgSettings}</p></Link> : null}
            {canManageTeam ? <Link href={localized('/dashboard/organizations/team')} className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-blue-300/30 hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"><UsersRound className="h-5 w-5 text-blue-200" aria-hidden="true" /><p className="mt-3 font-medium">{copy.team}</p></Link> : null}
            {canManageBilling ? <Link href={localized('/dashboard/organizations/billing')} className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-blue-300/30 hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"><CreditCard className="h-5 w-5 text-blue-200" aria-hidden="true" /><p className="mt-3 font-medium">{copy.billing}</p></Link> : null}
            {canManageBilling ? <Link href={localized('/dashboard/organizations/add-ons')} className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-blue-300/30 hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"><Building2 className="h-5 w-5 text-blue-200" aria-hidden="true" /><p className="mt-3 font-medium">{copy.addOns}</p></Link> : null}
          </div>
          {!canManageSettings && !canManageTeam && !canManageBilling ? <p className="mt-5 text-sm text-white/42">{copy.restricted}</p> : null}
        </section>
      </div>
    </main>
  );
}
