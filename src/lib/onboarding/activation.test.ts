import { describe, expect, it } from 'vitest';

import {
  calculateInitialReadinessScore,
  getRecommendedDocuments,
  getSuggestedTasks,
  inferInitialRiskLevel,
  onboardingActivationSchema,
  slugifyOrganization,
} from './activation';

describe('onboarding activation', () => {
  it('validates a complete activation payload with Zod', () => {
    const payload = onboardingActivationSchema.parse({
      organizationName: 'Risk Comply Europe',
      slug: 'risk-comply-europe',
      country: 'pt',
      companyType: 'startup',
      sector: 'saas',
      aiUsage: 'internal_productivity',
      aiSystemName: 'Support Copilot',
      aiSystemUseCase: 'Summarises customer support tickets and drafts replies for agents.',
      ownerTeam: 'Support Operations',
      vendorName: 'OpenAI',
      role: 'deployer',
      lifecycleStatus: 'pilot',
      riskDomain: 'customer_support',
      usesPersonalData: true,
      interactsWithPeople: true,
      generatesContent: true,
      biometricIdentification: false,
      manipulativeOrExploitative: false,
      inviteEmails: ['legal@example.com'],
      selectedPlan: 'professional',
    });

    expect(payload.organizationName).toBe('Risk Comply Europe');
    expect(payload.inviteEmails).toEqual(['legal@example.com']);
  });

  it('infers risk from onboarding answers', () => {
    expect(inferInitialRiskLevel({
      riskDomain: 'employment',
      interactsWithPeople: false,
      generatesContent: false,
      biometricIdentification: false,
      manipulativeOrExploitative: false,
    })).toBe('high_risk_review');

    expect(inferInitialRiskLevel({
      riskDomain: 'general_productivity',
      interactsWithPeople: true,
      generatesContent: false,
      biometricIdentification: false,
      manipulativeOrExploitative: false,
    })).toBe('limited_transparency');

    expect(inferInitialRiskLevel({
      riskDomain: 'general_productivity',
      interactsWithPeople: false,
      generatesContent: false,
      biometricIdentification: false,
      manipulativeOrExploitative: false,
    })).toBe('minimal_or_low');
  });

  it('suggests documents, tasks and a bounded readiness score', () => {
    const recommendedDocuments = getRecommendedDocuments({
      riskLevel: 'high_risk_review',
      usesPersonalData: true,
      interactsWithPeople: true,
      generatesContent: true,
      sector: 'fintech',
    });
    const suggestedTasks = getSuggestedTasks({
      riskLevel: 'high_risk_review',
      recommendedDocuments,
      inviteEmails: [],
    });
    const score = calculateInitialReadinessScore({
      hasOrganization: true,
      hasCountry: true,
      hasCompanyType: true,
      hasSector: true,
      hasAiUsage: true,
      hasFirstAiSystem: true,
      hasRiskClassification: true,
      recommendedDocuments,
      suggestedTasks,
      invitedEmails: [],
      selectedPlan: 'trial',
    });

    expect(recommendedDocuments.map((document) => document.id)).toContain('high-risk-classification-record');
    expect(recommendedDocuments.map((document) => document.id)).toContain('personal-data-ai-dpia-screening');
    expect(suggestedTasks[0]?.id).toBe('schedule-risk-review');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('creates stable workspace slugs', () => {
    expect(slugifyOrganization('Risck Comply Europa, Lda.')).toBe('risck-comply-europa-lda');
  });
});
