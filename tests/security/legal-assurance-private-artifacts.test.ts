import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const migration = read('supabase/migrations/20260901005000_legal_assurance_private_artifacts.sql');
const storage = read('src/server/legal-assurance/artifacts.ts');
const upload = read('src/app/api/counsel/legal-reviews/[reviewId]/artifacts/route.ts');
const download = read('src/app/api/legal-assurance/[reviewId]/artifacts/[artifactId]/download/route.ts');
const matterQuery = read('src/server/queries/legal-assurance-review.ts');

describe('Legal Assurance private signed artifacts', () => {
  it('creates a PDF-only private bucket with explicit browser-deny policies', () => {
    expect(migration).toContain("'legal-assurance-artifacts'");
    expect(migration).toContain('false,\n  5242880');
    expect(migration).toContain("array['application/pdf']");
    expect(migration).toContain('No direct legal assurance artifact reads');
    expect(migration).toContain('No direct legal assurance artifact uploads');
    expect(migration).toContain('No direct legal assurance artifact updates');
    expect(migration).toContain('No direct legal assurance artifact deletes');
  });

  it('binds a referenced signed artifact to the same matter and issuing Counsel', () => {
    expect(migration).toContain('enforce_legal_decision_artifact_reference');
    expect(migration).toContain('artifact.review_id = new.review_id');
    expect(migration).toContain('artifact.uploaded_by_counsel_id = new.counsel_id');
    expect(migration).toContain('legal_review_decision_artifact_reference_guard');
  });

  it('uploads only scanned PDFs for active verified assigned Counsel', () => {
    expect(upload).toContain('getCurrentCounselProfile(user.id)');
    expect(upload).toContain("profile.verification_status !== 'VERIFIED'");
    expect(upload).toContain('getAssignedCounselReview(profile.id, reviewId)');
    expect(upload).toContain("review.status !== 'IN_REVIEW'");
    expect(upload).toContain("validation.mimeDetected !== 'application/pdf'");
    expect(upload).toContain('scanValidatedUploadForMalware');
    expect(upload).toContain('shouldBlockUploadForMalwareScan');
    expect(upload).toContain('removeLegalCounselArtifact(artifact)');
  });

  it('keeps storage coordinates server-only and returns opaque artifact references', () => {
    expect(storage).toContain("return `legal-artifact:${artifactId}`");
    expect(storage).toContain('storage_path: storagePath');
    expect(matterQuery).not.toContain("db.from('legal_review_artifacts').select('*')");
    expect(matterQuery).toContain('artifact_reference,artifact_digest,artifact_type,issuer');
    expect(matterQuery).not.toContain("select('id,review_id,decision_id,artifact_reference,artifact_digest,artifact_type,issuer,issued_at,created_at,mime_type,size_bytes,original_filename,uploaded_by_counsel_id,storage_bucket,storage_path')");
  });

  it('authorizes the matter before privileged artifact lookup and signs for 60 seconds', () => {
    expect(download).toContain('const authority = await resolveMatterAuthority(user.id, reviewId)');
    expect(download).toContain('const artifact = await getLegalArtifactForDownload(artifactId)');
    expect(download.indexOf('resolveMatterAuthority(user.id, reviewId)')).toBeLessThan(download.indexOf('getLegalArtifactForDownload(artifactId)'));
    expect(download).toContain('artifact.review_id !== reviewId');
    expect(download).toContain('getCurrentOrganizationForUser(userId)');
    expect(download).toContain("minimumPlan: 'enterprise'");
    expect(download).toContain('getCurrentCounselProfile(userId)');
    expect(download).toContain('getAssignedCounselReview(profile.id, reviewId)');
    expect(download).toContain("policy: 'export'");
    expect(download).toContain("failureMode: 'fail-closed'");
    expect(download).toContain('createLegalArtifactSignedDownload(artifact)');
    expect(storage).toContain('LEGAL_ASSURANCE_ARTIFACT_SIGNED_URL_SECONDS = 60');
    expect(storage).toContain('.createSignedUrl(artifact.storage_path, LEGAL_ASSURANCE_ARTIFACT_SIGNED_URL_SECONDS, { download: true })');
  });
});
