import { createAdminClient } from '@/lib/supabase/admin';

const ASSESSMENT_COLUMNS = 'id,organization_id,ai_system_id,version,applicability,stage,context,affected_groups,rights_map,impact_analysis,mitigation_plan,oversight_plan,complaints_redress,monitoring_plan_id,highest_residual_impact,owner_id,reviewer_id,approver_id,legal_review_required,legal_review_completed_at,approved_at,review_due_at,created_at,updated_at';
const EVIDENCE_COLUMNS = 'id,organization_id,assessment_id,control_id,evidence_type,storage_reference,sha256_digest,status,submitted_by,reviewed_by,reviewed_at,created_at';

function fail(area: string, error?: { code?: string } | null): never {
  console.warn('[fria] storage_failure', { area, code: error?.code ?? 'unknown' });
  throw new Error('fria_storage_unavailable');
}

export async function listFriaSnapshot(organizationId: string) {
  const db = createAdminClient();
  const [assessments, evidence] = await Promise.all([
    db.from('ai_fria_assessments').select(ASSESSMENT_COLUMNS).eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    db.from('ai_fria_evidence').select(EVIDENCE_COLUMNS).eq('organization_id', organizationId).order('created_at', { ascending: false }),
  ]);
  if (assessments.error) fail('assessment_list', assessments.error);
  if (evidence.error) fail('evidence_list', evidence.error);
  return { assessments: assessments.data ?? [], evidence: evidence.data ?? [] };
}

export async function createFriaAssessment(input: { organizationId: string; actorUserId: string; aiSystemId: string; applicability: string; context: Record<string, unknown>; reviewDueAt?: string | null }) {
  const db = createAdminClient();
  const latest = await db.from('ai_fria_assessments').select('version').eq('organization_id', input.organizationId).eq('ai_system_id', input.aiSystemId).order('version', { ascending: false }).limit(1).maybeSingle();
  if (latest.error) fail('version_lookup', latest.error);
  const { data, error } = await db.from('ai_fria_assessments').insert({
    organization_id: input.organizationId,
    ai_system_id: input.aiSystemId,
    version: Number(latest.data?.version ?? 0) + 1,
    applicability: input.applicability,
    stage: input.applicability === 'uncertain' ? 'applicability_review' : 'draft',
    context: input.context,
    owner_id: input.actorUserId,
    highest_residual_impact: 'unknown',
    review_due_at: input.reviewDueAt ?? null,
  }).select(ASSESSMENT_COLUMNS).single();
  if (error || !data) fail('assessment_create', error);
  return data;
}

export async function getFriaAssessment(organizationId: string, assessmentId: string) {
  const db = createAdminClient();
  const { data, error } = await db.from('ai_fria_assessments').select(ASSESSMENT_COLUMNS).eq('organization_id', organizationId).eq('id', assessmentId).maybeSingle();
  if (error) fail('assessment_get', error);
  return data;
}

export async function updateFriaAssessment(organizationId: string, assessmentId: string, patch: Record<string, unknown>) {
  const db = createAdminClient();
  const { data, error } = await db.from('ai_fria_assessments').update({ ...patch, updated_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', assessmentId).select(ASSESSMENT_COLUMNS).maybeSingle();
  if (error) fail('assessment_update', error);
  return data;
}

export async function restoreFriaAssessment(before: Record<string, unknown>) {
  const db = createAdminClient();
  const { id, organization_id, ...rest } = before;
  const { error } = await db.from('ai_fria_assessments').update(rest).eq('organization_id', organization_id).eq('id', id);
  return { restored: !error, errorCode: error?.code };
}

export async function createFriaEvidence(input: { organizationId: string; assessmentId: string; actorUserId: string; controlId: string; evidenceType: string; storageReference?: string | null; sha256Digest?: string | null }) {
  const db = createAdminClient();
  const { data, error } = await db.from('ai_fria_evidence').insert({ organization_id: input.organizationId, assessment_id: input.assessmentId, submitted_by: input.actorUserId, control_id: input.controlId, evidence_type: input.evidenceType, storage_reference: input.storageReference ?? null, sha256_digest: input.sha256Digest ?? null }).select(EVIDENCE_COLUMNS).single();
  if (error || !data) fail('evidence_create', error);
  return data;
}

export async function rollbackFriaCreate(table: 'ai_fria_assessments' | 'ai_fria_evidence', organizationId: string, id: string) {
  const db = createAdminClient();
  const { error } = await db.from(table).delete().eq('organization_id', organizationId).eq('id', id);
  return { rolledBack: !error, errorCode: error?.code };
}
