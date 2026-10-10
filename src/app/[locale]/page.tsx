import type { Metadata } from 'next';

import { EnterpriseHome } from '@/components/marketing/enterprise-home';
import { PublicLandingBusinessCheckoutNormalizer } from '@/components/marketing/public-landing-business-checkout-normalizer';
import { PublicLandingLinkNormalizer } from '@/components/marketing/public-landing-link-normalizer';
import { PublicLandingMobileHeaderGuard } from '@/components/marketing/public-landing-mobile-header-guard';
import { PublicLandingSignupPlanNormalizer as SignupPlanNormalizer } from '@/components/marketing/public-landing-signup-plan-normalizer';
import { SiteStructuredData } from '@/components/seo/site-structured-data';
import { makePublicMetadata } from '@/lib/seo/public-metadata';

export const revalidate = 300;

const landingMetadata = {
  title: 'AI Governance & EU AI Act Readiness | RISCK COMPLY',
  description: 'Organize AI systems, risk assessments, owners, governance evidence, documents and audit activity in one workspace for European B2B teams.',
};

export async function generateMetadata(): Promise<Metadata> {
  return makePublicMetadata({ locale: 'en', title: landingMetadata.title, description: landingMetadata.description });
}

export default async function HomePage() {
  return (
    <>
      <SiteStructuredData locale="en" title={landingMetadata.title} description={landingMetadata.description} />
      <PublicLandingBusinessCheckoutNormalizer locale="en" />
      <PublicLandingLinkNormalizer locale="en" />
      <SignupPlanNormalizer locale="en" />
      <PublicLandingMobileHeaderGuard />
      <EnterpriseHome locale="en" />
    </>
  );
}
