import { createAdminClient } from '@/lib/supabase/admin';

function fail(area: string, error?: { code?: string } | null): never {
  console.warn('[annex-iv] storage_failure', { area, code: error?.code ?? 'unknown' });
  throw new Error('annex_iv_storage_unavailable');
}

export async function listAnnexIvSnapshot(organizationId: string) {
  const db = createAdminClient();
  const [packages, sections, evidence, changes, decisions] = await Promise.all([
    db.from('ai_annex_iv_packages').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    db.from('ai_annex_iv_sections').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    db.from('ai_annex_iv_evidence').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }),
    db.from('ai_annex_iv_changes').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }),
    db.from('ai_annex_iv_decisions').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }),
  ]);
  for (const [area, result] of [['packages', packages], ['sections', sections], ['evidence', evidence], ['changes', changes], ['decisions', decisions]] as const) {
    if (result.error) fail(area, result.error);
  }
  return { packages: packages.data ?? [], sections: sections.data ?? [], evidence: evidence.data ?? [], changes: changes.data ?? [], decisions: decisions.data ?? [] };
}

export async function createAnnexIvPackage(input: { organizationId: string; actorUserId: string; systemReference: string; systemVersion: string; applicability: string }) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('create_annex_iv_package_atomic', {
    p_organization_id: input.organizationId,
    p_actor_user_id: input.actorUserId,
    p_system_reference: input.systemReference,
    p_system_version: input.systemVersion,
    p_applicability: input.applicability,
  });
  if (error) fail('package_create', error);
  return Array.isArray(data) ? data[0] : null;
}

export async function updateAnnexIvSection(input: { organizationId: string; packageId: string; sectionCode: string; expectedUpdatedAt: string; patch: Record<string, unknown> }) {
  const db = createAdminClient();
  const { data, error } = await db.from('ai_annex_iv_sections').update(input.patch)
    .eq('organization_id', input.organizationId).eq('package_id', input.packageId)
    .eq('section_code', input.sectionCode).eq('updated_at', input.expectedUpdatedAt)
    .select('*').maybeSingle();
  if (error) fail('section_update', error);
  return data;
}

export async function createAnnexIvEvidence(input: { organizationId: string; packageId: string; sectionId: string; actorUserId: string; evidenceType: string; evidenceReference: string; evidenceDigest: string; sourceVersion: string }) {
  const db = createAdminClient();
  const { data, error } = await db.from('ai_annex_iv_evidence').insert({
    organization_id: input.organizationId, package_id: input.packageId, section_id: input.sectionId,
    evidence_type: input.evidenceType, evidence_reference: input.evidenceReference,
    evidence_digest: input.evidenceDigest, source_version: input.sourceVersion,
    submitted_by_user_id: input.actorUserId, collected_at: new Date().toISOString(),
  }).select('*').single();
  if (error || !data) fail('evidence_create', error);
  return data;
}

export async function approveAnnexIvPackage(input: { organizationId: string; packageId: string; expectedUpdatedAt: string; actorUserId: string; rationale: string }) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('approve_annex_iv_package_atomic', {
    p_organization_id: input.organizationId, p_package_id: input.packageId,
    p_expected_updated_at: input.expectedUpdatedAt, p_actor_user_id: input.actorUserId,
    p_rationale: input.rationale,
  });
  if (error) fail('package_approve', error);
  return Array.isArray(data) ? data[0] : null;
}

export async function rollbackAnnexIvCreate(table: 'ai_annex_iv_packages' | 'ai_annex_iv_evidence', organizationId: string, id: string) {
  const db = createAdminClient();
  const { error } = await db.from(table).delete().eq('organization_id', organizationId).eq('id', id);
  return !error;
}
