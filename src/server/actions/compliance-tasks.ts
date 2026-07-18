import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { createComplianceTaskSchema, updateComplianceTaskSchema, type CreateComplianceTaskInput, type UpdateComplianceTaskInput } from '@/lib/validation/compliance';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { requireCurrentUser } from '@/server/queries/auth';
import { logAuditEvent } from './audit';

function actionError(message: string) {
  return new Error(message);
}

async function enforceTaskActionRateLimit(input: {
  action: 'create' | 'update' | 'delete';
  userId: string;
  organizationId: string;
}) {
  const rateLimit = await checkDistributedRateLimit({
    key: `task:${input.action}:${input.organizationId}:${input.userId}`,
    policy: 'general-api',
    userId: input.userId,
    organizationId: input.organizationId,
    route: `server-action:${input.action}ComplianceTask`,
    action: `task.${input.action}`,
    limit: 30,
    windowMs: 60_000,
    failureMode: 'fail-closed',
  });

  if (!rateLimit.allowed) {
    throw actionError('Too many task requests. Please try again later.');
  }
}

export async function createComplianceTask(input: CreateComplianceTaskInput) {
  const user = await requireCurrentUser();
  const payload = createComplianceTaskSchema.parse(input);
  const context = { area: 'compliance_task_create', organizationId: payload.organizationId, userId: user.id };

  await enforceTaskActionRateLimit({ action: 'create', userId: user.id, organizationId: payload.organizationId });
  await assertCurrentUserCan(payload.organizationId, user.id, 'tasks:write');

  try {
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
      reportError(error, context);
      throw actionError('Unable to create task');
    }

    const audit = await logAuditEvent({
      organizationId: payload.organizationId,
      actorUserId: user.id,
      action: 'task.create',
      entityType: 'compliance_task',
      entityId: task.id,
      metadata: { title: payload.title },
    });

    if (!audit.persisted) {
      const { error: rollbackError } = await supabase
        .from('compliance_tasks')
        .delete()
        .eq('id', task.id)
        .eq('organization_id', payload.organizationId);

      if (rollbackError) {
        reportError(rollbackError, {
          ...context,
          area: 'compliance_task_create_audit_rollback',
          taskId: task.id,
        });
      }

      throw actionError('Unable to create task');
    }

    return task;
  } catch (error) {
    if (error instanceof Error && error.message === 'Unable to create task') {
      throw actionError('Unable to create task');
    }

    reportError(error, context);
    throw actionError('Unable to create task');
  }
}

export async function updateComplianceTask(taskId: string, organizationId: string, input: UpdateComplianceTaskInput) {
  const user = await requireCurrentUser();
  const payload = updateComplianceTaskSchema.parse(input);
  const context = { area: 'compliance_task_update', organizationId, taskId, userId: user.id };

  await enforceTaskActionRateLimit({ action: 'update', userId: user.id, organizationId });
  await assertCurrentUserCan(organizationId, user.id, 'tasks:write');

  try {
    const supabase = createAdminClient();
    const { data: previousTask, error: previousTaskError } = await supabase
      .from('compliance_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .single();

    if (previousTaskError) {
      reportError(previousTaskError, context);
      throw actionError('Unable to update task');
    }

    const updatedAt = new Date().toISOString();
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
        updated_at: updatedAt,
      })
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();

    if (error) {
      reportError(error, context);
      throw actionError('Unable to update task');
    }

    const audit = await logAuditEvent({
      organizationId,
      actorUserId: user.id,
      action: 'task.update',
      entityType: 'compliance_task',
      entityId: taskId,
      metadata: payload,
    });

    if (!audit.persisted) {
      const { error: rollbackError } = await supabase
        .from('compliance_tasks')
        .update({
          title: previousTask.title,
          description: previousTask.description,
          category: previousTask.category,
          priority: previousTask.priority,
          status: previousTask.status,
          due_date: previousTask.due_date,
          assignee_id: previousTask.assignee_id,
          updated_at: previousTask.updated_at,
        })
        .eq('id', taskId)
        .eq('organization_id', organizationId)
        .eq('updated_at', task.updated_at);

      if (rollbackError) {
        reportError(rollbackError, {
          ...context,
          area: 'compliance_task_update_audit_rollback',
        });
      }

      throw actionError('Unable to update task');
    }

    return task;
  } catch (error) {
    if (error instanceof Error && error.message === 'Unable to update task') {
      throw actionError('Unable to update task');
    }

    reportError(error, context);
    throw actionError('Unable to update task');
  }
}

export async function deleteComplianceTask(taskId: string, organizationId: string) {
  const user = await requireCurrentUser();
  const context = { area: 'compliance_task_delete', organizationId, taskId, userId: user.id };

  await enforceTaskActionRateLimit({ action: 'delete', userId: user.id, organizationId });
  await assertCurrentUserCan(organizationId, user.id, 'tasks:delete');

  try {
    const supabase = createAdminClient();
    const { data: task, error } = await supabase
      .from('compliance_tasks')
      .delete()
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();

    if (error) {
      reportError(error, context);
      throw actionError('Unable to delete task');
    }

    const audit = await logAuditEvent({
      organizationId,
      actorUserId: user.id,
      action: 'task.delete',
      entityType: 'compliance_task',
      entityId: taskId,
      metadata: { title: task.title },
    });

    if (!audit.persisted) {
      const { error: rollbackError } = await supabase.from('compliance_tasks').insert(task);

      if (rollbackError) {
        reportError(rollbackError, {
          ...context,
          area: 'compliance_task_delete_audit_rollback',
        });
      }

      throw actionError('Unable to delete task');
    }

    return task;
  } catch (error) {
    if (error instanceof Error && error.message === 'Unable to delete task') {
      throw actionError('Unable to delete task');
    }

    reportError(error, context);
    throw actionError('Unable to delete task');
  }
}
