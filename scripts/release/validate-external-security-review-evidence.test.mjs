import { describe, expect, it } from 'vitest';
import { validateExternalSecurityReviewEvidence } from './validate-external-security-review-evidence.mjs';

const now = new Date('2026-07-11T18:00:00Z');
const expectedSha = 'a'.repeat(40);
const digest = `sha256:${'b'.repeat(64)}`;

function completeEvidence(overrides = {}) {
  return {
    schema: 'risck-comply.external-security-assurance.v2',
    evidenceItem: 'external-security-review-or-pentest',
    status: 'Complete',
    outcome: 'passed',
    summary: 'Independent external assessment completed for the exact release.',
    assessor: {
      providerLegalEntity: 'Independent Security Labs S.A.',
      testingDeliveryEntity: 'Independent Security Labs penetration-testing team',
      qualificationBasis: 'Independent application and API penetration-testing competence.',
      accreditationReference: 'private://qualification/provider-reference',
      leadTester: 'Named Lead Tester',
      independenceDeclaration: 'Independent assessment with no implementation ownership.',
      conflictAssessment: 'No disqualifying conflict identified for the engagement.',
    },
    authorization: {
      rulesOfEngagementReference: 'private://engagement/roe',
      ndaReference: 'private://engagement/nda',
      authorizedBy: 'Authorized Security Owner',
      authorizedAt: '2026-07-08T09:00:00Z',
      testWindowStart: '2026-07-09T09:00:00Z',
      testWindowEnd: '2026-07-10T17:00:00Z',
    },
    testBinding: {
      productSha: expectedSha,
      deploymentId: 'deployment-production-001',
      environments: ['production-authorized'],
      hostnames: ['www.example.test'],
    },
    report: {
      reportDate: '2026-07-10T12:00:00Z',
      reportReference: 'private-evidence://pentest/report-2026-07',
      reportStorageLocation: 'private://approved-private-store/pentest-report.pdf',
      reportDigest: digest,
      methodology: 'OWASP ASVS and API Security Top 10',
      executiveSummaryReference: 'private://pentest/executive-summary',
    },
    scope: ['auth','RBAC','tenant isolation','APIs','BOLA/IDOR','uploads','malware scanner','billing Stripe','webhooks','audit chain','exports','GDPR delete','rate limiting','observability','secrets'],
    findingsSummary: { critical: 0, high: 0, medium: 1, low: 2, informational: 1 },
    findings: [
      { id: 'MED-001', severity: 'medium', owner: 'Security', dueDate: '2026-08-01', mitigation: 'Tracked remediation.', status: 'open', retestStatus: 'not_required', evidenceReference: 'private://findings/MED-001' },
      { id: 'LOW-001', severity: 'low', owner: 'Security', dueDate: '2026-08-15', mitigation: 'Tracked remediation.', status: 'open', retestStatus: 'not_required', evidenceReference: 'private://findings/LOW-001' },
      { id: 'LOW-002', severity: 'low', owner: 'Security', dueDate: '2026-08-15', mitigation: 'Tracked remediation.', status: 'open', retestStatus: 'not_required', evidenceReference: 'private://findings/LOW-002' },
      { id: 'INFO-001', severity: 'informational', owner: 'Security', dueDate: '2026-09-01', mitigation: 'Informational follow-up.', status: 'open', retestStatus: 'not_required', evidenceReference: 'private://findings/INFO-001' },
    ],
    retests: [],
    review: {
      reviewType: 'external_pentest',
      provider: 'Independent Security Labs S.A.',
      reportDate: '2026-07-10',
      reportReference: 'private-evidence://pentest/report-2026-07',
      reviewedBy: 'Authorized Security Owner',
      reviewedAt: '2026-07-11T10:00:00Z',
    },
    redactionConfirmation: 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.',
    evidenceIntegrity: {
      realExternalReportAttached: true,
      placeholderOnly: false,
      containsSecrets: false,
      valuesRedacted: true,
      noPentestClaimWithoutReport: true,
    },
    ...overrides,
  };
}

function validate(evidence, options = {}) {
  return validateExternalSecurityReviewEvidence(evidence, {
    now,
    expectedCommitSha: expectedSha,
    ...options,
  });
}

describe('validateExternalSecurityReviewEvidence', () => {
  it('accepts fresh real exact-SHA external review evidence', () => {
    expect(validate(completeEvidence())).toEqual([]);
  });

  it('rejects a different tested SHA', () => {
    const evidence = completeEvidence();
    evidence.testBinding.productSha = 'c'.repeat(40);
    expect(validate(evidence)).toContain('tested_product_sha_mismatch');
  });

  it('rejects stale reports after the canonical evidence contract passes', () => {
    const evidence = completeEvidence();
    evidence.report.reportDate = '2025-01-01T00:00:00Z';
    evidence.review.reportDate = '2025-01-01';
    expect(validate(evidence)).toContain('external review is older than 180 days');
  });

  it('rejects unresolved high findings without independent retest closure', () => {
    const evidence = completeEvidence();
    evidence.findingsSummary = { critical: 0, high: 1, medium: 0, low: 0, informational: 0 };
    evidence.findings = [
      { id: 'HIGH-001', severity: 'high', owner: 'Security', dueDate: '2026-07-10', mitigation: 'Pending remediation.', status: 'open', retestStatus: 'pending', evidenceReference: 'private://findings/HIGH-001' },
    ];
    expect(validate(evidence)).toContain('finding:HIGH-001:high_critical_not_closed');
  });

  it('rejects a High finding marked resolved without its matching retest record', () => {
    const evidence = completeEvidence();
    evidence.findingsSummary = { critical: 0, high: 1, medium: 0, low: 0, informational: 0 };
    evidence.findings = [
      { id: 'HIGH-001', severity: 'high', owner: 'Security', dueDate: '2026-07-10', mitigation: 'Remediated.', status: 'resolved', retestStatus: 'passed', evidenceReference: 'private://findings/HIGH-001' },
    ];
    expect(validate(evidence)).toContain('finding:HIGH-001:retest_record_missing');
  });

  it('rejects expired formal High/Critical risk acceptance', () => {
    const evidence = completeEvidence({ outcome: 'passed_with_formal_acceptance' });
    evidence.findingsSummary = { critical: 0, high: 1, medium: 0, low: 0, informational: 0 };
    evidence.findings = [
      {
        id: 'HIGH-001', severity: 'high', owner: 'Security', dueDate: '2026-07-10', mitigation: 'Compensating control retained.',
        status: 'formally_accepted', retestStatus: 'not_required_formally_accepted', evidenceReference: 'private://findings/HIGH-001',
        riskAcceptance: {
          acceptedBy: 'CISO', acceptedAt: '2026-07-09T12:00:00Z', acceptedUntil: '2026-07-10T12:00:00Z',
          rationale: 'Time-bounded residual risk acceptance.', customerImpact: 'Residual exposure documented.', compensatingControls: ['Additional monitoring'],
        },
      },
    ];
    evidence.retests = [
      { findingId: 'HIGH-001', retestDate: '2026-07-10T13:00:00Z', retestStatus: 'not_required_formally_accepted', retestedBy: 'Named Lead Tester', evidenceReference: 'private://retests/HIGH-001' },
    ];
    expect(validate(evidence)).toContain('finding:HIGH-001:risk_acceptance_expired_or_invalid');
  });

  it('rejects invalid canonical redaction confirmation', () => {
    expect(validate(completeEvidence({ redactionConfirmation: 'redacted' })))
      .toContain('redaction_confirmation_invalid');
  });
});
