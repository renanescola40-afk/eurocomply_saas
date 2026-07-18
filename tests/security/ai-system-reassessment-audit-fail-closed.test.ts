import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/ai-systems/[id]/route.ts';
const migrationPath = 'supabase/migrations/20260718090000_compensate_ai_system_reassessment_audit_failure.sql';

describe('AI-system reassessment audit persistence', () => {
  it('fails closed and compensates when the audit event is not persisted', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const audit = await createAuditEvent({');
    expect(source).toContain('if (!audit.persisted)');
    expect(source).toContain('compensateAiSystemReassessmentAuditFailure({');
    expect(source).toContain("return noStoreJson({ error: 'ai_system_reassessment_audit_unavailable' }, { status: 503 });");

    const auditGuardIndex = source.indexOf('if (!audit.persisted)');
    const historyReadIndex = source.indexOf('const history = await listAiSystemHistory', auditGuardIndex);
    const successIndex = source.indexOf('return noStoreJson({ system, history, roleAssessment', auditGuardIndex);

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(historyReadIndex).toBeGreaterThan(auditGuardIndex);
    expect(successIndex).toBeGreaterThan(auditGuardIndex);
  });

  it('keeps compensation tenant-scoped and concurrency-safe', () => {
    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).toContain('and s.organization_id = p_organization_id');
    expect(migration).toContain('and s.updated_at is not distinct from p_failed_updated_at');
    expect(migration).toContain("and h.action = 'reassessed'");
    expect(migration).toContain("and h.snapshot ->> 'updatedAt' = p_failed_updated_at::text");
    expect(migration).toContain('grant execute on function public.compensate_ai_system_reassessment_audit_failure');
    expect(migration).not.toContain('grant execute on function public.compensate_ai_system_reassessment_audit_failure(uuid, uuid, uuid, timestamptz, jsonb) to authenticated');
  });

  it('preserves existing reassessment controls', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain("permission: 'manage_ai_governance'");
    expect(source).toContain('assertTrustedOrigin(request)');
    expect(source).toContain('checkDistributedRateLimit({');
    expect(source).toContain('expectedUpdatedAt: existing.updated_at');
    expect(source).toContain("action: 'ai_system_reassessed'");
  });
});
