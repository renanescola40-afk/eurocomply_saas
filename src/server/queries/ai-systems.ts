import { createAdminClient, tryCreateAdminClient } from '@/lib/supabase/admin';
import type { AiActRiskLevel, AiRiskDomain, AiSystemRole, AiSystemStatus } from '@/server/ai-governance/classifier';

const AI_SYSTEM_COLUMNS = [
  'id',
  'organization_id',
  'name',
  'owner_team',
  'category',
  'country_market',
  'processed_data',
  'vendor_name',
  'model_name',
  'use_case',
  'role',
  'lifecycle_status',
  'risk_domain',
  'uses_personal_data',
  'interacts_with_people',
  'generates_content',
  'biometric_identification',
  'manipulative_or_exploitative',
  'risk_level',
  'classification_summary',
  'obligations',
  'next_actions',
  'last_reassessed_at',
  'created_by',
  'created_at',
  'updated_at',
].join(',');

const ATOMIC_REASSESSMENT_RPC = 'reassess_ai_system_atomic';

export type AiSystemHistoryRecord = {
  id: string;
  ai_system_id: string;
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  snapshot: Record<string, unknown>;
  created_at: string;
};

export type AiSystemRecord = {
  id: string;
  organization_id: string;
  name: string;
  owner_team: string | null;
  category: string | null;
  country_market: string | null;
  processed_data: string | null;
  vendor_name: string | null;
  model_name: string | null;
  use_case: string;
  role: AiSystemRole;
  lifecycle_status: AiSystemStatus;
  risk_domain: AiRiskDomain;
  uses_personal_data: boolean;
  interacts_with_people: boolean;
  generates_content: boolean;
  biometric_identification: boolean;
  manipulative_or_exploitative: boolean;
  risk_level: AiActRiskLevel;
  classification_summary: string;
  obligations: string[];
  next_actions: string[];
  last_reassessed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateAiSystemInput = {
  organizationId: string;
  createdBy: string;
  name: string;
  ownerTeam?: string | null;
  category?: string | null;
  countryMarket?: string | null;
  processedData?: string | null;
  vendorName?: string | null;
  modelName?: string | null;
  useCase: string;
  role: AiSystemRole;
  lifecycleStatus: AiSystemStatus;
  riskDomain: AiRiskDomain;
  usesPersonalData: boolean;
  interactsWithPeople: boolean;
  generatesContent: boolean;
  biometricIdentification: boolean;
  manipulativeOrExploitative: boolean;
  riskLevel: AiActRiskLevel;
  classificationSummary: string;
  obligations: string[];
  nextActions: string[];
};

export type UpdateAiSystemInput = Omit<CreateAiSystemInput, 'organizationId' | 'createdBy'> & {
  reassessedBy: string;
  expectedUpdatedAt: string;
};

export type UpdateAiSystemResult =
  | { status: 'updated'; system: AiSystemRecord }
  | { status: 'conflict' };

type AtomicReassessmentRow = {
  outcome: 'updated' | 'state_changed' | 'not_found' | 'invalid_input';
  system: AiSystemRecord | null;
};

function isMissingAiSystemsTable(error: { code?: string; message?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205' || /ai_systems/i.test(error.message ?? '');
}

function firstAtomicReassessmentRow(value: unknown): AtomicReassessmentRow | null {
  if (!Array.isArray(value) || value.length !== 1) return null;
  const candidate = value[0];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;

  const row = candidate as Partial<AtomicReassessmentRow>;
  if (!['updated', 'state_changed', 'not_found', 'invalid_input'].includes(String(row.outcome))) return null;
  if (row.outcome === 'updated') {
    if (!row.system || typeof row.system !== 'object' || Array.isArray(row.system)) return null;
    const system = row.system as Partial<AiSystemRecord>;
    if (!system.id || !system.organization_id || !system.updated_at) return null;
  }

  return row as AtomicReassessmentRow;
}

async function insertAiSystemHistory(input: {
  aiSystemId: string;
  organizationId: string;
  actorUserId: string;
  action: 'created' | 'reassessed';
  snapshot: Record<string, unknown>;
}) {
  const supabase = tryCreateAdminClient();
  if (!supabase) return;

  const { error } = await supabase.from('ai_system_history').insert({
    ai_system_id: input.aiSystemId,
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId,
    action: input.action,
    snapshot: input.snapshot,
  });

  if (error && !isMissingAiSystemsTable(error)) {
    console.warn('[ai-systems] history_insert_failed', { code: error.code ?? 'unknown' });
  }
}

export async function listAiSystems(organizationId: string): Promise<AiSystemRecord[]> {
  const supabase = tryCreateAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('ai_systems')
    .select(AI_SYSTEM_COLUMNS)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    if (!isMissingAiSystemsTable(error)) {
      console.warn('[ai-systems] list_failed', { code: error.code ?? 'unknown' });
    }
    return [];
  }

  return (data ?? []) as unknown as AiSystemRecord[];
}

export async function getAiSystem(systemId: string, organizationId: string): Promise<AiSystemRecord | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_systems')
    .select(AI_SYSTEM_COLUMNS)
    .eq('id', systemId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    console.warn('[ai-systems] get_failed', { code: error.code ?? 'unknown' });
    throw error;
  }

  return data as unknown as AiSystemRecord | null;
}

