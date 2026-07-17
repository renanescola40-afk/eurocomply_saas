import { createAdminClient } from '@/lib/supabase/admin';
import { calculateAiLiteracyCoverage, type AiLiteracyAssignmentSnapshot } from '@/server/ai-governance/literacy';

const PROGRAM_COLUMNS = 'id,organization_id,title,description,article_reference,status,owner_user_id,review_due_at,activated_at,created_by,created_at,updated_at';
const COURSE_COLUMNS = 'id,organization_id,program_id,title,description,version,status,audience_roles,risk_levels,departments,modules,passing_score,validity_days,published_at,created_by,created_at,updated_at';
const ASSIGNMENT_COLUMNS = 'id,organization_id,course_id,assignee_user_id,assignee_email,assignee_type,role_title,department,status,assigned_by,assigned_at,due_at,started_at,completed_at,score,acknowledgement,valid_until,waiver_rationale,waiver_approved_by,waiver_approved_at,created_at,updated_at';
const EVIDENCE_COLUMNS = 'id,organization_id,assignment_id,evidence_type,title,storage_path,external_url,sha256,mime_type,issued_at,valid_until,status,submitted_by,reviewed_by,reviewed_at,review_notes,created_at,updated_at';

export type AiLiteracyProgramRecord = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  article_reference: string;
  status: 'draft' | 'active' | 'archived';
  owner_user_id: string | null;
  review_due_at: string | null;
  activated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AiLiteracyCourseRecord = {
  id: string;
  organization_id: string;
  program_id: string;
  title: string;
  description: string | null;
  version: string;
  status: 'draft' | 'published' | 'retired';
  audience_roles: string[];
  risk_levels: string[];
  departments: string[];
  modules: unknown[];
  passing_score: number | null;
  validity_days: number | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AiLiteracyAssignmentRecord = {
  id: string;
  organization_id: string;
  course_id: string;
  assignee_user_id: string | null;
  assignee_email: string | null;
  assignee_type: 'employee' | 'contractor' | 'other';
  role_title: string | null;
  department: string | null;
  status: 'assigned' | 'in_progress' | 'completed' | 'expired' | 'waived' | 'revoked';
  assigned_by: string | null;
  assigned_at: string;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  score: number | null;
  acknowledgement: boolean;
  valid_until: string | null;
  waiver_rationale: string | null;
  waiver_approved_by: string | null;
  waiver_approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AiLiteracyEvidenceRecord = {
  id: string;
  organization_id: string;
  assignment_id: string;
  evidence_type: 'completion_record' | 'assessment_result' | 'attendance' | 'acknowledgement' | 'certificate' | 'other';
  title: string;
  storage_path: string | null;
  external_url: string | null;
  sha256: string | null;
  mime_type: string | null;
  issued_at: string | null;
  valid_until: string | null;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired' | 'superseded';
  submitted_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

function throwQueryError(area: string, error: { code?: string } | null) {
  console.warn(`[ai-literacy] ${area}`, { code: error?.code ?? 'unknown' });
  throw new Error('ai_literacy_storage_unavailable');
}

export async function listAiLiteracySnapshot(organizationId: string, asOf = new Date().toISOString()) {
  const supabase = createAdminClient();
  const [programsResult, coursesResult, assignmentsResult, evidenceResult] = await Promise.all([
    supabase.from('ai_literacy_programs').select(PROGRAM_COLUMNS).eq('organization_id', organizationId).order('created_at', { ascending: false }),
    supabase.from('ai_literacy_courses').select(COURSE_COLUMNS).eq('organization_id', organizationId).order('created_at', { ascending: false }),
    supabase.from('ai_literacy_assignments').select(ASSIGNMENT_COLUMNS).eq('organization_id', organizationId).order('assigned_at', { ascending: false }),
    supabase.from('ai_literacy_evidence').select(EVIDENCE_COLUMNS).eq('organization_id', organizationId).order('created_at', { ascending: false }),
  ]);

  if (programsResult.error) throwQueryError('programs_list_failed', programsResult.error);
  if (coursesResult.error) throwQueryError('courses_list_failed', coursesResult.error);
  if (assignmentsResult.error) throwQueryError('assignments_list_failed', assignmentsResult.error);
  if (evidenceResult.error) throwQueryError('evidence_list_failed', evidenceResult.error);

  const programs = (programsResult.data ?? []) as AiLiteracyProgramRecord[];
  const courses = (coursesResult.data ?? []) as AiLiteracyCourseRecord[];
  const assignments = (assignmentsResult.data ?? []) as AiLiteracyAssignmentRecord[];
  const evidence = (evidenceResult.data ?? []) as AiLiteracyEvidenceRecord[];
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const evidenceByAssignment = new Map<string, AiLiteracyEvidenceRecord[]>();

  for (const item of evidence) {
    evidenceByAssignment.set(item.assignment_id, [...(evidenceByAssignment.get(item.assignment_id) ?? []), item]);
  }

  const coverageInput: AiLiteracyAssignmentSnapshot[] = assignments.map((assignment) => ({
    id: assignment.id,
    status: assignment.status,
    dueAt: assignment.due_at,
    completedAt: assignment.completed_at,
    validUntil: assignment.valid_until,
    score: assignment.score,
    passingScore: courseById.get(assignment.course_id)?.passing_score ?? null,
    acknowledgement: assignment.acknowledgement,
    waiverRationale: assignment.waiver_rationale,
    waiverApprovedBy: assignment.waiver_approved_by,
    waiverApprovedAt: assignment.waiver_approved_at,
    evidence: (evidenceByAssignment.get(assignment.id) ?? []).map((item) => ({
      status: item.status,
      validUntil: item.valid_until,
    })),
  }));

  return {
    programs,
    courses,
    assignments,
    evidence,
    coverage: calculateAiLiteracyCoverage(coverageInput, asOf),
  };
}

export async function createAiLiteracyProgram(input: {
  organizationId: string;
  actorUserId: string;
  title: string;
  description?: string | null;
  ownerUserId?: string | null;
  reviewDueAt?: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_literacy_programs')
    .insert({
      organization_id: input.organizationId,
      title: input.title,
      description: input.description ?? null,
      owner_user_id: input.ownerUserId ?? input.actorUserId,
      review_due_at: input.reviewDueAt ?? null,
      created_by: input.actorUserId,
    })
    .select(PROGRAM_COLUMNS)
    .single();

  if (error || !data) throwQueryError('program_create_failed', error);
  return data as AiLiteracyProgramRecord;
}

export async function createAiLiteracyCourse(input: {
  organizationId: string;
  actorUserId: string;
  programId: string;
  title: string;
  description?: string | null;
  version: string;
  audienceRoles: string[];
  riskLevels: string[];
  departments: string[];
  modules: unknown[];
  passingScore?: number | null;
  validityDays?: number | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_literacy_courses')
    .insert({
      organization_id: input.organizationId,
      program_id: input.programId,
      title: input.title,
      description: input.description ?? null,
      version: input.version,
      audience_roles: input.audienceRoles,
      risk_levels: input.riskLevels,
      departments: input.departments,
      modules: input.modules,
      passing_score: input.passingScore ?? null,
      validity_days: input.validityDays ?? null,
      created_by: input.actorUserId,
    })
    .select(COURSE_COLUMNS)
    .single();

  if (error || !data) throwQueryError('course_create_failed', error);
  return data as AiLiteracyCourseRecord;
}

export async function createAiLiteracyAssignment(input: {
  organizationId: string;
  actorUserId: string;
  courseId: string;
  assigneeUserId?: string | null;
  assigneeEmail?: string | null;
  assigneeType: 'employee' | 'contractor' | 'other';
  roleTitle?: string | null;
  department?: string | null;
  dueAt?: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_literacy_assignments')
    .insert({
      organization_id: input.organizationId,
      course_id: input.courseId,
      assignee_user_id: input.assigneeUserId ?? null,
      assignee_email: input.assigneeEmail ?? null,
      assignee_type: input.assigneeType,
      role_title: input.roleTitle ?? null,
      department: input.department ?? null,
      due_at: input.dueAt ?? null,
      assigned_by: input.actorUserId,
    })
    .select(ASSIGNMENT_COLUMNS)
    .single();

  if (error || !data) throwQueryError('assignment_create_failed', error);
  return data as AiLiteracyAssignmentRecord;
}

export async function completeAiLiteracyAssignment(input: {
  organizationId: string;
  assignmentId: string;
  score?: number | null;
  completedAt: string;
  validUntil?: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_literacy_assignments')
    .update({
      status: 'completed',
      score: input.score ?? null,
      acknowledgement: true,
      completed_at: input.completedAt,
      valid_until: input.validUntil ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', input.organizationId)
    .eq('id', input.assignmentId)
    .select(ASSIGNMENT_COLUMNS)
    .single();

  if (error || !data) throwQueryError('assignment_complete_failed', error);
  return data as AiLiteracyAssignmentRecord;
}

export async function createAiLiteracyEvidence(input: {
  organizationId: string;
  actorUserId: string;
  assignmentId: string;
  evidenceType: AiLiteracyEvidenceRecord['evidence_type'];
  title: string;
  storagePath?: string | null;
  externalUrl?: string | null;
  sha256?: string | null;
  mimeType?: string | null;
  issuedAt?: string | null;
  validUntil?: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_literacy_evidence')
    .insert({
      organization_id: input.organizationId,
      assignment_id: input.assignmentId,
      evidence_type: input.evidenceType,
      title: input.title,
      storage_path: input.storagePath ?? null,
      external_url: input.externalUrl ?? null,
      sha256: input.sha256 ?? null,
      mime_type: input.mimeType ?? null,
      issued_at: input.issuedAt ?? null,
      valid_until: input.validUntil ?? null,
      submitted_by: input.actorUserId,
    })
    .select(EVIDENCE_COLUMNS)
    .single();

  if (error || !data) throwQueryError('evidence_create_failed', error);
  return data as AiLiteracyEvidenceRecord;
}

export async function rollbackAiLiteracyCreate(
  table: 'ai_literacy_programs' | 'ai_literacy_courses' | 'ai_literacy_assignments' | 'ai_literacy_evidence',
  organizationId: string,
  id: string,
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from(table).delete().eq('organization_id', organizationId).eq('id', id);
  return { rolledBack: !error, errorCode: error?.code ?? null };
}
