import { VerifiedStatusPage } from '@/components/marketing/verified-status-page';

export const revalidate = 300;
export const dynamic = 'force-static';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function StatusPage({ params }: PageProps) {
  const { locale } = await params;

  return <VerifiedStatusPage locale={locale} />;
}
