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

  const setupRequested = query.setup === '1';

  if (!user) {
    // Preserve an explicit, identity-only MFA setup intent across sign-in.
    // No tenant data or protected organization permissions are granted here.
    const mfaPath = `/${safeLocale}/mfa${setupRequested ? '?setup=1' : ''}`;
    redirect(`/${safeLocale}/login?next=${encodeURIComponent(mfaPath)}`);
  }

  const nextPath = safeNextPath(query.next, safeLocale);

  if (!setupRequested) {
    // Normal tenant-required MFA continues to enforce all existing server-side
    // organization and policy checks. Missing or malformed policy fails closed.
    const organization = await getCurrentOrganizationForUser(user.id);
    if (!organization) {
      redirect(`/${safeLocale}/onboarding`);
    }

    const state = await getTenantMfaSessionState(organization.id);
    if (!state.required || state.satisfied) {
      redirect(nextPath);
    }
  }

  // Explicit account-level setup only: a verified Supabase Auth user may enroll
  // their own TOTP factor without a service-role client. This is not authority
  // to access any workspace; every subsequent tenant/API route rechecks it.

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 dark:bg-slate-950">
      <TenantMfaEnrollment locale={safeLocale} nextPath={nextPath} />
    </main>
  );
}
