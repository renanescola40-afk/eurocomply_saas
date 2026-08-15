import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  PLAN_INTENTS,
  onboardingActivationSchema,
  onboardingDraftSchema,
} from '@/lib/onboarding/activation';
import {
  DEFAULT_ONBOARDING_PLAN_INTENT,
  getOnboardingPlanIntent,
} from '@/lib/onboarding/plan-intent';

const onboardingFlow = readFileSync(
  join(process.cwd(), 'src/components/onboarding/b2b-onboarding-flow.tsx'),
  'utf8',
);
const onboardingSteps = readFileSync(
  join(process.cwd(), 'src/lib/onboarding/steps.ts'),
  'utf8',
);

const validActivation = {
  organizationName: 'QA Organization',
  slug: 'qa-organization',
  country: 'pt' as const,
  companyType: 'sme' as const,
  sector: 'saas' as const,
  aiUsage: 'internal_productivity' as const,
  aiSystemName: 'QA Assistant',
  aiSystemUseCase: 'Summarises synthetic support tickets for human review.',
  ownerTeam: 'Product',
  role: 'deployer' as const,
  lifecycleStatus: 'pilot' as const,
  riskDomain: 'general_productivity' as const,
  inviteEmails: [],
};

describe('onboarding commercial plan truth', () => {
  it('exposes only sellable onboarding plan intents', () => {
    expect(PLAN_INTENTS).toEqual(['essential', 'professional', 'business', 'enterprise']);
    expect(PLAN_INTENTS).not.toContain('trial');
    expect(onboardingFlow).toContain('PLAN_INTENTS.map');
  });

  it('uses Professional as the deterministic no-query fallback', () => {
    expect(DEFAULT_ONBOARDING_PLAN_INTENT).toBe('professional');
    expect(getOnboardingPlanIntent(undefined)).toBe('professional');
    expect(getOnboardingPlanIntent(null)).toBe('professional');
    expect(getOnboardingPlanIntent('not-a-plan')).toBe('professional');
    expect(onboardingFlow).toContain("org?.selectedPlan, 'professional')");
  });

  it('preserves the canonical Starter compatibility boundary without inventing a trial', () => {
    expect(getOnboardingPlanIntent('starter')).toBe('essential');
    expect(getOnboardingPlanIntent('essential')).toBe('essential');
    expect(getOnboardingPlanIntent('professional')).toBe('professional');
    expect(getOnboardingPlanIntent('business')).toBe('business');
    expect(getOnboardingPlanIntent('enterprise')).toBe('enterprise');
  });

  it('defaults draft and activation submissions to Professional', () => {
    const draft = onboardingDraftSchema.parse({
      organizationName: 'QA Organization',
      slug: 'qa-organization',
    });
    const activation = onboardingActivationSchema.parse(validActivation);

    expect(draft.selectedPlan).toBe('professional');
    expect(activation.selectedPlan).toBe('professional');
  });

  it('rejects the retired trial intent at the Product mutation boundary', () => {
    expect(onboardingDraftSchema.safeParse({
      organizationName: 'QA Organization',
      slug: 'qa-organization',
      selectedPlan: 'trial',
    }).success).toBe(false);

    expect(onboardingActivationSchema.safeParse({
      ...validActivation,
      selectedPlan: 'trial',
    }).success).toBe(false);
  });

  it('removes retired trial language from every customer-visible onboarding step', () => {
    expect(onboardingFlow).toContain("['plan', CheckCircle2, 'Confirm plan', 'Confirmar plano']");
    expect(onboardingFlow).toContain("'Confirm plan': 'Confirmar plan'");
    expect(onboardingFlow).toContain("'Confirm plan': 'Confirmer le plan'");
    expect(onboardingFlow).toContain("'Confirm plan': 'Conferma piano'");
    expect(onboardingFlow).toContain("'Confirm plan': 'Plan bestätigen'");
    expect(onboardingFlow).not.toContain('Plan or trial');
    expect(onboardingFlow).not.toContain('Plano ou trial');
    expect(onboardingFlow).not.toContain('Keep exploring now and choose billing later.');

    expect(onboardingSteps).toContain("id: 'plan'");
    expect(onboardingSteps).toContain("title: 'Confirm selected plan'");
    expect(onboardingSteps).not.toContain('continue trial');
    expect(onboardingSteps).not.toContain('plan-or-trial');
  });
});
