import { CheckoutActivationClient } from './checkout-activation-client';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function CheckoutCompletePage({ params }: PageProps) {
  const { locale } = await params;
  return <CheckoutActivationClient locale={locale} />;
}
