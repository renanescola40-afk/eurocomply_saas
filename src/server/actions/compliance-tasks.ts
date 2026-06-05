import { createComplianceTaskSchema, updateComplianceTaskSchema, type CreateComplianceTaskInput, type UpdateComplianceTaskInput } from '@/lib/validation/compliance';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function createComplianceTask(input: CreateComplianceTaskInput, userId: string) {
  const payload = createComplianceTaskSchema.parse(input);
  const supabase = createSupabaseAdminClient();

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

  await supabase.from('audit_logs').insert({
    organization_id: payload.organizationId,
    actor_user_id: userId,
    action: 'compliance_task.created',
    entity_type: 'compliance_task',
    entity_id: task.id,
    metadata: { title: payload.title },
  });

  return task;
}

export async function updateComplianceTask(taskId: string, organizationId: string, input: UpdateComplianceTaskInput, userId: string) {
  const payload = updateComplianceTaskSchema.parse(input);
  const supabase = createSupabaseAdminClient();

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

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_user_id: userId,
    action: 'compliance_task.updated',
    entity_type: 'compliance_task',
    entity_id: taskId,
    metadata: payload,
  });

  return task;
}
