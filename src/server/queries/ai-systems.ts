import { createAdminClient } from '@/lib/supabase/admin';
import type { AiActRiskLevel, AiRiskDomain, AiSystemRole, AiSystemStatus } from '@/server/ai-governance/classifier';
import { ApiSecurityError } from '@/server/security/api-guards';

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

const ATOMIC_CREATE_RPC = 'create_ai_system_atomic';
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

type AtomicCreateOutcome = 'created' | 'invalid_input' | 'subscription_required' | 'quota_exceeded';

type AtomicCreateRow = {
  outcome: AtomicCreateOutcome;
  system: AiSystemRecord | null;
};

type AtomicReassessmentRow = {
  outcome: 'updated' | 'state_changed' | 'not_found' | 'invalid_input';
  system: AiSystemRecord | null;
};

function isAiSystemRecord(value: unknown): value is AiSystemRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const system = value as Partial<AiSystemRecord>;
  return Boolean(system.id && system.organization_id && system.updated_at);
}

function firstAtomicCreateRow(value: unknown): AtomicCreateRow | null {
  if (!Array.isArray(value) || value.length !== 1) return null;
  const candidate = value[0];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;

  const row = candidate as Partial<AtomicCreateRow>;
  if (!['created', 'invalid_input', 'subscription_required', 'quota_exceeded'].includes(String(row.outcome))) return null;
  if (row.outcome === 'created' && !isAiSystemRecord(row.system)) return null;

  return row as AtomicCreateRow;
}

function firstAtomicReassessmentRow(value: unknown): AtomicReassessmentRow | null {
  if (!Array.isArray(value) || value.length !== 1) return null;
  const candidate = value[0];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;

  const row = candidate as Partial<AtomicReassessmentRow>;
  if (!['updated', 'state_changed', 'not_found', 'invalid_input'].includes(String(row.outcome))) return null;
  if (row.outcome === 'updated' && !isAiSystemRecord(row.system)) return null;

  return row as AtomicReassessmentRow;
}

function aiSystemPatch(input: Omit<CreateAiSystemInput, 'organizationId' | 'createdBy'>) {
  return {
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
  };
}

export async function listAiSystems(organizationId: string): Promise<AiSystemRecord[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_systems')
    .select(AI_SYSTEM_COLUMNS)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[ai-systems] list_failed', { code: error.code ?? 'unknown' });
    throw new Error('Unable to load AI systems.');
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
    throw new Error('Unable to load AI system.');
  }

  return data as unknown as AiSystemRecord | null;
}

export async function listAiSystemHistory(systemId: string, organizationId: string): Promise<AiSystemHistoryRecord[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_system_history')
    .select('id,ai_system_id,organization_id,actor_user_id,action,snapshot,created_at')
    .eq('organization_id', organizationId)
    .eq('ai_system_id', systemId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[ai-systems] history_list_failed', { code: error.code ?? 'unknown' });
    throw new Error('Unable to load AI system history.');
  }

  return (data ?? []) as unknown as AiSystemHistoryRecord[];
}

export async function createAiSystem(input: CreateAiSystemInput): Promise<AiSystemRecord> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(ATOMIC_CREATE_RPC, {
    p_organization_id: input.organizationId,
    p_actor_user_id: input.createdBy,
    p_system: aiSystemPatch(input),
  });

  if (error) {
    console.warn('[ai-systems] atomic_create_failed', { code: error.code ?? 'unknown' });
    throw new Error('Unable to create AI system.');
  }

  const transition = firstAtomicCreateRow(data);
  if (!transition) {
    throw new Error('AI system creation RPC returned an invalid result');
  }

  if (transition.outcome === 'subscription_required') {
    throw new ApiSecurityError({
      code: 'permission_denied',
      message: 'An active paid subscription or signed contract is required to create AI systems.',
      status: 403,
    });
  }

  if (transition.outcome === 'quota_exceeded') {
    throw new ApiSecurityError({
      code: 'permission_denied',
      message: 'The AI system limit for this organization plan has been reached.',
      status: 403,
    });
  }

  if (transition.outcome !== 'created' || !transition.system) {
    throw new Error('AI system creation RPC rejected validated input');
  }

  return transition.system;
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
    p_patch: aiSystemPatch(input),
  });

  if (error) {
    console.warn('[ai-systems] atomic_reassessment_failed', { code: error.code ?? 'unknown' });
    throw new Error('Unable to reassess AI system.');
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
