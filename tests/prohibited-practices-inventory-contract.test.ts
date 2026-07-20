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
    expect(result.classification.nextActions).toContain(
      'Block production rollout and new processing until accountable legal/compliance approval is recorded.',
    );
  });

  it('does not silently mark an incomplete Article 5 questionnaire as clear', () => {
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
    expect(result.decisionMetadata.legalReviewRequired).toBe(true);
    expect(result.decisionMetadata.reasons).toContain('article_5_unknown:subliminal_manipulation');
  });
});
