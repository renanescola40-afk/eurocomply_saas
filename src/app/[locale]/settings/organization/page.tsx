import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2, CreditCard, ShieldCheck, UsersRound } from 'lucide-react';

import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell';
import { locales, type Locale } from '@/lib/i18n/routing';
import { roleHasPermission } from '@/lib/security/permissions';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { canManageDashboardBilling } from '@/server/queries/organization-dashboard';
import { getOrganizationBillingAuthority } from '@/server/queries/subscription';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const copy = {
  en: { eyebrow: 'Organization', title: 'Workspace settings and administrative boundaries.', body: 'Organization administration is intentionally separate from your personal profile. Access is derived from your server-side workspace role.', identity: 'Workspace identity', name: 'Organization name', slug: 'Workspace slug', role: 'Your role', access: 'Administrative areas', team: 'Team & access', billing: 'Billing', addons: 'Add-ons', security: 'Security center', readonly: 'Your role can view this workspace context but does not include organization administration.' },
  pt: { eyebrow: 'Organização', title: 'Definições do workspace e limites administrativos.', body: 'A administração da organização fica separada do seu perfil pessoal. O acesso é definido pela função do workspace validada no servidor.', identity: 'Identidade do workspace', name: 'Nome da organização', slug: 'Slug do workspace', role: 'A sua função', access: 'Áreas administrativas', team: 'Equipa e acessos', billing: 'Faturação', addons: 'Add-ons', security: 'Centro de segurança', readonly: 'A sua função pode visualizar este contexto, mas não inclui administração da organização.' },
  es: { eyebrow: 'Organización', title: 'Configuración del workspace y límites administrativos.', body: 'La administración de la organización está separada de tu perfil personal. El acceso deriva del rol validado en el servidor.', identity: 'Identidad del workspace', name: 'Nombre de organización', slug: 'Slug del workspace', role: 'Tu rol', access: 'Áreas administrativas', team: 'Equipo y accesos', billing: 'Facturación', addons: 'Add-ons', security: 'Centro de seguridad', readonly: 'Tu rol puede ver este contexto pero no incluye administración de la organización.' },
  fr: { eyebrow: 'Organisation', title: 'Paramètres du workspace et limites administratives.', body: 'L’administration de l’organisation est séparée du profil personnel. L’accès dépend du rôle validé côté serveur.', identity: 'Identité du workspace', name: 'Nom de l’organisation', slug: 'Slug du workspace', role: 'Votre rôle', access: 'Zones administratives', team: 'Équipe et accès', billing: 'Facturation', addons: 'Modules', security: 'Centre de sécurité', readonly: 'Votre rôle peut consulter ce contexte mais ne permet pas l’administration de l’organisation.' },
  it: { eyebrow: 'Organizzazione', title: 'Impostazioni workspace e confini amministrativi.', body: 'L’amministrazione dell’organizzazione è separata dal profilo personale. L’accesso deriva dal ruolo validato sul server.', identity: 'Identità workspace', name: 'Nome organizzazione', slug: 'Slug workspace', role: 'Il tuo ruolo', access: 'Aree amministrative', team: 'Team e accessi', billing: 'Fatturazione', addons: 'Add-on', security: 'Centro sicurezza', readonly: 'Il tuo ruolo può visualizzare questo contesto ma non include l’amministrazione dell’organizzazione.' },
  de: { eyebrow: 'Organisation', title: 'Workspace-Einstellungen und administrative Grenzen.', body: 'Organisationsverwaltung ist vom persönlichen Profil getrennt. Der Zugriff basiert auf der serverseitig validierten Workspace-Rolle.', identity: 'Workspace-Identität', name: 'Organisationsname', slug: 'Workspace-Slug', role: 'Ihre Rolle', access: 'Administrative Bereiche', team: 'Team & Zugriff', billing: 'Abrechnung', addons: 'Add-ons', security: 'Security Center', readonly: 'Ihre Rolle kann diesen Kontext sehen, umfasst aber keine Organisationsverwaltung.' },
} satisfies Record<Locale, Record<string, string>>;

