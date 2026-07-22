import { createAdminClient } from '@/lib/supabase/admin';

function fail(area: string, error?: { code?: string } | null): never {
  console.warn('[qms] storage_failure', { area, code: error?.code ?? 'unknown' });
  throw new Error('qms_storage_unavailable');
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
  return {
    systems: systems.data ?? [], controls: controls.data ?? [], nonconformities: nonconformities.data ?? [],
    audits: audits.data ?? [], reviews: reviews.data ?? [], decisions: decisions.data ?? [],
  };
}

export async function createQmsSystem(input: { organizationId: string; actorUserId: string; title: string; scope: string; qualityPolicy: string; regulatoryStrategy: string }) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('create_qms_system_atomic', {
    p_organization_id: input.organizationId, p_actor_user_id: input.actorUserId, p_title: input.title,
    p_scope: input.scope, p_quality_policy: input.qualityPolicy, p_regulatory_strategy: input.regulatoryStrategy,
  });
  if (error) fail('system_create', error);
  return Array.isArray(data) ? data[0] : null;
}

export async function createQmsControl(input: { organizationId: string; qmsSystemId: string; actorUserId: string; controlCode: string; category: string; title: string; dueAt?: string | null }) {
  const db = createAdminClient();
  const { data, error } = await db.from('ai_qms_controls').insert({
    organization_id: input.organizationId, qms_system_id: input.qmsSystemId, owner_user_id: input.actorUserId,
    control_code: input.controlCode, category: input.category, title: input.title, due_at: input.dueAt ?? null,
  }).select('*').single();
  if (error || !data) fail('control_create', error);
  return data;
}

export async function createQmsNonconformity(input: { organizationId: string; qmsSystemId: string; actorUserId: string; severity: string; source: string; description: string; dueAt?: string | null }) {
  const db = createAdminClient();
  const { data, error } = await db.from('ai_qms_nonconformities').insert({
    organization_id: input.organizationId, qms_system_id: input.qmsSystemId, owner_user_id: input.actorUserId,
    severity: input.severity, source: input.source, description: input.description, due_at: input.dueAt ?? null,
  }).select('*').single();
  if (error || !data) fail('nonconformity_create', error);
  return data;
}

export async function createQmsAudit(input: { organizationId: string; qmsSystemId: string; actorUserId: string; auditType: string; scope: string; scheduledAt?: string | null }) {
  const db = createAdminClient();
  const { data, error } = await db.from('ai_qms_audits').insert({
    organization_id: input.organizationId, qms_system_id: input.qmsSystemId, lead_auditor_user_id: input.actorUserId,
    audit_type: input.auditType, scope: input.scope, scheduled_at: input.scheduledAt ?? null,
  }).select('*').single();
  if (error || !data) fail('audit_create', error);
  return data;
}

export async function createQmsManagementReview(input: { organizationId: string; qmsSystemId: string; actorUserId: string; periodStart: string; periodEnd: string }) {
  const db = createAdminClient();
  const { data, error } = await db.from('ai_qms_management_reviews').insert({
    organization_id: input.organizationId, qms_system_id: input.qmsSystemId, chair_user_id: input.actorUserId,
    period_start: input.periodStart, period_end: input.periodEnd, status: 'scheduled',
  }).select('*').single();
  if (error || !data) fail('management_review_create', error);
  return data;
}

export async function approveQmsSystem(input: { organizationId: string; qmsSystemId: string; expectedUpdatedAt: string; actorUserId: string; rationale: string }) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('approve_qms_system_atomic', {
    p_organization_id: input.organizationId, p_qms_system_id: input.qmsSystemId,
    p_expected_updated_at: input.expectedUpdatedAt, p_actor_user_id: input.actorUserId, p_rationale: input.rationale,
  });
  if (error) fail('system_approve', error);
  return Array.isArray(data) ? data[0] : null;
}

export async function rollbackQmsCreate(table: 'ai_qms_systems' | 'ai_qms_controls' | 'ai_qms_nonconformities' | 'ai_qms_audits' | 'ai_qms_management_reviews', organizationId: string, id: string) {
  const db = createAdminClient();
  const { error } = await db.from(table).delete().eq('organization_id', organizationId).eq('id', id);
  return !error;
}
