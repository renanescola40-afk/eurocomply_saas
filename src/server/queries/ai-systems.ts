import { createAdminClient, tryCreateAdminClient } from '@/lib/supabase/admin';
import type { AiActRiskLevel, AiRiskDomain, AiSystemRole, AiSystemStatus } from '@/server/ai-governance/classifier';

const AI_SYSTEM_COLUMNS = [
  'id',
  'organization_id',
  'name',
  'owner_team',
  'vendor_name',
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
  'created_by',
  'created_at',
  'updated_at',
].join(',');

export type AiSystemRecord = {
  id: string;
  organization_id: string;
  name: string;
  owner_team: string | null;
  vendor_name: string | null;
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
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateAiSystemInput = {
  organizationId: string;
  createdBy: string;
  name: string;
  ownerTeam?: string | null;
  vendorName?: string | null;
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

function isMissingAiSystemsTable(error: { code?: string; message?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205' || /ai_systems/i.test(error.message ?? '');
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

export async function createAiSystem(input: CreateAiSystemInput): Promise<AiSystemRecord> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_systems')
    .insert({
      organization_id: input.organizationId,
      created_by: input.createdBy,
      name: input.name,
      owner_team: input.ownerTeam ?? null,
      vendor_name: input.vendorName ?? null,
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
    })
    .select(AI_SYSTEM_COLUMNS)
    .single();

  if (error) {
    console.warn('[ai-systems] create_failed', { code: error.code ?? 'unknown' });
    throw error;
  }

  return data as unknown as AiSystemRecord;
}
