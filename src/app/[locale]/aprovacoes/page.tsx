import { redirect } from 'next/navigation';

import { UpgradeRequiredCard } from '@/components/billing/upgrade-required-card';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';
import { listDocuments } from '@/server/queries/documents';

import ApprovalsClient from './approvals-client';

type PageProps = {
  params: Promise<{ locale: string }>;
};

const upgradeCopy: Record<Locale, { title: string; description: string }> = {
  en: { title: 'Approval workflows are available on Business', description: 'Structured approvals, clear responsibilities and review-ready evidence are designed for teams operating real compliance processes.' },
  pt: { title: 'Workflows de aprovação disponíveis no Business', description: 'Aprovações estruturadas, responsabilidades claras e evidências prontas para fiscalização são recursos pensados para equipas com operação real de compliance.' },
  es: { title: 'Los workflows de aprobación están disponibles en Business', description: 'Las aprobaciones estructuradas, las responsabilidades claras y las evidencias preparadas para revisión están pensadas para equipos con operaciones reales de compliance.' },
  fr: { title: 'Les workflows d’approbation sont disponibles avec Business', description: 'Les approbations structurées, les responsabilités claires et les preuves prêtes pour la revue sont conçues pour les équipes qui opèrent de vrais processus de compliance.' },
  it: { title: 'I workflow di approvazione sono disponibili con Business', description: 'Approvazioni strutturate, responsabilità chiare ed evidenze pronte per la review sono pensate per team che gestiscono processi reali di compliance.' },
  de: { title: 'Freigabe-Workflows sind im Business-Plan verfügbar', description: 'Strukturierte Freigaben, klare Verantwortlichkeiten und prüfungsbereite Evidenz sind für Teams mit echten Compliance-Prozessen ausgelegt.' },
};

function getUpgradeCopy(locale: string) {
  return upgradeCopy[locales.includes(locale as Locale) ? (locale as Locale) : 'en'];
}

export default async function ApprovalsPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  const documents = organization ? await listDocuments(organization.id) : [];
  const entitlements = organization ? await getOrganizationEntitlements(organization.id) : null;
  const lockedCopy = getUpgradeCopy(locale);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-6 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <DashboardCommandNavigation locale={locale} />
        {entitlements?.approvalWorkflows ? (
          <ApprovalsClient locale={locale} initialDocuments={documents} />
        ) : (
          <UpgradeRequiredCard
            locale={locale}
            title={lockedCopy.title}
            description={lockedCopy.description}
            requiredPlan="Business"
          />
        )}
      </div>
    </main>
  );
}
