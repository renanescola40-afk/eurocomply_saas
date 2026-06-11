import { describe, expect, it } from 'vitest';
import {
  calculateSecurityQuestionnaireScore,
  getSecurityQuestionnaireStatus,
  getSecurityQuestionnaireSummary,
  type SecurityQuestionnaireItem,
} from './security-questionnaire';

const item: SecurityQuestionnaireItem = {
  id: 'example',
  category: 'company',
  question: 'Example question?',
  answer: 'Example answer.',
  evidenceRefs: ['Example evidence'],
  readiness: 'ready',
};

describe('security questionnaire', () => {
  it('returns enterprise-ready status when all answers are ready', () => {
    const items: SecurityQuestionnaireItem[] = [
      { ...item, readiness: 'ready' },
      { ...item, id: 'access', category: 'access_control', readiness: 'ready' },
    ];

    const score = calculateSecurityQuestionnaireScore(items);

    expect(score).toBe(100);
    expect(getSecurityQuestionnaireStatus(score)).toBe('enterprise_ready');
  });

  it('summarises partial and missing questionnaire inputs', () => {
    const items: SecurityQuestionnaireItem[] = [
      { ...item, readiness: 'ready' },
      { ...item, id: 'partial', category: 'monitoring', readiness: 'partial' },
      { ...item, id: 'input', category: 'compliance', readiness: 'needs_input' },
    ];

    const summary = getSecurityQuestionnaireSummary(items);

    expect(summary.totalItems).toBe(3);
    expect(summary.readyItems).toBe(1);
    expect(summary.partialItems).toBe(1);
    expect(summary.needsInputItems).toBe(1);
    expect(summary.nextActions.length).toBeGreaterThan(0);
  });

  it('uses foundation status when no items exist', () => {
    expect(calculateSecurityQuestionnaireScore([])).toBe(0);
    expect(getSecurityQuestionnaireSummary([]).status).toBe('foundation');
  });
});
