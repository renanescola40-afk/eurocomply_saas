import type { Metadata } from 'next';

import { TrustCenterPage } from '@/components/marketing/trust-center-page';
import { makePublicMetadata } from '@/lib/seo/public-metadata';

export const revalidate = 300;

const metadata = {
  title: 'AI Governance Compliance Support | RISCK COMPLY',
  description: 'Review how RISCK COMPLY supports AI inventory, risk workflows, governance evidence and EU AI Act readiness without legal or certification guarantees.',
};

export async function generateMetadata(): Promise<Metadata> {
  return makePublicMetadata({
    locale: 'en',
    path: '/compliance',
    title: metadata.title,
    description: metadata.description,
  });
}

export default async function CompliancePage() {
  return <TrustCenterPage locale="en" kind="compliance" />;
}