export default async function OrganizationSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  noStore();

  const { locale } = await params;
  const safeLocale = (locales.includes(locale as Locale) ? locale : 'en') as Locale;
  const text = copy[safeLocale];
  const user = await getCurrentUser();
  if (!user) redirect(`/${safeLocale}/login?next=${encodeURIComponent(`/${safeLocale}/settings/organization`)}`);

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) redirect(`/${safeLocale}/onboarding`);

  const authority = await getOrganizationBillingAuthority(organization.id);
  const canManageSettings = roleHasPermission(organization.role, 'manage_settings');
  const canManageTeam = roleHasPermission(organization.role, 'manage_team');
  const canManageBilling = canManageDashboardBilling(organization.role);
  const localized = (path: string) => `/${safeLocale}${path}`;
  const userDisplayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'RISCK COMPLY user';

  return (
    <EnterpriseDashboardShell
      locale={safeLocale}
      organizationName={organization.name}
      userDisplayName={userDisplayName}
      role={organization.role}
      selectedPlan={authority?.plan}
    >
      <main className="min-h-0 bg-transparent text-white">
        <div className="w-full space-y-6">
          <header className="border-b border-white/[0.065] pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{text.eyebrow}</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-[-0.035em] text-white">{text.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">{text.body}</p>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
              <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
                <Building2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-white/88">{text.identity}</h2>
              </div>
              <dl className="divide-y divide-white/[0.055] px-5">
                <div className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr]"><dt className="text-sm text-white/38">{text.name}</dt><dd className="text-sm font-medium text-white/82">{organization.name}</dd></div>
                <div className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr]"><dt className="text-sm text-white/38">{text.slug}</dt><dd className="text-sm font-medium text-white/82">{organization.slug ?? '—'}</dd></div>
                <div className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr]"><dt className="text-sm text-white/38">{text.role}</dt><dd className="text-sm font-medium capitalize text-white/82">{organization.role}</dd></div>
              </dl>
              {!canManageSettings ? <p className="m-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] p-4 text-sm leading-6 text-amber-50/70">{text.readonly}</p> : null}
            </article>

            <article className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715]">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <h2 className="text-sm font-semibold text-white/88">{text.access}</h2>
              </div>
              <div className="divide-y divide-white/[0.055]">
                {canManageTeam ? <Link href={localized('/dashboard/organizations/team')} className="flex items-center gap-3 px-5 py-4 text-sm text-white/68 transition hover:bg-white/[0.025] hover:text-white"><UsersRound className="h-4 w-4 text-emerald-300" aria-hidden="true" /><span className="font-medium">{text.team}</span></Link> : null}
                {canManageBilling ? <Link href={localized('/dashboard/organizations/billing')} className="flex items-center gap-3 px-5 py-4 text-sm text-white/68 transition hover:bg-white/[0.025] hover:text-white"><CreditCard className="h-4 w-4 text-emerald-300" aria-hidden="true" /><span className="font-medium">{text.billing}</span></Link> : null}
                {canManageBilling ? <Link href={localized('/dashboard/organizations/add-ons')} className="flex items-center gap-3 px-5 py-4 text-sm text-white/68 transition hover:bg-white/[0.025] hover:text-white"><Building2 className="h-4 w-4 text-emerald-300" aria-hidden="true" /><span className="font-medium">{text.addons}</span></Link> : null}
                {canManageSettings ? <Link href={localized('/security-center')} className="flex items-center gap-3 px-5 py-4 text-sm text-white/68 transition hover:bg-white/[0.025] hover:text-white"><ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" /><span className="font-medium">{text.security}</span></Link> : null}
              </div>
            </article>
          </section>
        </div>
      </main>
    </EnterpriseDashboardShell>
  );
}
