import { describe, expect, it } from 'vitest';

import { buildOnboardingSteps, getOnboardingProgress } from './steps';

describe('onboarding steps', () => {
  it('models the full B2B activation flow', () => {
    const steps = buildOnboardingSteps({
      hasOrganization: true,
      hasCountry: true,
      hasCompanyType: true,
      hasSector: true,
      hasAiUsage: true,
      hasFirstAiSystem: true,
      hasRiskClassification: true,
      hasReadinessScore: true,
      hasDocumentSuggestions: true,
      hasInitialTasks: true,
      hasMembers: true,
      hasPlanIntent: true,
      hasComplianceTasks: true,
      hasDocuments: true,
      hasVendors: true,
    });

    expect(steps).toHaveLength(12);
    expect(steps.map((step) => step.id)).toEqual([
      'create-organization',
      'choose-country',
      'company-type',
      'sector',
      'ai-usage',
      'first-ai-system',
      'risk-classification',
      'readiness-score',
      'document-suggestions',
      'initial-tasks',
      'invite-team',
      'plan-or-trial',
    ]);
    expect(steps.every((step) => step.status === 'complete')).toBe(true);
  });

  it('calculates activation progress percentage', () => {
    const steps = buildOnboardingSteps({
      hasOrganization: true,
      hasCountry: true,
      hasCompanyType: true,
      hasSector: true,
      hasAiUsage: true,
      hasMembers: false,
      hasComplianceTasks: false,
      hasDocuments: false,
      hasVendors: false,
    });

    expect(getOnboardingProgress(steps)).toEqual({
      completed: 5,
      total: 12,
      percentage: 42,
    });
  });
});
