import { redirect } from 'next/navigation';

const legacySectionTargets: Record<string, string> = {
  vendors: 'vendor-assurance',
  risks: 'riscos',
  documents: 'documentos',
  tasks: 'aprovacoes',
  reports: 'dashboard/organizations/reports-governance',
};

type PageProps = {
  params: Promise<{
    locale: string;
    legacy: string;
    section: string;
  }>;
};

export default async function LegacyOrganizationRedirectPage({ params }: PageProps) {
  const { locale, section } = await params;
  const safeLocale = locale === 'pt' || locale === 'en' ? locale : 'en';
  const target = legacySectionTargets[section] ?? 'dashboard/organizations';

  redirect(`/${safeLocale}/${target}`);
}
