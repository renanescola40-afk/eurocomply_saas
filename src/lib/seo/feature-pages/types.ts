import type { Locale } from '@/lib/i18n/routing';

export const FEATURE_KEYS = [
  'ai-inventory',
  'ai-risk-assessment',
  'evidence-management',
  'ai-governance-workflows',
  'vendor-ai-risk',
  'eu-ai-act-readiness',
  'audit-trails',
  'compliance-documentation',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type FeatureFaq = {
  question: string;
  answer: string;
};

export type FeaturePageCopy = {
  key: FeatureKey;
  slug: string;
  navLabel: string;
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  problemTitle: string;
  problem: string;
  capabilitiesTitle: string;
  capabilities: string[];
  workflowTitle: string;
  workflow: string[];
  faqTitle: string;
  faq: FeatureFaq[];
  ctaTitle: string;
  ctaText: string;
};

export type LocalizedFeaturePages = Record<FeatureKey, FeaturePageCopy>;

export type FeatureStaticParam = {
  locale: Locale;
  feature: string;
};
