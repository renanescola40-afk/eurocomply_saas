export type OnboardingStepStatus = 'pending' | 'complete';

export type OnboardingState = {
  hasOrganization: boolean;
  hasMembers: boolean;
  hasComplianceTasks: boolean;
  hasDocuments: boolean;
  hasRisks?: boolean;
  hasVendors: boolean;
  hasDashboardOpened?: boolean;
};

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  status: OnboardingStepStatus;
};

export function buildOnboardingSteps(input: OnboardingState): OnboardingStep[] {
  const hasRisks = input.hasRisks ?? input.hasComplianceTasks;

  return [
    {
      id: 'create-organization',
      title: 'Create organization',
      description: 'Set up the secure tenant that owns compliance data, team access and billing.',
      status: input.hasOrganization ? 'complete' : 'pending',
    },
    {
      id: 'invite-team',
      title: 'Invite a member',
      description: 'Add legal, security, finance or operations so compliance work is not isolated.',
      status: input.hasMembers ? 'complete' : 'pending',
    },
    {
      id: 'upload-document',
      title: 'Add first document',
      description: 'Upload one policy, agreement, report or evidence file to start the register.',
      status: input.hasDocuments ? 'complete' : 'pending',
    },
    {
      id: 'create-risk',
      title: 'Create first risk',
      description: 'Capture one business risk with owner, impact and mitigation action.',
      status: hasRisks ? 'complete' : 'pending',
    },
    {
      id: 'add-vendor',
      title: 'Add first vendor',
      description: 'Register a provider so third-party assurance becomes visible.',
      status: input.hasVendors ? 'complete' : 'pending',
    },
    {
      id: 'open-dashboard',
      title: 'Open compliance dashboard',
      description: 'Review score, gaps and next actions from one executive view.',
      status: input.hasDashboardOpened ? 'complete' : 'pending',
    },
  ];
}

export function getOnboardingProgress(steps: OnboardingStep[]) {
  const completed = steps.filter((step) => step.status === 'complete').length;
  const total = steps.length;

  return {
    completed,
    total,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}
