import { VerifiedStatusPage } from '@/components/marketing/verified-status-page';

export const revalidate = 300;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function StatusPage({ params }: PageProps) {
  const { locale } = await params;

  return <VerifiedStatusPage locale={locale} />;
}
