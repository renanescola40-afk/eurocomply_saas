import { redirect } from 'next/navigation';

import TenantMfaEnrollment from '@/components/security/tenant-mfa-enrollment';
import { routing, type Locale } from '@/lib/i18n/routing';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/current-organization';
import { getTenantMfaSessionState } from '@/server/security/tenant-mfa';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string; setup?: string }>;
};

function safeNextPath(value: string | undefined, locale: string) {
  const fallback = `/${locale}/dashboard/organizations`;
  if (!value) return fallback;
  if (value.includes('\\') || value.startsWith('//')) return fallback;
  if (!value.startsWith(`/${locale}/`)) return fallback;
  return value;
}

export default async function TenantMfaPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const safeLocale = routing.locales.includes(locale as Locale) ? locale : 'en';
  const query = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${safeLocale}/login?next=${encodeURIComponent(`/${safeLocale}/mfa`)}`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) {
    redirect(`/${safeLocale}/onboarding`);
  }

  const state = await getTenantMfaSessionState(organization.id);
  const nextPath = safeNextPath(query.next, safeLocale);

  const setupRequested = query.setup === '1';

  if ((!state.required && !setupRequested) || (state.satisfied && !setupRequested)) {
    redirect(nextPath);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 dark:bg-slate-950">
      <TenantMfaEnrollment locale={safeLocale} nextPath={nextPath} />
    </main>
  );
}
