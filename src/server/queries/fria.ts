import { createAdminClient } from '@/lib/supabase/admin';

const ASSESSMENT_COLUMNS = 'id,organization_id,ai_system_id,version,applicability,stage,context,affected_groups,rights_map,impact_analysis,mitigation_plan,oversight_plan,complaints_redress,monitoring_plan_id,highest_residual_impact,owner_id,reviewer_id,approver_id,legal_reviewer_id,legal_review_required,legal_review_completed_at,approved_at,review_due_at,created_at,updated_at';
const EVIDENCE_COLUMNS = 'id,organization_id,assessment_id,control_id,evidence_type,storage_reference,sha256_digest,status,submitted_by,reviewed_by,reviewed_at,created_at';
const DECISION_COLUMNS = 'id,organization_id,assessment_id,decision,rationale,actor_id,evidence_digest,created_at';

export type FriaAssessmentRecord = {
  id: string;
  organization_id: string;
  ai_system_id: string;
  version: number;
  applicability: 'required' | 'not_required' | 'uncertain';
  stage: 'draft' | 'applicability_review' | 'assessment' | 'mitigation' | 'approval' | 'approved' | 'blocked' | 'retired';
  context: Record<string, unknown>;
  affected_groups: unknown[];
  rights_map: unknown[];
  impact_analysis: Record<string, unknown>;
  mitigation_plan: Record<string, unknown>;
  oversight_plan: Record<string, unknown>;
  complaints_redress: Record<string, unknown>;
  monitoring_plan_id: string | null;
  highest_residual_impact: 'none' | 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  owner_id: string;
  reviewer_id: string | null;
  approver_id: string | null;
  legal_reviewer_id: string | null;
  legal_review_required: boolean;
  legal_review_completed_at: string | null;
  approved_at: string | null;
  review_due_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FriaEvidenceRecord = {
  id: string;
  organization_id: string;
  assessment_id: string;
  control_id: string;
  evidence_type: string;
  storage_reference: string | null;
  sha256_digest: string | null;
  status: 'submitted' | 'accepted' | 'rejected' | 'expired';
  submitted_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type FriaDecisionRecord = {
  id: string;
  organization_id: string;
  assessment_id: string;
  decision: 'applicability_confirmed' | 'mitigation_required' | 'approved' | 'rejected' | 'reassessment_required' | 'retired';
  rationale: string;
  actor_id: string;
  evidence_digest: string | null;
  created_at: string;
};

type AtomicCreateRow = {
  outcome: 'created' | 'invalid_input' | 'actor_not_member' | 'system_not_found';
  assessment: FriaAssessmentRecord | null;
};

type AtomicApprovalRow = {
  outcome: 'approved' | 'invalid_input' | 'not_found' | 'state_changed' | 'approver_required' | 'requirements_not_met';
  assessment: FriaAssessmentRecord | null;
  decision_id: string | null;
};

function fail(area: string, error?: { code?: string } | null): never {
  console.warn('[fria] storage_failure', { area, code: error?.code ?? 'unknown' });
  throw new Error('fria_storage_unavailable');
}

function firstRow<T>(value: unknown): T | null {
  if (!Array.isArray(value) || value.length !== 1) return null;
  const candidate = value[0];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  return candidate as T;
}

export async function listFriaSnapshot(organizationId: string) {
  const db = createAdminClient();
  const [assessments, evidence, decisions] = await Promise.all([
    db.from('ai_fria_assessments').select(ASSESSMENT_COLUMNS).eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    db.from('ai_fria_evidence').select(EVIDENCE_COLUMNS).eq('organization_id', organizationId).order('created_at', { ascending: false }),
    db.from('ai_fria_decisions').select(DECISION_COLUMNS).eq('organization_id', organizationId).order('created_at', { ascending: false }),
  ]);
  if (assessments.error) fail('assessment_list', assessments.error);
  if (evidence.error) fail('evidence_list', evidence.error);
  if (decisions.error) fail('decision_list', decisions.error);
  return {
    assessments: (assessments.data ?? []) as unknown as FriaAssessmentRecord[],
    evidence: (evidence.data ?? []) as unknown as FriaEvidenceRecord[],
    decisions: (decisions.data ?? []) as unknown as FriaDecisionRecord[],
  };
}

export async function createFriaAssessment(input: {
  organizationId: string;
  actorUserId: string;
  aiSystemId: string;
  applicability: FriaAssessmentRecord['applicability'];
  context: Record<string, unknown>;
  reviewDueAt?: string | null;
}) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('create_fria_assessment_atomic', {
    p_organization_id: input.organizationId,
    p_ai_system_id: input.aiSystemId,
    p_actor_user_id: input.actorUserId,
    p_applicability: input.applicability,
    p_context: input.context,
    p_review_due_at: input.reviewDueAt ?? null,
  });
  if (error) fail('assessment_create_atomic', error);
  const row = firstRow<AtomicCreateRow>(data);
  if (!row || !['created', 'invalid_input', 'actor_not_member', 'system_not_found'].includes(row.outcome)) {
    throw new Error('fria_atomic_create_invalid_result');
  }
  return row;
}

export async function getFriaAssessment(organizationId: string, assessmentId: string): Promise<FriaAssessmentRecord | null> {
  const db = createAdminClient();
  const { data, error } = await db.from('ai_fria_assessments').select(ASSESSMENT_COLUMNS).eq('organization_id', organizationId).eq('id', assessmentId).maybeSingle();
  if (error) fail('assessment_get', error);
  return data as unknown as FriaAssessmentRecord | null;
}

export async function listFriaUsableEvidenceControlIds(organizationId: string, assessmentId: string): Promise<string[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('ai_fria_evidence')
    .select('control_id')
    .eq('organization_id', organizationId)
    .eq('assessment_id', assessmentId)
    .in('status', ['submitted', 'accepted']);
  if (error) fail('assessment_evidence_controls', error);
  return Array.from(new Set((data ?? []).map((row) => String(row.control_id))));
}

export async function updateFriaAssessment(
  organizationId: string,
  assessmentId: string,
  expectedUpdatedAt: string,
  patch: Record<string, unknown>,
): Promise<{ status: 'updated'; assessment: FriaAssessmentRecord } | { status: 'conflict' }> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('ai_fria_assessments')
    .update(patch)
    .eq('organization_id', organizationId)
    .eq('id', assessmentId)
    .eq('updated_at', expectedUpdatedAt)
    .select(ASSESSMENT_COLUMNS)
    .maybeSingle();
  if (error) fail('assessment_update', error);
  if (!data) return { status: 'conflict' };
  return { status: 'updated', assessment: data as unknown as FriaAssessmentRecord };
}

