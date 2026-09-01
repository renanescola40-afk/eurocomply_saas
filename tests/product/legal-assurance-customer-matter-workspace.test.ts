import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const hub = read('src/app/[locale]/dashboard/legal-assurance/page.tsx');
const workspace = read('src/app/[locale]/dashboard/legal-assurance/[reviewId]/page.tsx');
const route = read('src/app/api/legal-assurance/[reviewId]/route.ts');

describe('Legal Assurance customer matter workspace', () => {
  it('links customer reviews to the tenant-scoped matter workspace', () => {
    expect(hub).toContain('`/${locale}/dashboard/legal-assurance/${review.id}`');
    expect(hub).toContain("fetch('/api/legal-assurance'");
  });

  it('exposes the full owner-controlled customer lifecycle through one matter endpoint', () => {
    expect(workspace).toContain('/api/legal-assurance/${encodeURIComponent(reviewId)}');
    expect(workspace).toContain("action: 'PREPARE_PACKAGE'");
    expect(workspace).toContain("action: 'PROVIDE_INFORMATION'");
    expect(workspace).toContain("action: 'UPDATE_REMEDIATION'");
    expect(workspace).toContain("action: 'RESUBMIT'");
  });

  it('does not let the browser choose tenant, law firm or Counsel authority', () => {
    expect(workspace).not.toMatch(/organizationId\s*:/);
    expect(workspace).not.toMatch(/organization_id\s*:/);
    expect(workspace).not.toContain('lawFirmId:');
    expect(workspace).not.toContain('counselProfileId:');
  });

  it('derives customer authority and package evidence server-side', () => {
    expect(route).toContain('getCurrentOrganizationForUser(userId)');
    expect(route).toContain('getLegalReviewForOrganization(auth.organization.id, reviewId)');
    expect(route).toContain('buildLegalReviewPackage');
    expect(route).toContain('getLatestFinalizedLegalReviewPackage(review.id)');
    expect(route).toContain('createLegalReviewPackageAtomic');
  });
});
