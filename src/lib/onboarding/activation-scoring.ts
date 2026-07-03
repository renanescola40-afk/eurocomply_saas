import type { AiActRiskLevel, OnboardingRecommendation, OnboardingTaskSuggestion, PlanIntent } from './activation';

export function getSuggestedTasks(input: {
  riskLevel: AiActRiskLevel;
  recommendedDocuments: OnboardingRecommendation[];
  inviteEmails: string[];
}): OnboardingTaskSuggestion[] {
  const tasks: OnboardingTaskSuggestion[] = [
    {
      id: 'confirm-ai-system-owner',
      title: 'Confirm accountable owner for first AI system',
      description: 'Validate who owns the system, review cadence and escalation path.',
      priority: 'high',
      dueInDays: 3,
    },
    {
      id: 'review-generated-documents',
      title: 'Review recommended AI governance documents',
      description: `Start with ${input.recommendedDocuments.slice(0, 3).map((document) => document.title).join(', ')}.`,
      priority: 'medium',
      dueInDays: 7,
    },
  ];

  if (input.riskLevel === 'high_risk_review' || input.riskLevel === 'prohibited_review') {
    tasks.unshift({
      id: 'schedule-risk-review',
      title: 'Schedule formal AI risk review',
      description: 'Route this system through the accountable review path before broader rollout.',
      priority: input.riskLevel === 'prohibited_review' ? 'critical' : 'high',
      dueInDays: 2,
    });
  }

  if (input.inviteEmails.length === 0) {
    tasks.push({
      id: 'invite-compliance-collaborator',
      title: 'Invite a compliance, legal or security teammate',
      description: 'Onboarding can continue without a teammate, but readiness improves when ownership is shared.',
      priority: 'low',
      dueInDays: 10,
    });
  }

  return tasks;
}

export function calculateInitialReadinessScore(input: {
  hasOrganization: boolean;
  hasCountry: boolean;
  hasCompanyType: boolean;
  hasSector: boolean;
  hasAiUsage: boolean;
  hasFirstAiSystem: boolean;
  hasRiskClassification: boolean;
  recommendedDocuments: OnboardingRecommendation[];
  suggestedTasks: OnboardingTaskSuggestion[];
  invitedEmails: string[];
  selectedPlan: PlanIntent | string;
}) {
  let score = 0;

  if (input.hasOrganization) score += 15;
  if (input.hasCountry) score += 10;
  if (input.hasCompanyType) score += 10;
  if (input.hasSector) score += 10;
  if (input.hasAiUsage) score += 10;
  if (input.hasFirstAiSystem) score += 20;
  if (input.hasRiskClassification) score += 10;
  if (input.recommendedDocuments.length > 0) score += 5;
  if (input.suggestedTasks.length > 0) score += 5;
  if (input.invitedEmails.length > 0) score += 3;
  if (input.selectedPlan !== 'trial') score += 2;

  return Math.max(0, Math.min(100, score));
}
