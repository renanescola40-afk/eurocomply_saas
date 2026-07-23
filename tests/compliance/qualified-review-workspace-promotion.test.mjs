import { describe, expect, it } from 'vitest';
import { buildAcceptedDocuments, validateWorkspaceExport } from '../../scripts/compliance/promote-qualified-review-workspace.mjs';

const SHA = 'a'.repeat(40);
const ids = ['legal-rules','prohibited-practices','article-50-copy','fria-methodology','deployer-obligations','high-risk-provider','conformity','gpai'];

function payload() {
  return {
    schema: 'risck-comply.qualified-review-workspace-export.v1',
    reviews: ids.map((requirementId) => ({
      requirementId, reviewedSha: SHA, status: 'APPROVED',
      reviewer: { name: 'Qualified Reviewer', organization: 'Independent Review Ltd', contact: 'reviewer@example.com' },
      qualification: { title: 'Qualified specialist', jurisdictionOrDiscipline: 'EU AI Act', evidence: ['roster://reviewer'] },
      independence: { conflictChecked: true, conflictFound: false, statement: 'The reviewer completed the conflict assessment and identified no conflict.' },
      evidenceDigest: `sha256:${'b'.repeat(64)}`,
      reviewedAt: '2026-07-23T12:00:00.000Z', validUntil: '2027-07-23T12:00:00.000Z', limitations: [],
    })),
  };
}

describe('qualified review workspace promotion', () => {
  it('builds eight accepted exact-SHA evidence documents', () => {
    const result = buildAcceptedDocuments(payload(), SHA, Date.parse('2026-07-24T00:00:00Z'));
    expect(result.failures).toEqual([]);
    expect(Object.keys(result.documents)).toHaveLength(8);
    expect(Object.values(result.documents).every((document) => document.reviewedSha === SHA)).toBe(true);
  });

  it('rejects duplicate, stale, conflicted and expired reviews', () => {
    const input = payload();
    input.reviews.push({ ...input.reviews[0] });
    input.reviews[1].reviewedSha = 'c'.repeat(40);
    input.reviews[2].independence.conflictFound = true;
    input.reviews[3].validUntil = '2026-01-01T00:00:00.000Z';
    const failures = validateWorkspaceExport(input, SHA, Date.parse('2026-07-24T00:00:00Z'));
    expect(failures.some((failure) => failure.startsWith('duplicate_requirement'))).toBe(true);
    expect(failures).toContain('sha_mismatch:prohibited-practices');
    expect(failures).toContain('independence_invalid:article-50-copy');
    expect(failures).toContain('expired:fria-methodology');
  });
});
