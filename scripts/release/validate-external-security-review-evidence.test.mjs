import { describe, expect, it } from 'vitest';
import { validateExternalSecurityReviewEvidence } from './validate-external-security-review-evidence.mjs';

const now = new Date('2026-07-11T18:00:00Z');
function completeEvidence(overrides = {}) {
  return {
    evidenceItem: 'external-security-review-or-pentest', status: 'Complete', outcome: 'passed',
    vendor: 'Independent Security Labs', date: '2026-07-10T12:00:00Z',
    reportReference: 'private-evidence://pentest/report-2026-07', reportStorageLocation: 'approved-private-store',
    methodology: 'OWASP ASVS and API Security Top 10',
    scope: ['auth','RBAC','tenant isolation','APIs','BOLA/IDOR','uploads','malware scanner','billing Stripe','webhooks','audit chain','exports','GDPR delete','rate limiting','observability','secrets'],
    findingsSummary: { critical: 0, high: 0, medium: 1, low: 2, informational: 1 },
    findings: [], criticalFindings: [], highFindings: [], riskAcceptances: [], acceptedRiskRecords: [], resolutionStatus: 'complete',
    evidenceIntegrity: { realExternalReportAttached: true, placeholderOnly: false, containsSecrets: false, valuesRedacted: true, noPentestClaimWithoutReport: true },
    ...overrides,
  };
}

describe('validateExternalSecurityReviewEvidence', () => {
  it('accepts fresh real external review evidence', () => {
    expect(validateExternalSecurityReviewEvidence(completeEvidence(), { now })).toEqual([]);
  });
  it('rejects placeholder vendor data', () => {
    expect(validateExternalSecurityReviewEvidence(completeEvidence({ vendor: '__OPEN_UNTIL_REAL_EXTERNAL_REPORT__' }), { now }))
      .toContain('vendor must contain real reviewed evidence');
  });
  it('rejects stale reports', () => {
    expect(validateExternalSecurityReviewEvidence(completeEvidence({ date: '2025-01-01T00:00:00Z' }), { now }))
      .toContain('external review is older than 180 days');
  });
  it('rejects unresolved high findings in the generic findings array', () => {
    const evidence = completeEvidence({ findingsSummary: { critical: 0, high: 1 } });
    evidence.findings = [{ severity: 'high', status: 'open' }];
    expect(validateExternalSecurityReviewEvidence(evidence, { now }))
      .toContain('all critical and high findings must be resolved, accepted, or false positive');
  });
  it('rejects unresolved findings in the documented highFindings array', () => {
    const evidence = completeEvidence({
      findingsSummary: { critical: 0, high: 1 },
      highFindings: [{ id: 'EC-PT-002', status: 'open' }],
    });
    expect(validateExternalSecurityReviewEvidence(evidence, { now }))
      .toContain('all critical and high findings must be resolved, accepted, or false positive');
  });
  it('rejects unresolved findings in the documented criticalFindings array', () => {
    const evidence = completeEvidence({
      findingsSummary: { critical: 1, high: 0 },
      criticalFindings: [{ id: 'EC-PT-001', status: 'in progress' }],
    });
    expect(validateExternalSecurityReviewEvidence(evidence, { now }))
      .toContain('all critical and high findings must be resolved, accepted, or false positive');
  });
  it('rejects expired risk acceptance', () => {
    const evidence = completeEvidence();
    evidence.riskAcceptances = [{ approver: 'CISO', rationale: 'temporary', expiry: '2026-07-10T00:00:00Z', customerImpact: 'none', compensatingControls: ['WAF'] }];
    expect(validateExternalSecurityReviewEvidence(evidence, { now })).toContain('risk acceptance has expired');
  });
  it('rejects expired acceptedRiskRecords using the documented acceptedUntil field', () => {
    const evidence = completeEvidence();
    evidence.acceptedRiskRecords = [{ acceptedBy: 'CISO', rationale: 'temporary', acceptedUntil: '2026-07-10T00:00:00Z', customerImpact: 'none', compensatingControls: ['WAF'] }];
    expect(validateExternalSecurityReviewEvidence(evidence, { now })).toContain('risk acceptance has expired');
  });
});
