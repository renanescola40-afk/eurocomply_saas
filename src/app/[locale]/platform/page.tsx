import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';

import { EnterpriseBulkImport } from '@/components/platform/enterprise-bulk-import';
import { EnterpriseContractBilling } from '@/components/platform/enterprise-contract-billing';
import { EnterpriseControlCenter } from '@/components/platform/enterprise-control-center';
import { EnterpriseScimToken } from '@/components/platform/enterprise-scim-token';
import { EnterpriseSsoConnection } from '@/components/platform/enterprise-sso-connection';
import { LinkedInMarketingConnection } from '@/components/platform/linkedin-marketing-connection';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getCurrentUser } from '@/server/queries/auth';
import {
  PlatformAdminError,
  platformRoleHasCapability,
  requirePlatformCapability,
} from '@/server/security/platform-admin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type PlatformSearchParams = {
  linkedin?: string | string[];
};

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<PlatformSearchParams>;
};

function getSafeLocale(locale: string): Locale {
  return (locales.includes(locale as Locale) ? locale : 'en') as Locale;
}

async function requireControlCenterAccess(locale: Locale) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/platform`);

  try {
    return await requirePlatformCapability(user.id, 'organizations');
  } catch (error) {
    if (error instanceof PlatformAdminError && error.status === 403) {
      redirect(`/${locale}/dashboard/organizations`);
    }
    throw error;
  }
}

export default async function PlatformControlCenterPage({ params, searchParams }: PageProps) {
  noStore();
  const { locale } = await params;
  const query: PlatformSearchParams = searchParams ? await searchParams : {};
  const safeLocale = getSafeLocale(locale);
  const membership = await requireControlCenterAccess(safeLocale);
  const canManageBilling = platformRoleHasCapability(membership.role, 'billing');
  const canManageSecurity = platformRoleHasCapability(membership.role, 'security');
  const linkedinOutcome = typeof query.linkedin === 'string' ? query.linkedin : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34rem),linear-gradient(180deg,#050505_0%,#080b12_48%,#050505_100%)] text-white">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200/70">
            Internal Enterprise Operations
          </p>
          <h1 className="max-w-5xl text-3xl font-semibold tracking-tight md:text-5xl">
            Platform Control Center
          </h1>
          <p className="max-w-4xl text-sm leading-7 text-white/60 md:text-base">
            Create negotiated contracts, configure annual billing, inspect tenant usage, configure SAML SSO, queue bulk provisioning, issue SCIM credentials and apply audited lifecycle transitions without creating a separate application for each customer.
          </p>
        </header>

        <EnterpriseControlCenter platformRole={membership.role} />
        {canManageBilling ? <EnterpriseContractBilling /> : null}
        <EnterpriseBulkImport />
        {canManageSecurity ? <LinkedInMarketingConnection oauthOutcome={linkedinOutcome} /> : null}
        {canManageSecurity ? <EnterpriseSsoConnection /> : null}
        {canManageSecurity ? <EnterpriseScimToken /> : null}
      </div>
    </main>
  );
}
