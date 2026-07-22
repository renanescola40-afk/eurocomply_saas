import { createAdminClient } from '@/lib/supabase/admin';

const REVIEW_COLUMNS = 'id,organization_id,system_reference,review_version,applicability,status,owner_user_id,reviewer_user_id,legal_reviewer_user_id,approver_user_id,positive_signal_count,unknown_signal_count,prohibited_signal_count,unresolved_signal_count,supported_exception_count,open_high_findings,open_critical_findings,review_digest,last_material_change_at,reviewed_at,legal_reviewed_at,approved_at,retired_at,created_at,updated_at';
const SIGNAL_COLUMNS = 'id,organization_id,review_id,signal_code,answer,legal_conclusion,status,rationale,deployment_context,consequence_analysis,exception_claimed,evidence_count,owner_user_id,reviewer_user_id,legal_reviewer_user_id,content_digest,last_material_change_at,reviewed_at,legal_reviewed_at,approved_at,created_at,updated_at';
const EVIDENCE_COLUMNS = 'id,organization_id,review_id,signal_assessment_id,exception_claim_id,evidence_type,evidence_reference,source_version,evidence_digest,submitted_by_user_id,reviewed_by_user_id,collected_at,reviewed_at,created_at';
const DECISION_COLUMNS = 'id,organization_id,review_id,signal_assessment_id,decision_type,outcome,rationale,actor_user_id,evidence_digest,created_at';

function fail(area: string, error?: { code?: string } | null): never {
  console.warn('[prohibited-practices] storage_failure', { area, code: error?.code ?? 'unknown' });
  throw new Error('prohibited_practices_storage_unavailable');
}

export async function listProhibitedPracticesSnapshot(organizationId: string) {
  const db = createAdminClient();
  const [reviews, signals, evidence, decisions] = await Promise.all([
    db.from('ai_prohibited_practice_reviews').select(REVIEW_COLUMNS).eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    db.from('ai_prohibited_practice_signal_assessments').select(SIGNAL_COLUMNS).eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    db.from('ai_prohibited_practice_evidence').select(EVIDENCE_COLUMNS).eq('organization_id', organizationId).order('created_at', { ascending: false }),
    db.from('ai_prohibited_practice_decisions').select(DECISION_COLUMNS).eq('organization_id', organizationId).order('created_at', { ascending: false }),
  ]);
  if (reviews.error) fail('review_list', reviews.error);
  if (signals.error) fail('signal_list', signals.error);
  if (evidence.error) fail('evidence_list', evidence.error);
  if (decisions.error) fail('decision_list', decisions.error);
  return { reviews: reviews.data ?? [], signals: signals.data ?? [], evidence: evidence.data ?? [], decisions: decisions.data ?? [] };
}

export async function createProhibitedPracticesReview(input: { organizationId: string; actorUserId: string; systemReference: string; applicability: string }) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('create_prohibited_practices_review_atomic', {
    p_organization_id: input.organizationId,
    p_actor_user_id: input.actorUserId,
    p_system_reference: input.systemReference,
    p_applicability: input.applicability,
  });
  if (error) fail('review_create_atomic', error);
  return Array.isArray(data) ? data[0] : null;
}

export async function updateProhibitedPracticeSignal(input: { organizationId: string; reviewId: string; signalCode: string; expectedUpdatedAt: string; patch: Record<string, unknown> }) {
  const db = createAdminClient();
  const { data, error } = await db
    .from('ai_prohibited_practice_signal_assessments')
    .update(input.patch)
    .eq('organization_id', input.organizationId)
    .eq('review_id', input.reviewId)
    .eq('signal_code', input.signalCode)
    .eq('updated_at', input.expectedUpdatedAt)
    .select(SIGNAL_COLUMNS)
    .maybeSingle();
  if (error) fail('signal_update', error);
  return data;
}

export async function createProhibitedPracticeEvidence(input: { organizationId: string; reviewId: string; signalAssessmentId: string; actorUserId: string; evidenceType: string; evidenceReference: string; sourceVersion: string; evidenceDigest: string }) {
  const db = createAdminClient();
  const { data, error } = await db.from('ai_prohibited_practice_evidence').insert({
    organization_id: input.organizationId,
    review_id: input.reviewId,
    signal_assessment_id: input.signalAssessmentId,
    evidence_type: input.evidenceType,
    evidence_reference: input.evidenceReference,
    source_version: input.sourceVersion,
    evidence_digest: input.evidenceDigest,
    submitted_by_user_id: input.actorUserId,
    collected_at: new Date().toISOString(),
  }).select(EVIDENCE_COLUMNS).single();
  if (error || !data) fail('evidence_create', error);
  return data;
}

export async function approveProhibitedPracticesReview(input: { organizationId: string; reviewId: string; expectedUpdatedAt: string; actorUserId: string; rationale: string }) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('approve_prohibited_practices_review_atomic', {
    p_organization_id: input.organizationId,
    p_review_id: input.reviewId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_actor_user_id: input.actorUserId,
    p_rationale: input.rationale,
  });
  if (error) fail('review_approve_atomic', error);
  return Array.isArray(data) ? data[0] : null;
}

export async function rollbackProhibitedPracticeCreate(table: 'ai_prohibited_practice_reviews' | 'ai_prohibited_practice_evidence', organizationId: string, id: string) {
  const db = createAdminClient();
  const { error } = await db.from(table).delete().eq('organization_id', organizationId).eq('id', id);
  return { rolledBack: !error, errorCode: error?.code };
}
