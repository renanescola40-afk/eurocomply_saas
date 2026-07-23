import { createAdminClient } from '@/lib/supabase/admin';

function fail(area: string, error?: { code?: string } | null): never {
  console.warn('[qms] storage_failure', { area, code: error?.code ?? 'unknown' });
  throw new Error('qms_storage_unavailable');
}

async function rpcOne(name: string, args: Record<string, unknown>, area: string) {
  const db = createAdminClient();
  const { data, error } = await db.rpc(name, args);
  if (error) fail(area, error);
  return Array.isArray(data) ? data[0] : null;
}

export async function listQmsSnapshot(organizationId: string) {
  const db = createAdminClient();
  const [systems, controls, nonconformities, audits, reviews, decisions] = await Promise.all([
    db.from('ai_qms_systems').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    db.from('ai_qms_controls').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    db.from('ai_qms_nonconformities').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    db.from('ai_qms_audits').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    db.from('ai_qms_management_reviews').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    db.from('ai_qms_decisions').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }),
  ]);
  for (const [area, result] of [['systems', systems], ['controls', controls], ['nonconformities', nonconformities], ['audits', audits], ['reviews', reviews], ['decisions', decisions]] as const) {
    if (result.error) fail(area, result.error);
  }
  return { systems: systems.data ?? [], controls: controls.data ?? [], nonconformities: nonconformities.data ?? [], audits: audits.data ?? [], reviews: reviews.data ?? [], decisions: decisions.data ?? [] };
}

export function createQmsSystem(input: { organizationId: string; actorUserId: string; title: string; scope: string; qualityPolicy: string; regulatoryStrategy: string }) {
  return rpcOne('create_qms_system_atomic', { p_organization_id: input.organizationId, p_actor_user_id: input.actorUserId, p_title: input.title, p_scope: input.scope, p_quality_policy: input.qualityPolicy, p_regulatory_strategy: input.regulatoryStrategy }, 'system_create');
}

async function assertMutableParent(organizationId: string, qmsSystemId: string) {
  const db = createAdminClient();
  const { data, error } = await db.from('ai_qms_systems').select('id,status').eq('organization_id', organizationId).eq('id', qmsSystemId).maybeSingle();
  if (error) fail('system_parent', error);
  if (!data) throw new Error('qms_not_found');
  if (data.status === 'approved' || data.status === 'retired') throw new Error('qms_immutable_state');
}

export async function createQmsControl(input: { organizationId: string; qmsSystemId: string; actorUserId: string; controlCode: string; category: string; title: string; dueAt?: string | null }) {
  await assertMutableParent(input.organizationId, input.qmsSystemId);
  const db = createAdminClient();
  const { data, error } = await db.from('ai_qms_controls').insert({ organization_id: input.organizationId, qms_system_id: input.qmsSystemId, owner_user_id: input.actorUserId, control_code: input.controlCode, category: input.category, title: input.title, due_at: input.dueAt ?? null }).select('*').single();
  if (error || !data) fail('control_create', error);
  return data;
}

export async function createQmsNonconformity(input: { organizationId: string; qmsSystemId: string; actorUserId: string; severity: string; source: string; description: string; dueAt?: string | null }) {
  await assertMutableParent(input.organizationId, input.qmsSystemId);
  const db = createAdminClient();
  const { data, error } = await db.from('ai_qms_nonconformities').insert({ organization_id: input.organizationId, qms_system_id: input.qmsSystemId, owner_user_id: input.actorUserId, severity: input.severity, source: input.source, description: input.description, due_at: input.dueAt ?? null }).select('*').single();
  if (error || !data) fail('nonconformity_create', error);
  return data;
}

export async function createQmsAudit(input: { organizationId: string; qmsSystemId: string; actorUserId: string; auditType: string; scope: string; scheduledAt?: string | null }) {
  await assertMutableParent(input.organizationId, input.qmsSystemId);
  const db = createAdminClient();
  const { data, error } = await db.from('ai_qms_audits').insert({ organization_id: input.organizationId, qms_system_id: input.qmsSystemId, lead_auditor_user_id: input.actorUserId, audit_type: input.auditType, scope: input.scope, scheduled_at: input.scheduledAt ?? null }).select('*').single();
  if (error || !data) fail('audit_create', error);
  return data;
}

export async function createQmsManagementReview(input: { organizationId: string; qmsSystemId: string; actorUserId: string; periodStart: string; periodEnd: string }) {
  await assertMutableParent(input.organizationId, input.qmsSystemId);
  const db = createAdminClient();
  const { data, error } = await db.from('ai_qms_management_reviews').insert({ organization_id: input.organizationId, qms_system_id: input.qmsSystemId, chair_user_id: input.actorUserId, period_start: input.periodStart, period_end: input.periodEnd, status: 'scheduled' }).select('*').single();
  if (error || !data) fail('management_review_create', error);
  return data;
}

