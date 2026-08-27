import { redirect } from 'next/navigation';

import { UpgradeRequiredCard } from '@/components/billing/upgrade-required-card';
import { ReportsGovernanceWorkspace } from '@/components/dashboard/reports-governance-workspace';
import { canAccessFeature } from '@/lib/billing/feature-gates';
import { locales, type Locale } from '@/lib/i18n/routing';
import { listActiveOrganizationAddOns } from '@/server/billing/addons';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getOrganizationDashboardData } from '@/server/queries/organization-dashboard';
import { normalizePlan } from '@/server/queries/subscription';

const upgradeCopy: Record<Locale, { title: string; description: string }> = {
  en: { title: 'Executive reports unlock consolidated governance operations', description: 'Business adds governance reports, executive visibility, review-ready evidence and consolidated risk views for companies scaling across Europe.' },
  pt: { title: 'Relatórios executivos desbloqueiam a operação de compliance', description: 'O plano Business adiciona relatórios de governação, visão executiva, evidências prontas para auditoria e leitura consolidada de riscos para empresas em expansão europeia.' },
  es: { title: 'Los informes ejecutivos desbloquean una visión consolidada de gobernanza', description: 'Business añade informes de gobernanza, visibilidad ejecutiva, evidencias preparadas para revisión y una lectura consolidada de riesgos para empresas que crecen en Europa.' },
  fr: { title: 'Les rapports exécutifs débloquent une vue consolidée de la gouvernance', description: 'Business ajoute des rapports de gouvernance, une visibilité exécutive, des preuves prêtes pour la revue et une lecture consolidée des risques pour les entreprises en expansion européenne.' },
  it: { title: 'I report esecutivi sbloccano una visione consolidata della governance', description: 'Business aggiunge report di governance, visibilità executive, evidenze pronte per la review e una lettura consolidata dei rischi per aziende in espansione europea.' },
  de: { title: 'Executive Reports ermöglichen eine konsolidierte Governance-Sicht', description: 'Business ergänzt Governance-Berichte, Executive-Transparenz, prüfungsbereite Evidenz und konsolidierte Risikosichten für Unternehmen, die in Europa skalieren.' },
};

function getUpgradeCopy(locale: string) {
  return upgradeCopy[locales.includes(locale as Locale) ? (locale as Locale) : 'en'];
}

export default async function OrganizationReportsGovernancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const data = await getOrganizationDashboardData(user.id);
  if (!data) redirect(`/${locale}/onboarding`);

  const localizedDashboardBasePath = `/${locale}/dashboard/organizations`;
  const [entitlements, activeAddOns] = await Promise.all([
    getOrganizationEntitlements(data.organization.id),
    listActiveOrganizationAddOns(data.organization.id),
  ]);
  const canViewExecutiveReports = canAccessFeature('advanced_reporting', {
    plan: normalizePlan(entitlements.plan),
    activeAddOns,
  });
  const lockedCopy = getUpgradeCopy(locale);

  return (
    <main className="min-h-0 bg-transparent text-white">
      <div className="w-full space-y-6">
        {canViewExecutiveReports ? (
          <ReportsGovernanceWorkspace
            summary={data.summary}
            tasks={data.tasks}
            trendHistory={data.trendHistory}
            trendComparison={data.trendComparison}
            workflowReadiness={data.workflowReadiness}
            basePath={localizedDashboardBasePath}
            topRisks={data.topRisks}
            vendorsRequiringReview={data.vendorsRequiringReview}
            documentsExpiringSoon={data.documentsExpiringSoon}
          />
        ) : (
          <UpgradeRequiredCard
            locale={locale}
            requiredPlan="Business"
            addOnSlug="advanced-reporting"
            title={lockedCopy.title}
            description={lockedCopy.description}
          />
        )}
      </div>
    </main>
  );
}