export async function listAiSystemHistory(systemId: string, organizationId: string): Promise<AiSystemHistoryRecord[]> {
  const supabase = tryCreateAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('ai_system_history')
    .select('id,ai_system_id,organization_id,actor_user_id,action,snapshot,created_at')
    .eq('organization_id', organizationId)
    .eq('ai_system_id', systemId)
    .order('created_at', { ascending: false });

  if (error) {
    if (!isMissingAiSystemsTable(error)) {
      console.warn('[ai-systems] history_list_failed', { code: error.code ?? 'unknown' });
    }
    return [];
  }

  return (data ?? []) as unknown as AiSystemHistoryRecord[];
}

export async function createAiSystem(input: CreateAiSystemInput): Promise<AiSystemRecord> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_systems')
    .insert({
      organization_id: input.organizationId,
      created_by: input.createdBy,
      name: input.name,
      owner_team: input.ownerTeam ?? null,
      category: input.category ?? null,
      country_market: input.countryMarket ?? null,
      processed_data: input.processedData ?? null,
      vendor_name: input.vendorName ?? null,
      model_name: input.modelName ?? null,
      use_case: input.useCase,
      role: input.role,
      lifecycle_status: input.lifecycleStatus,
      risk_domain: input.riskDomain,
      uses_personal_data: input.usesPersonalData,
      interacts_with_people: input.interactsWithPeople,
      generates_content: input.generatesContent,
      biometric_identification: input.biometricIdentification,
      manipulative_or_exploitative: input.manipulativeOrExploitative,
      risk_level: input.riskLevel,
      classification_summary: input.classificationSummary,
      obligations: input.obligations,
      next_actions: input.nextActions,
      last_reassessed_at: new Date().toISOString(),
    })
    .select(AI_SYSTEM_COLUMNS)
    .single();

  if (error) {
    console.warn('[ai-systems] create_failed', { code: error.code ?? 'unknown' });
    throw error;
  }

  const system = data as unknown as AiSystemRecord;
  await insertAiSystemHistory({
    aiSystemId: system.id,
    organizationId: input.organizationId,
    actorUserId: input.createdBy,
    action: 'created',
    snapshot: {
      name: system.name,
      riskLevel: system.risk_level,
      lifecycleStatus: system.lifecycle_status,
      riskDomain: system.risk_domain,
    },
  });

  return system;
}

export async function updateAiSystem(
  systemId: string,
  organizationId: string,
  input: UpdateAiSystemInput,
): Promise<UpdateAiSystemResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(ATOMIC_REASSESSMENT_RPC, {
    p_system_id: systemId,
    p_organization_id: organizationId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_actor_user_id: input.reassessedBy,
    p_patch: {
      name: input.name,
      owner_team: input.ownerTeam ?? null,
      category: input.category ?? null,
      country_market: input.countryMarket ?? null,
      processed_data: input.processedData ?? null,
      vendor_name: input.vendorName ?? null,
      model_name: input.modelName ?? null,
      use_case: input.useCase,
      role: input.role,
      lifecycle_status: input.lifecycleStatus,
      risk_domain: input.riskDomain,
      uses_personal_data: input.usesPersonalData,
      interacts_with_people: input.interactsWithPeople,
      generates_content: input.generatesContent,
      biometric_identification: input.biometricIdentification,
      manipulative_or_exploitative: input.manipulativeOrExploitative,
      risk_level: input.riskLevel,
      classification_summary: input.classificationSummary,
      obligations: input.obligations,
      next_actions: input.nextActions,
    },
  });

  if (error) {
    console.warn('[ai-systems] atomic_reassessment_failed', { code: error.code ?? 'unknown' });
    throw error;
  }

  const transition = firstAtomicReassessmentRow(data);
  if (!transition) {
    throw new Error('AI system reassessment RPC returned an invalid result');
  }

  if (transition.outcome === 'state_changed' || transition.outcome === 'not_found') {
    return { status: 'conflict' };
  }

  if (transition.outcome !== 'updated' || !transition.system) {
    throw new Error('AI system reassessment RPC rejected validated input');
  }

  return { status: 'updated', system: transition.system };
}
