import { redirect } from 'next/navigation';
import { CheckCircle2, ShieldCheck, UsersRound } from 'lucide-react';

import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { isSupportedLocale } from '@/lib/i18n/locales';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { getOrganizationMembership, getRolePermissions, normalizeOrganizationRole, ORGANIZATION_PERMISSIONS } from '@/server/security/rbac';

const copy = {
  en: {
    title: 'Access Center',
    subtitle: 'Review your organization role and the permissions available to your account.',
    role: 'Current role',
    permissions: 'Available permissions',
    noOrg: 'No organization was found for your account.',
  },
  pt: {
    title: 'Centro de Acesso',
    subtitle: 'Reveja o seu papel na organização e as permissões disponíveis para a sua conta.',
    role: 'Papel atual',
    permissions: 'Permissões disponíveis',
    noOrg: 'Não foi encontrada uma organização para a sua conta.',
  },
  es: {
    title: 'Centro de Acceso',
    subtitle: 'Revisa tu rol en la organización y los permisos disponibles para tu cuenta.',
    role: 'Rol actual',
    permissions: 'Permisos disponibles',
    noOrg: 'No se encontró ninguna organización para tu cuenta.',
  },
  fr: {
    title: 'Centre d’Accès',
    subtitle: 'Consultez votre rôle dans l’organisation et les permissions disponibles.',
    role: 'Rôle actuel',
    permissions: 'Permissions disponibles',
    noOrg: 'Aucune organisation trouvée pour votre compte.',
  },
  it: {
    title: 'Centro Accessi',
    subtitle: 'Verifica il tuo ruolo organizzativo e i permessi disponibili.',
    role: 'Ruolo attuale',
    permissions: 'Permessi disponibili',
    noOrg: 'Nessuna organizzazione trovata per il tuo account.',
  },
  de: {
    title: 'Access Center',
    subtitle: 'Prüfen Sie Ihre Organisationsrolle und verfügbare Berechtigungen.',
    role: 'Aktuelle Rolle',
    permissions: 'Verfügbare Berechtigungen',
    noOrg: 'Für Ihr Konto wurde keine Organisation gefunden.',
  },
} as const;

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
  const membership = organization ? await getOrganizationMembership(user.id, organization.id) : null;
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
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">EuroComply</p>
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
                <div className="flex items-center gap-3">
                  <UsersRound className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">{t.role}</p>
                </div>
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
              <h2 className="text-xl font-semibold">{t.permissions}</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {permissions.map((permission) => (
                  <div key={permission} className="flex items-center gap-2 rounded-2xl border bg-muted/30 px-4 py-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{formatPermission(permission)}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
