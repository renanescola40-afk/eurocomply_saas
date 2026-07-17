import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/ai-literacy/route.ts';
const route = readFileSync(routePath, 'utf8');

describe('AI literacy API contract', () => {
  it('requires authentication, organization scope and explicit permissions', () => {
    expect(route).toContain('requireApiUser()');
    expect(route).toContain('getCurrentOrganizationForUser(user.id)');
    expect(route).toContain("permission: 'read_ai_governance'");
    expect(route).toContain("permission: 'manage_ai_governance'");
    expect(route).toContain('permissionDeniedResponse(permission)');
  });

  it('protects writes with trusted origin, bounded JSON and distributed rate limiting', () => {
    expect(route).toContain('assertTrustedOrigin(request)');
    expect(route).toContain('AI_LITERACY_JSON_MAX_BYTES = 64 * 1024');
    expect(route).toContain('parseJsonBodyWithZod(request');
    expect(route).toContain('checkDistributedRateLimit({');
    expect(route).toContain('ai-literacy:${workflow}:${organization.id}:${user.id}');
  });

  it('uses no-store responses and safe error handling', () => {
    expect(route).toContain('noStoreJson(');
    expect(route).toContain('secureApiError(error)');
    expect(route).not.toContain('error.message');
    expect(route).not.toContain('JSON.stringify(error)');
  });

  it('requires durable audit persistence and tenant-scoped compensation for creates', () => {
    expect(route).toContain('if (audit.persisted) return null;');
    expect(route).toContain('rollbackAiLiteracyCreate(input.table, input.organizationId, input.entityId)');
    expect(route).toContain("error: 'ai_literacy_audit_unavailable'");
    expect(route).toContain("status: 503");
  });

  it('compensates activation, publishing, completion and review transitions when audit is unavailable', () => {
    expect(route).toContain('restoreAiLiteracyProgram(before)');
    expect(route).toContain('restoreAiLiteracyCourse(before)');
    expect(route).toContain('restoreAiLiteracyAssignment(before)');
    expect(route).toContain('restoreAiLiteracyEvidence(reviewed.before)');
  });

  it('enforces a published-course lifecycle and independent evidence review', () => {
    expect(route).toContain('getPublishedAiLiteracyCourse(organization.id, body.courseId)');
    expect(route).toContain("error: 'published_ai_literacy_course_required'");
    expect(route).toContain('reviewerUserId: user.id');
    expect(route).toContain("error: 'ai_literacy_evidence_review_not_allowed'");
  });

  it('rejects unsafe or cross-tenant evidence storage paths', () => {
    expect(route).toContain("value.storagePath?.split('/').includes('..')");
    expect(route).toContain('body.storagePath.startsWith(`${organization.id}/`)');
    expect(route).toContain("error: 'ai_literacy_storage_path_scope_invalid'");
  });
});
