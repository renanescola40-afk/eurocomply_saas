import { PrivacyAdminClient } from './privacy-client';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PrivacyAdminPage({ params }: PageProps) {
  const { locale } = await params;
  return <PrivacyAdminClient locale={locale} />;
}
