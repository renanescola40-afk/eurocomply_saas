import { createAdminClient } from '@/lib/supabase/admin';

function fail(area: string, error?: { code?: string } | null): never {
  console.warn('[provider-data-governance] storage_failure', { area, code: error?.code ?? 'unknown' });
  throw new Error('provider_data_storage_unavailable');
}

export async function listProviderDataSnapshot(organizationId: string) {
  const db = createAdminClient();
  const [programs, datasets, assessments, mitigations, evidence, decisions] = await Promise.all([
    db.from('ai_provider_data_programs').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    db.from('ai_provider_datasets').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    db.from('ai_provider_dataset_assessments').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    db.from('ai_provider_dataset_mitigations').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    db.from('ai_provider_dataset_evidence').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }),
    db.from('ai_provider_data_decisions').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }),
  ]);
  for (const [area, result] of [['programs', programs], ['datasets', datasets], ['assessments', assessments], ['mitigations', mitigations], ['evidence', evidence], ['decisions', decisions]] as const) {
    if (result.error) fail(area, result.error);
  }
  return { programs: programs.data ?? [], datasets: datasets.data ?? [], assessments: assessments.data ?? [], mitigations: mitigations.data ?? [], evidence: evidence.data ?? [], decisions: decisions.data ?? [] };
}

export async function createProviderDataProgram(input: { organizationId: string; actorUserId: string; systemReference: string; applicability: string; providerRole: string }) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('create_provider_data_program_atomic', {
    p_organization_id: input.organizationId,
    p_actor_user_id: input.actorUserId,
    p_system_reference: input.systemReference,
    p_applicability: input.applicability,
    p_provider_role: input.providerRole,
  });
  if (error) fail('program_create', error);
  return Array.isArray(data) ? data[0] : null;
}

export async function createProviderDataset(input: { organizationId: string; programId: string; actorUserId: string; name: string; purpose: string; lifecycleRole: string; sourceCategory: string; datasetVersion: string; sourceVersion: string }) {
  const db = createAdminClient();
  const { data, error } = await db.from('ai_provider_datasets').insert({
    organization_id: input.organizationId,
    program_id: input.programId,
    name: input.name,
    purpose: input.purpose,
    lifecycle_role: input.lifecycleRole,
    source_category: input.sourceCategory,
    dataset_version: input.datasetVersion,
    source_version: input.sourceVersion,
    owner_user_id: input.actorUserId,
    last_material_change_at: new Date().toISOString(),
  }).select('*').single();
  if (error || !data) fail('dataset_create', error);
  return data;
}

export async function approveProviderDataProgram(input: { organizationId: string; programId: string; expectedUpdatedAt: string; actorUserId: string; rationale: string }) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('approve_provider_data_program_atomic', {
    p_organization_id: input.organizationId,
    p_program_id: input.programId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_actor_user_id: input.actorUserId,
    p_rationale: input.rationale,
  });
  if (error) fail('program_approve', error);
  return Array.isArray(data) ? data[0] : null;
}

export async function rollbackProviderDataCreate(table: 'ai_provider_data_programs' | 'ai_provider_datasets', organizationId: string, id: string) {
  const db = createAdminClient();
  const { error } = await db.from(table).delete().eq('organization_id', organizationId).eq('id', id);
  return !error;
}