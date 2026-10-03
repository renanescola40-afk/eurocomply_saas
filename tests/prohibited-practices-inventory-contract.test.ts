import { describe, expect, it } from 'vitest';

import { classifyParsedAiSystemBody } from '@/server/ai-governance/system-payload';

describe('AI inventory prohibited-practices contract', () => {
  it('promotes a detailed Article 5 signal into a blocking canonical decision', () => {
    const result = classifyParsedAiSystemBody({
      name: 'Candidate scoring system',
      useCase: 'Score applicants for access to essential services',
      role: 'deployer',
      lifecycleStatus: 'pilot',
      riskDomain: 'essential_services',
      usesPersonalData: true,
      processedData: 'Applicant identity and eligibility data',
      interactsWithPeople: false,
      generatesContent: false,
      biometricIdentification: false,
      manipulativeOrExploitative: false,
      prohibitedPractices: {
        subliminal_manipulation: 'no',
        vulnerability_exploitation: 'no',
        social_scoring: 'yes',
        criminal_risk_prediction: 'no',
        untargeted_facial_scraping: 'no',
        emotion_inference_workplace_education: 'no',
        biometric_categorisation_sensitive_traits: 'no',
        real_time_remote_biometric_public_space: 'no',
      },
    });

    expect(result.classification.riskLevel).toBe('prohibited_review');
    expect(result.decisionMetadata.decision).toBe('block_and_escalate');
    expect(result.decisionMetadata.legalReviewRequired).toBe(true);
    expect(result.decisionMetadata.reasons).toContain('article_5_positive:social_scoring');
    expect(result.prohibitedPracticeAssessment.blockProductionUse).toBe(true);
    expect(result.prohibitedPracticeAssessment.requiredActions).toContain(
      'Collect scoring methodology for Article 5(1)(c).',
    );
    expect(result.classification.nextActions).toContain(
      'Complete the Article 5 prohibited-practice review before production use.',
    );
    expect(result.classification.nextActions.some((action) => action.startsWith('Collect '))).toBe(false);
  });

  it('keeps incomplete Article 5 screening fail-closed without flooding ordinary next actions', () => {
    const result = classifyParsedAiSystemBody({
      name: 'Internal assistant',
      useCase: 'Internal employee productivity assistant',
      role: 'deployer',
      riskDomain: 'general_productivity',
      prohibitedPractices: {
        social_scoring: 'no',
      },
    });

    expect(result.prohibitedPracticeAssessment.disposition).toBe('review_required');
    expect(result.prohibitedPracticeAssessment.unknownSignals.length).toBe(7);
    expect(result.prohibitedPracticeAssessment.requiredActions.length).toBeGreaterThan(20);
    expect(result.decisionMetadata.legalReviewRequired).toBe(true);
    expect(result.decisionMetadata.reasons).toContain('article_5_unknown:subliminal_manipulation');
    expect(result.classification.nextActions).toContain(
      'Complete the Article 5 prohibited-practice screening: 7 signal(s) remain unresolved.',
    );
    expect(result.classification.nextActions.length).toBeLessThan(10);
  });

  it('promotes explicit recruitment context to the employment review domain', () => {
    const result = classifyParsedAiSystemBody({
      name: 'QA - Assistente de RH',
      category: 'Recrutamento / RH',
      useCase: 'Ajudar a equipa de RH a resumir currículos e preparar perguntas para entrevistas',
      role: 'deployer',
      lifecycleStatus: 'pilot',
      riskDomain: 'general_productivity',
      usesPersonalData: true,
      processedData: 'Nome, CV, experiência profissional e competências',
      generatesContent: true,
    });

    expect(result.riskDomain).toBe('employment');
    expect(result.classification.riskLevel).toBe('high_risk_review');
    expect(result.decisionMetadata.reasons).toContain('annex_domain_signal');
  });

  it('does not promote generic HR productivity work without candidate-selection purpose', () => {
    const result = classifyParsedAiSystemBody({
      name: 'HR policy assistant',
      category: 'Recursos Humanos',
      useCase: 'Resumir políticas internas e responder dúvidas gerais da equipa',
      role: 'deployer',
      lifecycleStatus: 'pilot',
      riskDomain: 'general_productivity',
    });

    expect(result.riskDomain).toBe('general_productivity');
    expect(result.classification.riskLevel).not.toBe('high_risk_review');
  });
});
