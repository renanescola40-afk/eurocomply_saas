import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const inbox = read('src/app/[locale]/counsel/page.tsx');
const cockpit = read('src/app/[locale]/counsel/[reviewId]/page.tsx');
const route = read('src/app/api/counsel/legal-reviews/[reviewId]/route.ts');

describe('Legal Assurance Counsel cockpit', () => {
  it('opens only the assigned review path from the Counsel inbox', () => {
    expect(inbox).toContain('`/${locale}/counsel/${review.id}`');
    expect(inbox).toContain("review.status === 'CONFLICT_CHECK_PENDING'");
    expect(inbox).toContain("review.status === 'ENGAGEMENT_PENDING'");
  });

  it('uses the matter-scoped Counsel API for review actions without browser-supplied tenant authority', () => {
    expect(cockpit).toContain('/api/counsel/legal-reviews/${encodeURIComponent(reviewId)}');
    expect(cockpit).toContain("action: 'START_REVIEW'");
    expect(cockpit).toContain("action: 'REQUEST_INFORMATION'");
    expect(cockpit).toContain("action: 'ISSUE_DECISION'");
    expect(cockpit).toContain("decision === 'REMEDIATION_REQUIRED'");

    const actionStart = cockpit.indexOf('async function action');
    const actionEnd = cockpit.indexOf('async function requestInformation');
    expect(actionStart).toBeGreaterThanOrEqual(0);
    expect(actionEnd).toBeGreaterThan(actionStart);
    const mutationPayload = cockpit.slice(actionStart, actionEnd);

    expect(mutationPayload).toContain('body: JSON.stringify({ ...body, expectedUpdatedAt: review.updated_at })');
    expect(mutationPayload).not.toMatch(/organizationId\s*:/);
    expect(mutationPayload).not.toMatch(/organization_id\s*:/);
    expect(mutationPayload).not.toContain('lawFirmId:');
    expect(mutationPayload).not.toContain('counselProfileId:');
  });

  it('keeps professional decision authority server-side and package-bound', () => {
    expect(route).toContain('const matter = await getReviewerSession(user.id, reviewId)');
    expect(route).toContain('getCurrentCounselProfile(userId)');
    expect(route).toContain('getAssignedCounselReview(profile.id, reviewId)');
    expect(route).toContain("profile.verification_status !== 'VERIFIED'");
    expect(route).toContain('getLatestFinalizedLegalReviewPackage(matter.review.id)');
    expect(route).toContain('issueLegalReviewDecisionAtomic');
    expect(route).toContain('decisionDigest');
    expect(route).toContain("signedArtifactReference: body.signedArtifactReference ?? null");
  });
});
