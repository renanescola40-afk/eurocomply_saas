export type OnboardingStepStatus = 'pending' | 'complete';

export type OnboardingState = {
  hasOrganization: boolean;
  hasCountry?: boolean;
  hasCompanyType?: boolean;
  hasSector?: boolean;
  hasAiUsage?: boolean;
  hasFirstAiSystem?: boolean;
  hasRiskClassification?: boolean;
  hasReadinessScore?: boolean;
  hasDocumentSuggestions?: boolean;
  hasInitialTasks?: boolean;
  hasPlanIntent?: boolean;
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

function status(value: boolean | undefined): OnboardingStepStatus {
  return value ? 'complete' : 'pending';
}

export function buildOnboardingSteps(input: OnboardingState): OnboardingStep[] {
  const hasRisks = input.hasRisks ?? input.hasComplianceTasks;

  return [
    {
      id: 'create-organization',
      title: 'Create organization',
      description: 'Set up the secure tenant that owns compliance data, team access and billing.',
      status: status(input.hasOrganization),
    },
    {
      id: 'choose-country',
      title: 'Choose main country',
      description: 'Anchor AI Act readiness around the company’s primary operating country and locale.',
      status: status(input.hasCountry),
    },
    {
      id: 'company-type',
      title: 'Select company type',
      description: 'Capture whether the customer is a startup, SME, agency, enterprise or regulated operator.',
      status: status(input.hasCompanyType),
    },
    {
      id: 'sector',
      title: 'Select sector',
      description: 'Sector context tunes document recommendations, risk review and buyer expectations.',
      status: status(input.hasSector),
    },
    {
      id: 'ai-usage',
      title: 'Capture current AI usage',
      description: 'Understand whether AI is exploratory, internal, customer-facing or decision-supporting.',
      status: status(input.hasAiUsage),
    },
    {
      id: 'first-ai-system',
      title: 'Add first AI system',
      description: 'Register the first AI use case with owner, purpose, vendor, lifecycle and organization_id.',
      status: status(input.hasFirstAiSystem ?? input.hasVendors),
    },
    {
      id: 'risk-classification',
      title: 'Classify initial risk',
      description: 'Generate the initial AI Act risk level from real questionnaire answers and system facts.',
      status: status(input.hasRiskClassification ?? hasRisks),
    },
    {
      id: 'readiness-score',
      title: 'Generate readiness score',
      description: 'Turn onboarding answers into an initial readiness score users can improve later.',
      status: status(input.hasReadinessScore ?? input.hasDashboardOpened),
    },
    {
      id: 'document-suggestions',
      title: 'Suggest required documents',
      description: 'Create a recommended policy, transparency, evidence and risk-document pack.',
      status: status(input.hasDocumentSuggestions ?? input.hasDocuments),
    },
    {
      id: 'initial-tasks',
      title: 'Create first tasks',
      description: 'Persist the first remediation tasks so the dashboard has meaningful next actions.',
      status: status(input.hasInitialTasks ?? input.hasComplianceTasks),
    },
    {
      id: 'invite-team',
      title: 'Invite team',
      description: 'Invite legal, security, operations or leadership without blocking solo users.',
      status: status(input.hasMembers),
    },
    {
      id: 'plan-or-trial',
      title: 'Choose plan or continue trial',
      description: 'Let the customer continue the trial or carry a selected plan into billing review.',
      status: status(input.hasPlanIntent),
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
