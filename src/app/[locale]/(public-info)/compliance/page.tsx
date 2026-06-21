import { PublicInfoPage } from '@/components/marketing/public-info-page';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PublicInfoPage locale={locale} pageKey="compliance" />;
}
