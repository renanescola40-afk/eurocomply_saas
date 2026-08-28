import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PublicFooter } from '@/components/marketing/public-footer';
import { AiGovernanceMaturityAssessment } from '@/components/marketing/tools/ai-governance-maturity-assessment';
import { getSiteUrl } from '@/lib/seo/public-metadata';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'en') return { robots: { index: false, follow: false } };
  const url = `${getSiteUrl()}/en/tools/ai-governance-maturity`;
  return {
    title: 'AI Governance Maturity Assessment | RISCK COMPLY',
    description: 'Score six operational AI governance maturity dimensions across roles, inventory, risk decisions, evidence, vendors and monitoring.',
    alternates: { canonical: url, languages: { en: url, 'x-default': url } },
    openGraph: { title: 'AI Governance Maturity Assessment | RISCK COMPLY', description: 'A free operational maturity assessment for AI governance teams.', url, type: 'website', siteName: 'RISCK COMPLY' },
  };
}

export default async function AiGovernanceMaturityPage({ params }: PageProps) {
  const { locale } = await params;
  if (locale !== 'en') notFound();

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl px-6 pb-10 pt-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Free maturity assessment</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">How operational is your AI governance?</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">Assess governance model, inventory, risk decisions, evidence readiness, vendor governance and monitoring. The result is designed to prioritize operating improvements, not to award a compliance badge.</p>
      </section>
      <section className="mx-auto max-w-6xl px-6 pb-20"><AiGovernanceMaturityAssessment /></section>
      <PublicFooter locale="en" />
    </main>
  );
}
