import { redirect } from 'next/navigation';

import { AuthenticatedProductShell } from '@/components/dashboard/authenticated-product-shell';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

import ComplianceCalendarClient from './compliance-calendar-client';

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ source?: string; title?: string; country?: string; description?: string }>;
};

export default async function ComplianceCalendarPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const suggestion = (await searchParams) ?? {};
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  const entitlements = organization ? await getOrganizationEntitlements(organization.id) : null;
  const canUseAiSearch = entitlements?.aiCalendar === 'advanced';

  const content = (
    <div className="min-h-0 bg-transparent text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <ComplianceCalendarClient locale={locale} canUseAiSearch={canUseAiSearch} plan={entitlements?.plan ?? 'essential'} suggestion={suggestion} />
      </div>
    </div>
  );

  return <AuthenticatedProductShell locale={locale}>{content}</AuthenticatedProductShell>;
}
