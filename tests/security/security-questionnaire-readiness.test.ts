import { describe, expect, it } from 'vitest';
import {
  calculateSecurityQuestionnaireScore,
  SECURITY_QUESTIONNAIRE_ITEMS,
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

  it('limits the RBAC buyer answer to adopted roles rather than all routes', () => {
    const rbac = SECURITY_QUESTIONNAIRE_ITEMS.find((item) => item.id === 'rbac');
    expect(rbac?.readiness).toBe('partial');
    expect(rbac?.answer).toContain('owner/admin/member');
    expect(rbac?.answer).toContain('editor/viewer');
    expect(rbac?.answer).toContain('legacy paths');
    expect(rbac?.answer).toContain('not claimed');
  });

  it('states SSO and MFA activation limits without disguising implemented controls as roadmap', () => {
    const identity = SECURITY_QUESTIONNAIRE_ITEMS.find((item) => item.id === 'sso-mfa');
    expect(identity?.readiness).toBe('needs_input');
    expect(identity?.answer).toContain('SAML SSO runtime components are implemented');
    expect(identity?.answer).toContain('buyer-specific IdP/domain configuration');
    expect(identity?.answer).toContain('verified end-to-end login');
    expect(identity?.answer).toContain('Step-up MFA/AAL2');
    expect(identity?.answer).toContain('not enabled for every tenant by default');
    expect(identity?.answer).not.toContain('roadmap items');
  });

  it('preserves the foundation status for incomplete draft responses', () => {
    expect(getSecurityQuestionnaireStatus(0)).toBe('foundation');
    expect(getSecurityQuestionnaireStatus(59)).toBe('foundation');
    expect(getSecurityQuestionnaireStatus(60)).toBe('review_ready');
  });
});
