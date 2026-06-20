import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(join(process.cwd(), 'src/app/api/retention-center/export/route.ts'), 'utf8');

describe('retention center export route security contract', () => {
  it('uses central API guards for identity, RBAC, and sanitized errors', () => {
    expect(routeSource).toContain('requireApiUser');
    expect(routeSource).toContain('requirePermission');
    expect(routeSource).toContain('secureApiError');
  });

  it('keeps export-specific enterprise controls', () => {
    expect(routeSource).toContain("permission: 'export_data'");
    expect(routeSource).toContain("assertPlanAtLeast(organization.id, 'business')");
    expect(routeSource).toContain('requireStepUpForRequest');
    expect(routeSource).toContain('checkDistributedRateLimit');
    expect(routeSource).toContain('buildEvidencePackIntegrity');
    expect(routeSource).toContain('retention_policy.exported');
  });

  it('keeps no-store download behavior and filename sanitization', () => {
    expect(routeSource).toContain('noStoreDownload');
    expect(routeSource).toContain('sanitizeDocumentDownloadFileName');
    expect(routeSource).toContain('X-Content-Type-Options');
  });
});
