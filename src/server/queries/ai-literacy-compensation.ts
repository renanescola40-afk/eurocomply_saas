import { createAdminClient } from '@/lib/supabase/admin';
import type { AiLiteracyAssignmentRecord } from '@/server/queries/ai-literacy';

const ASSIGNMENT_COLUMNS = 'id,organization_id,course_id,assignee_user_id,assignee_email,assignee_type,role_title,department,status,assigned_by,assigned_at,due_at,started_at,completed_at,score,acknowledgement,valid_until,waiver_rationale,waiver_approved_by,waiver_approved_at,created_at,updated_at';

export async function getAiLiteracyAssignmentForUpdate(organizationId: string, assignmentId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_literacy_assignments')
    .select(ASSIGNMENT_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('id', assignmentId)
    .single();

  if (error || !data) return null;
  return data as AiLiteracyAssignmentRecord;
}

export async function restoreAiLiteracyAssignment(before: AiLiteracyAssignmentRecord) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('ai_literacy_assignments')
    .update({
      status: before.status,
      started_at: before.started_at,
      completed_at: before.completed_at,
      score: before.score,
      acknowledgement: before.acknowledgement,
      valid_until: before.valid_until,
      waiver_rationale: before.waiver_rationale,
      waiver_approved_by: before.waiver_approved_by,
      waiver_approved_at: before.waiver_approved_at,
      updated_at: before.updated_at,
    })
    .eq('organization_id', before.organization_id)
    .eq('id', before.id);

  return { restored: !error, errorCode: error?.code ?? null };
}
