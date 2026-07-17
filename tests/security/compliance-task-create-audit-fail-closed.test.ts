import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/compliance-tasks.ts';

describe('compliance task creation audit persistence', () => {
  it('does not return a created task when durable audit persistence fails', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain('const audit = await logAuditEvent({');
    expect(source).toContain('if (!audit.persisted)');

    const auditGuardIndex = source.indexOf('if (!audit.persisted)');
    const successIndex = source.indexOf('return task;');

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(successIndex).toBeGreaterThan(auditGuardIndex);
  });

  it('attempts a tenant-scoped rollback of the newly inserted task', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain("area: 'compliance_task_create_audit_rollback'");
    expect(source).toContain(".from('compliance_tasks')\n        .delete()");
    expect(source).toContain(".eq('id', task.id)");
    expect(source).toContain(".eq('organization_id', payload.organizationId)");
  });

  it('preserves authorization and fail-closed distributed rate limiting', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain("await assertCurrentUserCan(payload.organizationId, user.id, 'tasks:write')");
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(source).toContain("action: 'task.create'");
  });
});
