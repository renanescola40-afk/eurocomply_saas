import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';

import { EnterpriseOrganizationCreate } from '@/components/platform/enterprise-organization-create';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getCurrentUser } from '@/server/queries/auth';
import {
  PlatformAdminError,
  requirePlatformCapability,
} from '@/server/security/platform-admin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type PageProps = { params: Promise<{ locale: string }> };

function safeLocale(value: string): Locale {
  return (locales.includes(value as Locale) ? value : 'en') as Locale;
}

export default async function NewEnterpriseOrganizationPage({ params }: PageProps) {
  noStore();
  const { locale } = await params;
  const resolvedLocale = safeLocale(locale);
  const user = await getCurrentUser();
  if (!user) redirect(`/${resolvedLocale}/login?next=/${resolvedLocale}/platform/organizations/new`);

  try {
    await requirePlatformCapability(user.id, 'organizations');
  } catch (error) {
    if (error instanceof PlatformAdminError && error.status === 403) {
      redirect(`/${resolvedLocale}/dashboard/organizations`);
    }
    throw error;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34rem),linear-gradient(180deg,#050505_0%,#080b12_48%,#050505_100%)] text-white">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200/70">Platform Control Center</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Create Enterprise tenant</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
            Create the isolated customer organization first, then use its ID in the negotiated contract workflow.
          </p>
        </header>
        <EnterpriseOrganizationCreate />
      </div>
    </main>
  );
}
