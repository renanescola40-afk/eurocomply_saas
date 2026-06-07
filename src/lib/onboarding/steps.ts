export type OnboardingStepStatus = 'pending' | 'complete';

export type OnboardingState = {
  hasOrganization: boolean;
  hasMembers: boolean;
  hasComplianceTasks: boolean;
  hasDocuments: boolean;
  hasVendors: boolean;
};

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  status: OnboardingStepStatus;
};

export function buildOnboardingSteps(input: OnboardingState): OnboardingStep[] {
  return [
    {
      id: 'create-organization',
      title: 'Create your organization',
      description: 'Set up the tenant that owns your compliance workspace.',
      status: input.hasOrganization ? 'complete' : 'pending',
    },
    {
      id: 'invite-team',
      title: 'Invite your team',
      description: 'Add stakeholders who will manage compliance work.',
      status: input.hasMembers ? 'complete' : 'pending',
    },
    {
      id: 'create-compliance-task',
      title: 'Create a compliance task',
      description: 'Track the first requirement, owner, priority and due date.',
      status: input.hasComplianceTasks ? 'complete' : 'pending',
    },
    {
      id: 'upload-document',
      title: 'Upload a compliance document',
      description: 'Attach policies, evidence or audit-ready documentation.',
      status: input.hasDocuments ? 'complete' : 'pending',
    },
    {
      id: 'add-vendor',
      title: 'Add a vendor',
      description: 'Start monitoring third-party risk and data access exposure.',
      status: input.hasVendors ? 'complete' : 'pending',
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
