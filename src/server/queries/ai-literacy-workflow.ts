import { createAdminClient } from '@/lib/supabase/admin';
import type {
  AiLiteracyCourseRecord,
  AiLiteracyEvidenceRecord,
  AiLiteracyProgramRecord,
} from '@/server/queries/ai-literacy';

const PROGRAM_COLUMNS = 'id,organization_id,title,description,article_reference,status,owner_user_id,review_due_at,activated_at,created_by,created_at,updated_at';
const COURSE_COLUMNS = 'id,organization_id,program_id,title,description,version,status,audience_roles,risk_levels,departments,modules,passing_score,validity_days,published_at,created_by,created_at,updated_at';
const EVIDENCE_COLUMNS = 'id,organization_id,assignment_id,evidence_type,title,storage_path,external_url,sha256,mime_type,issued_at,valid_until,status,submitted_by,reviewed_by,reviewed_at,review_notes,created_at,updated_at';

export async function getAiLiteracyProgram(organizationId: string, programId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_literacy_programs')
    .select(PROGRAM_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('id', programId)
    .single();

  if (error || !data) return null;
  return data as AiLiteracyProgramRecord;
}

export async function activateAiLiteracyProgram(organizationId: string, programId: string) {
  const supabase = createAdminClient();
  const activatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('ai_literacy_programs')
    .update({ status: 'active', activated_at: activatedAt, updated_at: activatedAt })
    .eq('organization_id', organizationId)
    .eq('id', programId)
    .eq('status', 'draft')
    .select(PROGRAM_COLUMNS)
    .single();

  if (error || !data) return null;
  return data as AiLiteracyProgramRecord;
}

export async function restoreAiLiteracyProgram(before: AiLiteracyProgramRecord) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('ai_literacy_programs')
    .update({
      status: before.status,
      activated_at: before.activated_at,
      updated_at: before.updated_at,
    })
    .eq('organization_id', before.organization_id)
    .eq('id', before.id);

  return { restored: !error, errorCode: error?.code ?? null };
}

export async function getAiLiteracyCourse(organizationId: string, courseId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_literacy_courses')
    .select(COURSE_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('id', courseId)
    .single();

  if (error || !data) return null;
  return data as AiLiteracyCourseRecord;
}

export async function publishAiLiteracyCourse(organizationId: string, courseId: string) {
  const course = await getAiLiteracyCourse(organizationId, courseId);
  if (!course || course.status !== 'draft' || !Array.isArray(course.modules) || course.modules.length === 0) return null;

  const program = await getAiLiteracyProgram(organizationId, course.program_id);
  if (!program || program.status !== 'active') return null;

  const supabase = createAdminClient();
  const publishedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('ai_literacy_courses')
    .update({ status: 'published', published_at: publishedAt, updated_at: publishedAt })
    .eq('organization_id', organizationId)
    .eq('id', courseId)
    .eq('status', 'draft')
    .select(COURSE_COLUMNS)
    .single();

  if (error || !data) return null;
  return data as AiLiteracyCourseRecord;
}

export async function restoreAiLiteracyCourse(before: AiLiteracyCourseRecord) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('ai_literacy_courses')
    .update({
      status: before.status,
      published_at: before.published_at,
      updated_at: before.updated_at,
    })
    .eq('organization_id', before.organization_id)
    .eq('id', before.id);

  return { restored: !error, errorCode: error?.code ?? null };
}

export async function getPublishedAiLiteracyCourse(organizationId: string, courseId: string) {
  const course = await getAiLiteracyCourse(organizationId, courseId);
  return course?.status === 'published' ? course : null;
}

export async function getAiLiteracyEvidence(organizationId: string, evidenceId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_literacy_evidence')
    .select(EVIDENCE_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('id', evidenceId)
    .single();

  if (error || !data) return null;
  return data as AiLiteracyEvidenceRecord;
}

export async function reviewAiLiteracyEvidence(input: {
  organizationId: string;
  evidenceId: string;
  reviewerUserId: string;
  decision: 'approved' | 'rejected';
  reviewNotes?: string | null;
}) {
  const before = await getAiLiteracyEvidence(input.organizationId, input.evidenceId);
  if (!before || !['submitted', 'under_review'].includes(before.status)) return null;
  if (before.submitted_by && before.submitted_by === input.reviewerUserId) return null;

  const supabase = createAdminClient();
  const reviewedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('ai_literacy_evidence')
    .update({
      status: input.decision,
      reviewed_by: input.reviewerUserId,
      reviewed_at: reviewedAt,
      review_notes: input.reviewNotes ?? null,
      updated_at: reviewedAt,
    })
    .eq('organization_id', input.organizationId)
    .eq('id', input.evidenceId)
    .in('status', ['submitted', 'under_review'])
    .select(EVIDENCE_COLUMNS)
    .single();

  if (error || !data) return null;
  return { before, evidence: data as AiLiteracyEvidenceRecord };
}

export async function restoreAiLiteracyEvidence(before: AiLiteracyEvidenceRecord) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('ai_literacy_evidence')
    .update({
      status: before.status,
      reviewed_by: before.reviewed_by,
      reviewed_at: before.reviewed_at,
      review_notes: before.review_notes,
      updated_at: before.updated_at,
    })
    .eq('organization_id', before.organization_id)
    .eq('id', before.id);

  return { restored: !error, errorCode: error?.code ?? null };
}
