import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, Building2, CreditCard, ShieldCheck, UsersRound } from 'lucide-react';

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

  const adminAreas = [
    canManageTeam ? { href: localized('/dashboard/organizations/team'), label: text.team, Icon: UsersRound } : null,
    canManageBilling ? { href: localized('/dashboard/organizations/billing'), label: text.billing, Icon: CreditCard } : null,
    canManageBilling ? { href: localized('/dashboard/organizations/add-ons'), label: text.addons, Icon: Building2 } : null,
    canManageSettings ? { href: localized('/security-center'), label: text.security, Icon: ShieldCheck } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; Icon: typeof Building2 }>;

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
          <header className="border-b border-white/[0.07] pb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300/70">{text.eyebrow}</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-white">{text.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/48">{text.body}</p>
          </header>

          <section className="grid gap-4 sm:grid-cols-3" aria-label={text.identity}>
            <article className="rounded-2xl border border-white/[0.075] bg-[#0d1522] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/32">{text.name}</p>
              <p className="mt-2 truncate text-lg font-semibold text-white/88">{organization.name}</p>
            </article>
            <article className="rounded-2xl border border-white/[0.075] bg-[#0d1522] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/32">{text.slug}</p>
              <p className="mt-2 truncate font-mono text-sm font-semibold text-blue-100/80">{organization.slug ?? '—'}</p>
            </article>
            <article className="rounded-2xl border border-white/[0.075] bg-[#0d1522] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/32">{text.role}</p>
              <p className="mt-2 text-lg font-semibold capitalize text-white/88">{organization.role}</p>
            </article>
          </section>

          {!canManageSettings ? (
            <p className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.045] p-4 text-sm leading-6 text-amber-50/72" role="status">{text.readonly}</p>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-white/[0.075] bg-[#0d1522]" aria-labelledby="organization-admin-title">
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-300">
                <Building2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h2 id="organization-admin-title" className="text-sm font-semibold text-white/88">{text.access}</h2>
                <p className="mt-0.5 text-xs text-white/34">Server-authorized workspace administration</p>
              </div>
            </div>

            {adminAreas.length ? (
              <div className="grid gap-px bg-white/[0.055] md:grid-cols-2">
                {adminAreas.map(({ href, label, Icon }) => (
                  <Link key={href} href={href} className="group flex min-h-24 items-center justify-between gap-4 bg-[#0d1522] px-5 py-4 transition hover:bg-blue-500/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400/60">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-400/15 bg-blue-500/[0.08] text-blue-300">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <span className="font-medium text-white/72 transition group-hover:text-white">{label}</span>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-white/24 transition group-hover:text-blue-300" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="p-5 text-sm text-white/42">{text.readonly}</p>
            )}
          </section>
        </div>
      </main>
    </EnterpriseDashboardShell>
  );
}
