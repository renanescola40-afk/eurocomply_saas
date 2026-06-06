import { createAdminClient } from '@/lib/supabase/admin';
import { createComplianceTaskSchema, updateComplianceTaskSchema, type CreateComplianceTaskInput, type UpdateComplianceTaskInput } from '@/lib/validation/compliance';
import { assertCurrentUserCan } from '@/server/auth/permissions';
import { logAuditEvent } from './audit';

export async function createComplianceTask(input: CreateComplianceTaskInput, userId: string) {
  const payload = createComplianceTaskSchema.parse(input);
  await assertCurrentUserCan(payload.organizationId, userId, 'tasks:write');

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
      created_by: userId,
    })
    .select('*')
    .single();

  if (error) throw error;

  await logAuditEvent({
    organizationId: payload.organizationId,
    actorUserId: userId,
    action: 'compliance_task.created',
    entityType: 'compliance_task',
    entityId: task.id,
    metadata: { title: payload.title },
  });

  return task;
}

export async function updateComplianceTask(taskId: string, organizationId: string, input: UpdateComplianceTaskInput, userId: string) {
  const payload = updateComplianceTaskSchema.parse(input);
  await assertCurrentUserCan(organizationId, userId, 'tasks:write');

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

  if (error) throw error;

  await logAuditEvent({
    organizationId,
    actorUserId: userId,
    action: 'compliance_task.updated',
    entityType: 'compliance_task',
    entityId: taskId,
    metadata: payload,
  });

  return task;
}

export async function deleteComplianceTask(taskId: string, organizationId: string, userId: string) {
  await assertCurrentUserCan(organizationId, userId, 'tasks:delete');

  const supabase = createAdminClient();
  const { data: task, error } = await supabase
    .from('compliance_tasks')
    .delete()
    .eq('id', taskId)
    .eq('organization_id', organizationId)
    .select('id,title')
    .single();

  if (error) throw error;

  await logAuditEvent({
    organizationId,
    actorUserId: userId,
    action: 'compliance_task.deleted',
    entityType: 'compliance_task',
    entityId: taskId,
    metadata: { title: task.title },
  });

  return task;
}
