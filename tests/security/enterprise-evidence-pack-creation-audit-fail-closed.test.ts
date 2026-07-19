import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const routePath = path.join(process.cwd(), 'src/app/api/ai-systems/route.ts');
const source = fs.readFileSync(routePath, 'utf8');
const postStart = source.indexOf('export async function POST');
const evidencePackStart = source.indexOf("if (workflow === 'evidence_pack')", postStart);
const vendorDiligenceStart = source.indexOf(
  "if (workflow === 'vendor_due_diligence')",
  evidencePackStart + 1,
);

if (postStart < 0 || evidencePackStart < 0 || vendorDiligenceStart < 0) {
  throw new Error('enterprise_evidence_pack_workflow_boundary_not_found');
}

const evidencePackBranch = source.slice(evidencePackStart, vendorDiligenceStart);

describe('enterprise evidence pack creation audit boundary', () => {
  it('requires durable audit persistence before returning HTTP 201', () => {
    expect(evidencePackBranch).toContain('const audit = await createAuditEvent({');
    expect(evidencePackBranch).toContain("action: 'enterprise_evidence_pack_created'");
    expect(evidencePackBranch).toContain('if (!audit.persisted)');
    expect(evidencePackBranch.indexOf('if (!audit.persisted)')).toBeLessThan(
      evidencePackBranch.indexOf('return noStoreJson(result, { status: 201 })'),
    );
  });

  it('compensates the exact tenant-, actor-, and timestamp-scoped pack', () => {
    expect(evidencePackBranch).toContain(".from('enterprise_evidence_packs')");
    expect(evidencePackBranch).toContain(".eq('id', result.pack.id)");
    expect(evidencePackBranch).toContain(".eq('organization_id', organization.id)");
    expect(evidencePackBranch).toContain(".eq('created_by', user.id)");
    expect(evidencePackBranch).toContain(".eq('created_at', result.pack.created_at)");
  });

  it('returns a stable no-store failure and keeps compensation reporting sanitized', () => {
    expect(evidencePackBranch).toContain("{ error: 'evidence_pack_audit_unavailable' }");
    expect(evidencePackBranch).toContain('{ status: 503 }');
    expect(evidencePackBranch).toContain("'[enterprise-readiness] evidence_pack_audit_compensation_failed'");
    expect(evidencePackBranch).toContain("code: rollbackError.code ?? 'unknown'");
    expect(evidencePackBranch).not.toContain('rollbackError.message');
  });

  it('preserves the existing authorization, validation, tenant, and rate-limit boundaries', () => {
    expect(source).toContain('const originDenied = assertTrustedOrigin(request)');
    expect(source).toContain('const user = await requireApiUser()');
    expect(source).toContain('permission: getWorkflowPermission(workflow)');
    expect(source).toContain('const rateLimit = await checkDistributedRateLimit({');
    expect(evidencePackBranch).toContain('schema: evidencePackBodySchema');
    expect(evidencePackBranch).toContain('organizationId: organization.id');
    expect(evidencePackBranch).toContain('actorUserId: user.id');
  });
});