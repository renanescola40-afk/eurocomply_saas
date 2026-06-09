import { redirect } from 'next/navigation';

import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { listDocuments } from '@/server/queries/documents';

import ApprovalsClient from './approvals-client';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ApprovalsPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  const documents = organization ? await listDocuments(organization.id) : [];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-6 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <DashboardCommandNavigation locale={locale} />
        <ApprovalsClient locale={locale} initialDocuments={documents} />
      </div>
    </main>
  );
}
