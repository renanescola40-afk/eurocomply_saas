import { describe, expect, it } from 'vitest';
import { buildExecutiveEvidenceSummary, evaluateDocumentTransition } from './document-lifecycle';

describe('enterprise document lifecycle', () => {
  it('requires independent approval', () => {
    expect(evaluateDocumentTransition({ currentState: 'in_review', nextState: 'approved', ownerId: 'a', actorId: 'a', approverId: 'a', reviewDecision: 'approved' })).toMatchObject({ allowed: false, reasons: ['separation_of_duties_required'] });
  });

  it('fails closed when publication integrity is missing', () => {
    expect(evaluateDocumentTransition({ currentState: 'approved', nextState: 'published', ownerId: 'a', actorId: 'b' }).allowed).toBe(false);
  });

  it('allows integrity-backed publication', () => {
    expect(evaluateDocumentTransition({ currentState: 'approved', nextState: 'published', ownerId: 'a', actorId: 'b', digestSha256: 'a'.repeat(64), storagePath: 'private/org/report.pdf' })).toMatchObject({ allowed: true, productionVisible: true });
  });

  it('blocks release summary on overdue review or failed export', () => {
    expect(buildExecutiveEvidenceSummary({ totalDocuments: 2, approvedDocuments: 1, publishedDocuments: 1, overdueReviews: 1, failedExports: 0 }).releaseReady).toBe(false);
  });
});