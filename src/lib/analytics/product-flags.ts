'use client';

import { isAnalyticsFeatureEnabled } from './posthog-client';

export const productFlagKeys = {
  aiFeatures: 'ai_features',
  enterpriseExports: 'enterprise_exports',
  onboardingV2: 'onboarding_v2',
} as const;

export type ProductFlagKey = (typeof productFlagKeys)[keyof typeof productFlagKeys];

export function isProductFlagEnabled(flag: ProductFlagKey) {
  return isAnalyticsFeatureEnabled(flag);
}
