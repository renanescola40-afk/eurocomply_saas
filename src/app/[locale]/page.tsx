import { EnterpriseHome } from '@/components/marketing/enterprise-home';
import { PublicLandingBusinessCheckoutNormalizer } from '@/components/marketing/public-landing-business-checkout-normalizer';
import { PublicLandingLinkNormalizer } from '@/components/marketing/public-landing-link-normalizer';
import { PublicLandingMobileHeaderGuard } from '@/components/marketing/public-landing-mobile-header-guard';
import { PublicLandingSignupPlanNormalizer as SignupPlanNormalizer } from '@/components/marketing/public-landing-signup-plan-normalizer';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/routing';

export const revalidate = 300;
export const dynamic = 'force-static';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: PageProps) {
  const { locale: requestedLocale } = await params;
  const locale = (locales.includes(requestedLocale as Locale) ? requestedLocale : defaultLocale) as Locale;

  return (
    <>
      <PublicLandingBusinessCheckoutNormalizer locale={locale} />
      <PublicLandingLinkNormalizer locale={locale} />
      <SignupPlanNormalizer locale={locale} />
      <PublicLandingMobileHeaderGuard />
      <EnterpriseHome locale={locale} />
    </>
  );
}
