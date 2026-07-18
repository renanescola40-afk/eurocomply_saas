import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/compliance-tasks.ts';

describe('compliance task delete audit persistence', () => {
  it('does not report deletion success when durable audit persistence fails', () => {
    const source = readFileSync(actionPath, 'utf8');
    const deleteActionStart = source.indexOf('export async function deleteComplianceTask');
    const deleteSource = source.slice(deleteActionStart);

    expect(deleteSource).toContain('const audit = await logAuditEvent({');
    expect(deleteSource).toContain('if (!audit.persisted)');
    expect(deleteSource.indexOf('return task;')).toBeGreaterThan(deleteSource.indexOf('if (!audit.persisted)'));
  });

  it('captures and restores the exact tenant-scoped deleted row', () => {
    const source = readFileSync(actionPath, 'utf8');
    const deleteActionStart = source.indexOf('export async function deleteComplianceTask');
    const deleteSource = source.slice(deleteActionStart);

    expect(deleteSource).toContain(".eq('id', taskId)");
    expect(deleteSource).toContain(".eq('organization_id', organizationId)");
    expect(deleteSource).toContain(".select('*')");
    expect(deleteSource).toContain("supabase.from('compliance_tasks').insert(task)");
    expect(deleteSource).toContain("area: 'compliance_task_delete_audit_rollback'");
  });

  it('preserves delete authorization and fail-closed distributed rate limiting', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain("await assertCurrentUserCan(organizationId, user.id, 'tasks:delete')");
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(source).toContain("action: 'task.delete'");
  });
});