export function configureQmsSystem(input: { organizationId: string; qmsSystemId: string; expectedUpdatedAt: string; actorUserId: string; reviewerUserId: string; approverUserId: string }) {
  return rpcOne('configure_qms_system_atomic', { p_organization_id: input.organizationId, p_qms_system_id: input.qmsSystemId, p_expected_updated_at: input.expectedUpdatedAt, p_actor_user_id: input.actorUserId, p_reviewer_user_id: input.reviewerUserId, p_approver_user_id: input.approverUserId }, 'system_configure');
}

export function completeQmsControl(input: { organizationId: string; controlId: string; expectedUpdatedAt: string; actorUserId: string; status: string; rationale: string; evidenceReference: string | null; evidenceDigest: string | null }) {
  return rpcOne('complete_qms_control_atomic', { p_organization_id: input.organizationId, p_control_id: input.controlId, p_expected_updated_at: input.expectedUpdatedAt, p_actor_user_id: input.actorUserId, p_status: input.status, p_rationale: input.rationale, p_evidence_reference: input.evidenceReference, p_evidence_digest: input.evidenceDigest }, 'control_complete');
}

export function acceptQmsAudit(input: { organizationId: string; auditId: string; expectedUpdatedAt: string; actorUserId: string; findingsCount: number; highFindingsCount: number; criticalFindingsCount: number; reportReference: string; reportDigest: string }) {
  return rpcOne('accept_qms_audit_atomic', { p_organization_id: input.organizationId, p_audit_id: input.auditId, p_expected_updated_at: input.expectedUpdatedAt, p_actor_user_id: input.actorUserId, p_findings_count: input.findingsCount, p_high_findings_count: input.highFindingsCount, p_critical_findings_count: input.criticalFindingsCount, p_report_reference: input.reportReference, p_report_digest: input.reportDigest }, 'audit_accept');
}

export function approveQmsManagementReview(input: { organizationId: string; reviewId: string; expectedUpdatedAt: string; actorUserId: string; reviewerUserId: string; inputsSummary: string; decisionsSummary: string; evidenceReference: string; evidenceDigest: string }) {
  return rpcOne('approve_qms_management_review_atomic', { p_organization_id: input.organizationId, p_review_id: input.reviewId, p_expected_updated_at: input.expectedUpdatedAt, p_actor_user_id: input.actorUserId, p_reviewer_user_id: input.reviewerUserId, p_inputs_summary: input.inputsSummary, p_decisions_summary: input.decisionsSummary, p_evidence_reference: input.evidenceReference, p_evidence_digest: input.evidenceDigest }, 'management_review_approve');
}

export function closeQmsNonconformity(input: { organizationId: string; nonconformityId: string; expectedUpdatedAt: string; actorUserId: string; rootCause: string; correctiveAction: string }) {
  return rpcOne('close_qms_nonconformity_atomic', { p_organization_id: input.organizationId, p_nonconformity_id: input.nonconformityId, p_expected_updated_at: input.expectedUpdatedAt, p_actor_user_id: input.actorUserId, p_root_cause: input.rootCause, p_corrective_action: input.correctiveAction }, 'nonconformity_close');
}

export function approveQmsSystem(input: { organizationId: string; qmsSystemId: string; expectedUpdatedAt: string; actorUserId: string; rationale: string }) {
  return rpcOne('approve_qms_system_atomic', { p_organization_id: input.organizationId, p_qms_system_id: input.qmsSystemId, p_expected_updated_at: input.expectedUpdatedAt, p_actor_user_id: input.actorUserId, p_rationale: input.rationale }, 'system_approve');
}

export async function rollbackQmsApproval(input: { organizationId: string; qmsSystemId: string; expectedUpdatedAt: string; actorUserId: string }) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('rollback_qms_approval_atomic', { p_organization_id: input.organizationId, p_qms_system_id: input.qmsSystemId, p_expected_updated_at: input.expectedUpdatedAt, p_actor_user_id: input.actorUserId });
  return !error && data === true;
}

export async function rollbackQmsCreate(table: 'ai_qms_systems' | 'ai_qms_controls' | 'ai_qms_nonconformities' | 'ai_qms_audits' | 'ai_qms_management_reviews', organizationId: string, id: string) {
  const db = createAdminClient();
  const { error } = await db.from(table).delete().eq('organization_id', organizationId).eq('id', id);
  return !error;
}
