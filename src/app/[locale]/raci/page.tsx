import { redirect } from 'next/navigation';

import { UpgradeRequiredCard } from '@/components/billing/upgrade-required-card';
import { AuthenticatedProductShell } from '@/components/dashboard/authenticated-product-shell';
import { locales, type Locale } from '@/lib/i18n/routing';
import { getOrganizationEntitlements } from '@/server/billing/entitlements';
import { getCurrentUser } from '@/server/queries/auth';
import { listDocuments } from '@/server/queries/documents';
import { getCurrentOrganizationForUser } from '@/server/queries/organizations';

import RaciClient, { type RaciRow } from './raci-client';

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

const validRoles = new Set(['R', 'A', 'C', 'I']);

function getUpgradeCopy(locale: string) {
  return upgradeCopy[locales.includes(locale as Locale) ? (locale as Locale) : 'en'];
}

function role(value: unknown, fallback: 'R' | 'A' | 'C' | 'I'): 'R' | 'A' | 'C' | 'I' {
  return typeof value === 'string' && validRoles.has(value) ? (value as 'R' | 'A' | 'C' | 'I') : fallback;
}

function toRaciRow(document: Awaited<ReturnType<typeof listDocuments>>[number]): RaciRow {
  const raci = document.metadata?.raci;
  const assignments = raci && typeof raci === 'object' ? (raci as Record<string, unknown>) : {};
  return {
    id: document.id,
    document: document.title,
    legal: role(assignments.legal, 'C'),
    security: role(assignments.security, 'C'),
    compliance: role(assignments.compliance, 'R'),
    finance: role(assignments.finance, 'I'),
  };
}

export default async function RaciPage({ params }: PageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const organization = await getCurrentOrganizationForUser(user.id);
  if (!organization) redirect(`/${locale}/onboarding`);

  const entitlements = await getOrganizationEntitlements(organization.id);
  const lockedCopy = getUpgradeCopy(locale);
  const documents = entitlements?.approvalWorkflows ? await listDocuments(organization.id, { pageSize: 100 }) : [];
  const rows = documents.map(toRaciRow);

  const content = (
    <div className="min-h-0 bg-transparent text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        {entitlements?.approvalWorkflows ? (
          <RaciClient locale={locale} initialRows={rows} />
        ) : (
          <UpgradeRequiredCard locale={locale} title={lockedCopy.title} description={lockedCopy.description} requiredPlan="Business" />
        )}
      </div>
    </div>
  );

  return <AuthenticatedProductShell locale={locale}>{content}</AuthenticatedProductShell>;
}
