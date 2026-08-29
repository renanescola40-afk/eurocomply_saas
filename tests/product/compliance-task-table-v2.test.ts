import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const TASKS_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/tasks/page.tsx', import.meta.url);
const TASK_LIST = new URL('../../src/components/dashboard/compliance-task-list.tsx', import.meta.url);

describe('compliance task table V2', () => {
  it('preserves permission boundaries and governed task actions', async () => {
    const page = await readFile(TASKS_PAGE, 'utf8');

    expect(page).toContain("roleHasPermission(organization.role, 'manage_ai_governance')");
    expect(page).toContain('createComplianceTask');
    expect(page).toContain('updateComplianceTask');
    expect(page).toContain('deleteComplianceTask');
    expect(page).toContain('onEdit={canManageTasks ? handleEditTask : undefined}');
    expect(page).toContain('onDelete={canManageTasks ? handleDeleteTask : undefined}');
    expect(page).toContain('onComplete={canManageTasks ? handleCompleteTask : undefined}');
  });

  it('renders a table-first operational queue with inline editing', async () => {
    const source = await readFile(TASK_LIST, 'utf8');

    expect(source).toContain('<table');
    expect(source).toContain('Operational work queue with priority, due date, status and governed actions.');
    expect(source).toContain('colSpan={6}');
    expect(source).toContain('setEditing(true)');
    expect(source).toContain('await onEdit(task.id');
    expect(source).toContain('<DeleteRecordButton');
    expect(source).toContain('onComplete.bind(null, task.id)');
  });

  it('derives task KPIs from live task records', async () => {
    const page = await readFile(TASKS_PAGE, 'utf8');

    expect(page).toContain("const completedTasks = tasks.filter((task) => task.status === 'done').length");
    expect(page).toContain('const openTasks = tasks.length - completedTasks');
    expect(page).toContain("const criticalTasks = tasks.filter((task) => task.priority === 'critical' && task.status !== 'done').length");
  });
});
