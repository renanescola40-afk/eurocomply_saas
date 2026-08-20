import { describe, expect, it } from 'vitest';

import { validateExternalSecurityAssurance } from '../../scripts/security/external-security-assurance-contract.mjs';

const validateExternalSecurityAssuranceForTest = validateExternalSecurityAssurance as unknown as (
  evidence: unknown,
  options?: { enterprise?: boolean; expectedSha?: string | null; now?: Date },
) => { accepted: boolean; failures: string[] };

const expectedSha = 'a'.repeat(40);
const digest = `sha256:${'b'.repeat(64)}`;
const now = new Date('2026-08-19T18:00:00.000Z');

function completeEvidence(): Record<string, any> {
  return {
    schema: 'risck-comply.external-security-assurance.v2',
    evidenceItem: 'external-security-review-or-pentest',
    status: 'Complete',
    outcome: 'passed',
    summary: 'Independent external assessment completed for the bound release.',
    assessor: {
      providerLegalEntity: 'Independent Security Provider S.A.',
      testingDeliveryEntity: 'Independent Security Provider penetration-testing team',
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
      authorizedAt: '2026-08-10T09:00:00.000Z',
      testWindowStart: '2026-08-11T09:00:00.000Z',
      testWindowEnd: '2026-08-12T17:00:00.000Z',
    },
    testBinding: {
      productSha: expectedSha,
      deploymentId: 'deployment-production-001',
      environments: ['production-authorized'],
      hostnames: ['www.example.test'],
    },
    report: {
      reportDate: '2026-08-13T00:00:00.000Z',
      reportReference: 'private://reports/pentest-final',
      reportStorageLocation: 'private://assurance-store/pentest-final.pdf',
      reportDigest: digest,
      methodology: 'Independent authenticated web and API penetration testing.',
      executiveSummaryReference: 'private://reports/pentest-executive-summary',
    },
    scope: [
      'auth',
      'RBAC',
      'tenant isolation',
      'APIs',
      'BOLA/IDOR',
      'uploads',
      'malware scanner',
      'billing Stripe',
      'webhooks',
      'audit chain',
      'exports',
      'GDPR delete',
      'rate limiting',
      'observability',
      'secrets',
    ],
    findingsSummary: {
      critical: 0,
      high: 1,
      medium: 0,
      low: 0,
      informational: 0,
    },
    findings: [
      {
        id: 'EXT-001',
        title: 'Authorization boundary finding',
        severity: 'high',
        owner: 'Security Engineering',
        dueDate: '2026-08-12',
        mitigation: 'Authorization boundary corrected and independently retested.',
        status: 'resolved',
        retestStatus: 'passed',
        evidenceReference: 'private://findings/EXT-001',
        riskAcceptance: null,
      },
    ],
    retests: [
      {
        findingId: 'EXT-001',
        retestDate: '2026-08-13T12:00:00.000Z',
        retestStatus: 'passed',
        retestedBy: 'Named Lead Tester',
        evidenceReference: 'private://retests/EXT-001',
      },
    ],
    review: {
      reviewType: 'external_pentest',
      provider: 'Independent Security Provider S.A.',
      reportDate: '2026-08-13',
      reportReference: 'private://reports/pentest-final',
      reviewedBy: 'Authorized Security Owner',
      reviewedAt: '2026-08-14T10:00:00.000Z',
    },
    redactionConfirmation: 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.',
    evidenceIntegrity: {
      placeholderOnly: false,
      realExternalReportAttached: true,
      containsSecrets: false,
      valuesRedacted: true,
      doNotMarkCompleteUntilRealReportExists: true,
      noPentestClaimWithoutReport: true,
    },
  };
}

describe('external security assurance contract', () => {
  it('keeps Open evidence at zero enterprise credit', () => {
    const result = validateExternalSecurityAssuranceForTest(
      {
        evidenceItem: 'external-security-review-or-pentest',
        status: 'Open',
        outcome: 'not_started',
        evidenceIntegrity: {
          placeholderOnly: true,
          realExternalReportAttached: false,
        },
      },
      { enterprise: true, expectedSha, now },
    );

    expect(result.accepted).toBe(false);
    expect(result.failures).toContain('enterprise_requires_complete_external_assurance');
  });

  it('accepts only complete attributable exact-SHA external assurance evidence', () => {
    const result = validateExternalSecurityAssuranceForTest(completeEvidence(), {
      enterprise: true,
      expectedSha,
      now,
    });

    expect(result.accepted).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it('rejects Complete evidence without the canonical redaction confirmation', () => {
    const evidence = completeEvidence();
    evidence.redactionConfirmation = 'redacted';

    const result = validateExternalSecurityAssuranceForTest(evidence, {
      enterprise: true,
      expectedSha,
      now,
    });

    expect(result.accepted).toBe(false);
    expect(result.failures).toContain('redaction_confirmation_invalid');
  });

  it('rejects a report for a different release SHA', () => {
    const evidence = completeEvidence();
    evidence.testBinding.productSha = 'c'.repeat(40);

    const result = validateExternalSecurityAssuranceForTest(evidence, {
      enterprise: true,
      expectedSha,
      now,
    });

    expect(result.accepted).toBe(false);
    expect(result.failures).toContain('tested_product_sha_mismatch');
  });

  it('rejects Complete evidence without independent qualification and report integrity', () => {
    const evidence = completeEvidence();
    evidence.assessor.accreditationReference = '';
    evidence.report.reportDigest = 'not-a-sha256-digest';

    const result = validateExternalSecurityAssuranceForTest(evidence, {
      enterprise: true,
      expectedSha,
      now,
    });

    expect(result.accepted).toBe(false);
    expect(result.failures).toContain('assessor.accreditationReference_missing_or_placeholder');
    expect(result.failures).toContain('report.reportDigest_invalid');
  });

  it('rejects High/Critical closure without a matching independent retest record', () => {
    const evidence = completeEvidence();
    evidence.retests = [];

    const result = validateExternalSecurityAssuranceForTest(evidence, {
      enterprise: true,
      expectedSha,
      now,
    });

    expect(result.accepted).toBe(false);
    expect(result.failures).toContain('finding:EXT-001:retest_record_missing');
  });

  it('rejects expired formal risk acceptance for a High/Critical finding', () => {
    const evidence = completeEvidence();
    evidence.outcome = 'passed_with_formal_acceptance';
    evidence.findings[0].status = 'formally_accepted';
    evidence.findings[0].retestStatus = 'not_required_formally_accepted';
    evidence.findings[0].riskAcceptance = {
      acceptedBy: 'Authorized Risk Owner',
      acceptedAt: '2026-08-13T12:00:00.000Z',
      acceptedUntil: '2026-08-18T12:00:00.000Z',
      rationale: 'Time-bounded documented business risk acceptance.',
      customerImpact: 'Residual exposure documented for release decision.',
      compensatingControls: ['Additional monitoring and restricted exposure.'],
    };
    evidence.retests[0].retestStatus = 'not_required_formally_accepted';

    const result = validateExternalSecurityAssuranceForTest(evidence, {
      enterprise: true,
      expectedSha,
      now,
    });

    expect(result.accepted).toBe(false);
    expect(result.failures).toContain('finding:EXT-001:risk_acceptance_expired_or_invalid');
  });
});
