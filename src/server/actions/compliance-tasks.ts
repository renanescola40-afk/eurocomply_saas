import { reportError } from '@/lib/observability/report-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { createComplianceTaskSchema, updateComplianceTaskSchema, type CreateComplianceTaskInput, type UpdateComplianceTaskInput } from '@/lib/validation/compliance';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { requireCurrentUser } from '@/server/queries/auth';
import { logAuditEvent } from './audit';

function failTaskAction(error: unknown, context: Record<string, unknown>, message: string): never {
  reportError(error, context);
  throw new Error(message);
}

export async function createComplianceTask(input: CreateComplianceTaskInput) {
  const user = await requireCurrentUser();
  const payload = createComplianceTaskSchema.parse(input);
  const context = { area: 'compliance_task_create', organizationId: payload.organizationId, actorId: user.id };
  await assertCurrentUserCan(payload.organizationId, user.id, 'tasks:write');

  const supabase = createAdminClient();

  const { data: task, error } = await supabase
    .from('compliance_tasks')
    .insert({
      organization_id: payload.organizationId,
      title: payload.title,
      description: payload.description,
      category: payload.category,
      priority: payload.priority,
      due_date: payload.dueDate,
      assignee_id: payload.assigneeId,
      created_by: user.id,
    })
    .select('*')
    .single();

  if (error) {
    failTaskAction(error, context, 'Unable to create compliance task.');
  }

  await logAuditEvent({
    organizationId: payload.organizationId,
    actorUserId: user.id,
    action: 'task.create',
    entityType: 'compliance_task',
    entityId: task.id,
    metadata: { title: payload.title },
  });

function actionError(message: string) {
  return new Error(message);
}

export async function updateComplianceTask(taskId: string, organizationId: string, input: UpdateComplianceTaskInput) {
  const user = await requireCurrentUser();
  const payload = updateComplianceTaskSchema.parse(input);
  const context = { area: 'compliance_task_update', organizationId, taskId, actorId: user.id };
  await assertCurrentUserCan(organizationId, user.id, 'tasks:write');

  const supabase = createAdminClient();

  const { data: task, error } = await supabase
    .from('compliance_tasks')
    .update({
      title: payload.title,
      description: payload.description,
      category: payload.category,
      priority: payload.priority,
      status: payload.status,
      due_date: payload.dueDate,
      assignee_id: payload.assigneeId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('organization_id', organizationId)
    .select('*')
    .single();

  if (error) {
    failTaskAction(error, context, 'Unable to update compliance task.');
  }

  await logAuditEvent({
    organizationId,
    actorUserId: user.id,
    action: 'task.update',
    entityType: 'compliance_task',
    entityId: taskId,
    metadata: payload,
  });

  if (!rateLimit.allowed) {
    throw actionError('Too many task requests. Please try again later.');
  }
}

export async function deleteComplianceTask(taskId: string, organizationId: string) {
  const user = await requireCurrentUser();
  const context = { area: 'compliance_task_delete', organizationId, taskId, actorId: user.id };
  await assertCurrentUserCan(organizationId, user.id, 'tasks:delete');

  const supabase = createAdminClient();
  const { data: task, error } = await supabase
    .from('compliance_tasks')
    .delete()
    .eq('id', taskId)
    .eq('organization_id', organizationId)
    .select('id,title')
    .single();

  if (error) {
    failTaskAction(error, context, 'Unable to delete compliance task.');
  }

  await logAuditEvent({
    organizationId,
    actorUserId: user.id,
    action: 'task.delete',
    entityType: 'compliance_task',
    entityId: taskId,
    metadata: { title: task.title },
  });

export async function deleteComplianceTask(taskId: string, organizationId: string) {
  const user = await requireCurrentUser();
  const context = { area: 'compliance_task_delete', organizationId, taskId, userId: user.id };

  try {
    await enforceTaskActionRateLimit({ action: 'delete', userId: user.id, organizationId });
    await assertCurrentUserCan(organizationId, user.id, 'tasks:delete');

    const supabase = createAdminClient();
    const { data: task, error } = await supabase
      .from('compliance_tasks')
      .delete()
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .select('id,title')
      .single();

    if (error) {
      reportError(error, context);
      throw actionError('Unable to delete task');
    }

    await logAuditEvent({
      organizationId,
      actorUserId: user.id,
      action: 'task.delete',
      entityType: 'compliance_task',
      entityId: taskId,
      metadata: { title: task.title },
    });

    return task;
  } catch (error) {
    reportError(error, context);
    throw actionError('Unable to delete task');
  }
}
