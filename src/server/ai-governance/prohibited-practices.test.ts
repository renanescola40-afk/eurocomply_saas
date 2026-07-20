import { describe, expect, it } from 'vitest';

import {
  PROHIBITED_PRACTICE_SIGNALS,
  assessProhibitedPractices,
} from './prohibited-practices';

describe('EU AI Act prohibited-practices assessment', () => {
  it('fails closed when answers are missing', () => {
    const result = assessProhibitedPractices({});

    expect(result.disposition).toBe('review_required');
    expect(result.legalReviewRequired).toBe(true);
    expect(result.blockProductionUse).toBe(false);
    expect(result.unknownSignals).toEqual(PROHIBITED_PRACTICE_SIGNALS);
    expect(result.requiredActions).toContain(
      'Resolve every unknown prohibited-practice answer before treating the assessment as complete.',
    );
  });

  it('blocks rollout when any Article 5 signal is positive', () => {
    const result = assessProhibitedPractices({
      subliminal_manipulation: false,
      vulnerability_exploitation: false,
      social_scoring: true,
      criminal_risk_prediction: false,
      untargeted_facial_scraping: false,
      emotion_inference_workplace_education: false,
      biometric_categorisation_sensitive_traits: false,
      real_time_remote_biometric_public_space: false,
    });

    expect(result.disposition).toBe('blocked_pending_legal_review');
    expect(result.blockProductionUse).toBe(true);
    expect(result.legalReviewRequired).toBe(true);
    expect(result.positiveSignals).toEqual(['social_scoring']);
    expect(result.unknownSignals).toEqual([]);
    expect(result.requiredActions).toEqual(expect.arrayContaining([
      'Block production rollout and new processing until accountable legal/compliance approval is recorded.',
      'Open a prohibited-practice review with an accountable owner and decision deadline.',
      'Collect scoring methodology for Article 5(1)(c).',
    ]));
  });

  it('returns clear only when every signal is explicitly negative', () => {
    const answers = Object.fromEntries(PROHIBITED_PRACTICE_SIGNALS.map((signal) => [signal, 'no'])) as Record<
      (typeof PROHIBITED_PRACTICE_SIGNALS)[number],
      'no'
    >;
    const result = assessProhibitedPractices(answers);

    expect(result.disposition).toBe('clear');
    expect(result.blockProductionUse).toBe(false);
    expect(result.legalReviewRequired).toBe(false);
    expect(result.positiveSignals).toEqual([]);
    expect(result.unknownSignals).toEqual([]);
    expect(result.requiredActions).toEqual([]);
    expect(result.evidenceBoundary).toContain('not a legal determination');
  });

  it('normalizes booleans and explicit tri-state answers deterministically', () => {
    const result = assessProhibitedPractices({
      subliminal_manipulation: 'no',
      vulnerability_exploitation: false,
      social_scoring: 'unknown',
      criminal_risk_prediction: null,
      untargeted_facial_scraping: 'yes',
      emotion_inference_workplace_education: false,
      biometric_categorisation_sensitive_traits: 'no',
      real_time_remote_biometric_public_space: false,
    });

    expect(result.positiveSignals).toEqual(['untargeted_facial_scraping']);
    expect(result.unknownSignals).toEqual(['social_scoring', 'criminal_risk_prediction']);
    expect(result.findings).toHaveLength(8);
    expect(result.findings.every((finding) => finding.articleReference.startsWith('Article 5'))).toBe(true);
  });
});
