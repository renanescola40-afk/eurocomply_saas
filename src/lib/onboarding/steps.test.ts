import { describe, expect, it } from 'vitest';

import { buildOnboardingSteps, getOnboardingProgress } from './steps';

describe('onboarding steps', () => {
  it('marks completed steps from product state', () => {
    const steps = buildOnboardingSteps({
      hasOrganization: true,
      hasMembers: false,
      hasComplianceTasks: true,
      hasDocuments: false,
      hasVendors: false,
    });

    expect(steps).toHaveLength(6);
    expect(steps.filter((step) => step.status === 'complete')).toHaveLength(2);
  });

  it('calculates onboarding progress percentage', () => {
    const steps = buildOnboardingSteps({
      hasOrganization: true,
      hasMembers: true,
      hasComplianceTasks: false,
      hasDocuments: false,
      hasVendors: false,
    });

    expect(getOnboardingProgress(steps)).toEqual({
      completed: 2,
      total: 6,
      percentage: 33,
    });
  });
});
