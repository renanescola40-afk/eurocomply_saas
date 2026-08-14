import { redirect } from 'next/navigation';

import { UpgradeRequiredCard } from '@/components/billing/upgrade-required-card';
import { DashboardCommandNavigation } from '@/components/dashboard/dashboard-command-navigation';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

import RaciClient from './raci-client';

type PageProps = {
  params: Promise<{ locale: string }>;
};

const upgradeCopy: Record<Locale, { title: string; description: string }> = {
  en: { title: 'RACI matrix is available on Business', description: 'Coordinate responsibilities across compliance, legal, finance and operations with clear role governance. This capability is designed for growing and multi-country teams.' },
  pt: { title: 'Matriz RACI disponível no Business', description: 'Coordene responsabilidades entre compliance, jurídico, financeiro e operações com governação clara por função. Esta funcionalidade é indicada para equipas em crescimento e organizações multi-país.' },
  es: { title: 'La matriz RACI está disponible en Business', description: 'Coordina responsabilidades entre compliance, legal, finanzas y operaciones con una gobernanza clara por rol. Esta capacidad está pensada para equipos en crecimiento y organizaciones multinacionales.' },
  fr: { title: 'La matrice RACI est disponible avec Business', description: 'Coordonnez les responsabilités entre compliance, juridique, finance et opérations avec une gouvernance claire par rôle. Cette fonctionnalité convient aux équipes en croissance et aux organisations multi-pays.' },
  it: { title: 'La matrice RACI è disponibile con Business', description: 'Coordina responsabilità tra compliance, legal, finanza e operations con una governance chiara per ruolo. Questa funzionalità è pensata per team in crescita e organizzazioni multi-paese.' },
  de: { title: 'Die RACI-Matrix ist im Business-Plan verfügbar', description: 'Koordinieren Sie Verantwortlichkeiten zwischen Compliance, Recht, Finanzen und Operations mit klarer rollenbasierter Governance. Diese Funktion ist für wachsende und länderübergreifende Teams gedacht.' },
};

function getUpgradeCopy(locale: string) {
  return upgradeCopy[locales.includes(locale as Locale) ? (locale as Locale) : 'en'];
}

export default async function RaciPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const organization = await getCurrentOrganizationForUser(user.id);
  const entitlements = organization ? await getOrganizationEntitlements(organization.id) : null;
  const lockedCopy = getUpgradeCopy(locale);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-6 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <DashboardCommandNavigation locale={locale} />
        {entitlements?.approvalWorkflows ? (
          <RaciClient locale={locale} />
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
