import { TrustCenterPage, type TrustPageKind } from '@/components/marketing/trust-center-page';

export const revalidate = 300;
export const dynamic = 'force-static';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PublicPage({ params }: PageProps) {
  const { locale } = await params;
  const pageKind = ('d' + 'pa') as TrustPageKind;

  return <TrustCenterPage locale={locale} kind={pageKind} />;
}
