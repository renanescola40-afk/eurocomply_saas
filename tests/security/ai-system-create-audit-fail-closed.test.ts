import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/app/api/ai-systems/route.ts', 'utf8');

describe('AI-system creation audit persistence', () => {
  it('does not return the created system before durable audit persistence', () => {
    const createIndex = source.indexOf('const system = await createAiSystem');
    const auditIndex = source.indexOf('const audit = await createAuditEvent', createIndex);
    const guardIndex = source.indexOf('if (!audit.persisted)', auditIndex);
    const successIndex = source.indexOf('return noStoreJson({ system, roleAssessment: result.roleAssessment });', guardIndex);

    expect(createIndex).toBeGreaterThan(-1);
    expect(auditIndex).toBeGreaterThan(createIndex);
    expect(guardIndex).toBeGreaterThan(auditIndex);
    expect(successIndex).toBeGreaterThan(guardIndex);
  });

  it('compensates only the exact newly created tenant-scoped AI system', () => {
    expect(source).toContain(".from('ai_systems')");
    expect(source).toContain('.delete()');
    expect(source).toContain(".eq('id', system.id)");
    expect(source).toContain(".eq('organization_id', organization.id)");
    expect(source).toContain(".eq('created_by', user.id)");
    expect(source).toContain(".eq('created_at', system.created_at)");
    expect(source).toContain("creation_audit_compensation_failed");
    expect(source).toContain("ai_system_creation_audit_unavailable");
    expect(source).toContain('{ status: 503 }');
  });
});