export async function restoreFriaAssessment(before: FriaAssessmentRecord, currentUpdatedAt: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from('ai_fria_assessments')
    .update({
      applicability: before.applicability,
      stage: before.stage,
      context: before.context,
      affected_groups: before.affected_groups,
      rights_map: before.rights_map,
      impact_analysis: before.impact_analysis,
      mitigation_plan: before.mitigation_plan,
      oversight_plan: before.oversight_plan,
      complaints_redress: before.complaints_redress,
      monitoring_plan_id: before.monitoring_plan_id,
      highest_residual_impact: before.highest_residual_impact,
      reviewer_id: before.reviewer_id,
      approver_id: before.approver_id,
      legal_reviewer_id: before.legal_reviewer_id,
      legal_review_required: before.legal_review_required,
      legal_review_completed_at: before.legal_review_completed_at,
      approved_at: before.approved_at,
      review_due_at: before.review_due_at,
    })
    .eq('organization_id', before.organization_id)
    .eq('id', before.id)
    .eq('updated_at', currentUpdatedAt)
    .select('id')
    .maybeSingle();
  return { restored: !error && Boolean(data), errorCode: error?.code };
}

export async function approveFriaAssessmentAtomic(input: {
  organizationId: string;
  assessmentId: string;
  expectedUpdatedAt: string;
  actorUserId: string;
  rationale: string;
}) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('approve_fria_assessment_atomic', {
    p_organization_id: input.organizationId,
    p_assessment_id: input.assessmentId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_actor_user_id: input.actorUserId,
    p_rationale: input.rationale,
  });
  if (error) fail('assessment_approve_atomic', error);
  const row = firstRow<AtomicApprovalRow>(data);
  if (!row || !['approved', 'invalid_input', 'not_found', 'state_changed', 'approver_required', 'requirements_not_met'].includes(row.outcome)) {
    throw new Error('fria_atomic_approval_invalid_result');
  }
  return row;
}

export async function compensateFriaApprovalAuditFailure(input: {
  organizationId: string;
  assessmentId: string;
  decisionId: string;
  approvedUpdatedAt: string;
  previousStage: FriaAssessmentRecord['stage'];
  previousApprovedAt: string | null;
  previousUpdatedAt: string;
}) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('compensate_fria_approval_audit_failure', {
    p_organization_id: input.organizationId,
    p_assessment_id: input.assessmentId,
    p_decision_id: input.decisionId,
    p_approved_updated_at: input.approvedUpdatedAt,
    p_previous_stage: input.previousStage,
    p_previous_approved_at: input.previousApprovedAt,
    p_previous_updated_at: input.previousUpdatedAt,
  });
  return { compensated: !error && data === true, errorCode: error?.code };
}

export async function createFriaEvidence(input: {
  organizationId: string;
  assessmentId: string;
  actorUserId: string;
  controlId: string;
  evidenceType: string;
  storageReference?: string | null;
  sha256Digest?: string | null;
}) {
  const db = createAdminClient();
  const { data, error } = await db.from('ai_fria_evidence').insert({
    organization_id: input.organizationId,
    assessment_id: input.assessmentId,
    submitted_by: input.actorUserId,
    control_id: input.controlId,
    evidence_type: input.evidenceType,
    storage_reference: input.storageReference ?? null,
    sha256_digest: input.sha256Digest ?? null,
  }).select(EVIDENCE_COLUMNS).single();
  if (error || !data) fail('evidence_create', error);
  return data as unknown as FriaEvidenceRecord;
}

export async function rollbackFriaCreate(table: 'ai_fria_assessments' | 'ai_fria_evidence', organizationId: string, id: string) {
  const db = createAdminClient();
  const { error } = await db.from(table).delete().eq('organization_id', organizationId).eq('id', id);
  return { rolledBack: !error, errorCode: error?.code };
}
