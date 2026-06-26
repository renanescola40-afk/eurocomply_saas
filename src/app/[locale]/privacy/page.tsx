import { TrustCenterPage } from '@/components/marketing/trust-center-page';

export const revalidate = 300;
export const dynamic = 'force-static';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;

  return <TrustCenterPage locale={locale} kind="privacy" />;
}
