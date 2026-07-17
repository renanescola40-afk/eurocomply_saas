import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/compliance-tasks.ts';

describe('compliance task update audit persistence', () => {
  it('does not return an updated task when durable audit persistence fails', () => {
    const source = readFileSync(actionPath, 'utf8');
    const updateActionStart = source.indexOf('export async function updateComplianceTask');
    const deleteActionStart = source.indexOf('export async function deleteComplianceTask');
    const updateSource = source.slice(updateActionStart, deleteActionStart);

    expect(updateSource).toContain('const audit = await logAuditEvent({');
    expect(updateSource).toContain('if (!audit.persisted)');
    expect(updateSource.indexOf('return task;')).toBeGreaterThan(updateSource.indexOf('if (!audit.persisted)'));
  });

  it('attempts a tenant-scoped compare-and-set rollback', () => {
    const source = readFileSync(actionPath, 'utf8');
    const updateActionStart = source.indexOf('export async function updateComplianceTask');
    const deleteActionStart = source.indexOf('export async function deleteComplianceTask');
    const updateSource = source.slice(updateActionStart, deleteActionStart);

    expect(updateSource).toContain("area: 'compliance_task_update_audit_rollback'");
    expect(updateSource).toContain(".eq('id', taskId)");
    expect(updateSource).toContain(".eq('organization_id', organizationId)");
    expect(updateSource).toContain(".eq('updated_at', task.updated_at)");
    expect(updateSource).toContain('title: previousTask.title');
    expect(updateSource).toContain('updated_at: previousTask.updated_at');
  });

  it('preserves authorization and fail-closed distributed rate limiting', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain("await assertCurrentUserCan(organizationId, user.id, 'tasks:write')");
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(source).toContain("action: 'task.update'");
  });
});
