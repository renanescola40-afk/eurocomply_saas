import { describe, expect, it } from 'vitest';
import {
  calculateSecurityQuestionnaireScore,
  getSecurityQuestionnaireStatus,
  getSecurityQuestionnaireSummary,
  type SecurityQuestionnaireItem,
} from '../../src/server/governance/security-questionnaire';

const allDraftAnswersReady: SecurityQuestionnaireItem[] = [
  {
    id: 'draft-only',
    category: 'compliance',
    question: 'Has an independent authority accepted all controls?',
    answer: 'This is only an unverified questionnaire answer.',
    evidenceRefs: ['Unreviewed draft'],
    readiness: 'ready',
  },
];

describe('security questionnaire assurance boundary', () => {
  it('does not convert a 100% draft-answer score into enterprise acceptance', () => {
    expect(calculateSecurityQuestionnaireScore(allDraftAnswersReady)).toBe(100);
    const summary = getSecurityQuestionnaireSummary(allDraftAnswersReady);
    expect(summary.score).toBe(100);
    expect(summary.readyItems).toBe(1);
    expect(summary.status).toBe('review_ready');
    expect(summary.status).not.toBe('enterprise_ready');
  });

  it('caps even high self-reported scores at review-ready', () => {
    expect(getSecurityQuestionnaireStatus(88)).toBe('review_ready');
    expect(getSecurityQuestionnaireStatus(100)).toBe('review_ready');
  });

  it('preserves the foundation status for incomplete draft responses', () => {
    expect(getSecurityQuestionnaireStatus(0)).toBe('foundation');
    expect(getSecurityQuestionnaireStatus(59)).toBe('foundation');
    expect(getSecurityQuestionnaireStatus(60)).toBe('review_ready');
  });
});
