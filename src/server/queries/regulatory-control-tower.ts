import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildRegulatoryControlTower,
  type RegulatoryControlTowerInput,
  type RegulatoryWorkflowRecord,
} from '@/server/ai-governance/regulatory-control-tower';

type StatusRow = {
  id: string;
  status: string;
  updated_at: string | null;
};

type CreatedStatusRow = {
  id: string;
  status: string;
  created_at: string | null;
};

type StageRow = {
  id: string;
  stage: string;
  updated_at: string | null;
};

function throwQueryError(area: string, error: { code?: string } | null) {
  console.warn('[regulatory-control-tower] query_failed', {
    area,
    code: error?.code ?? 'unknown',
  });
  throw new Error('regulatory_control_tower_storage_unavailable');
}

function statusRecord(row: StatusRow | undefined): RegulatoryWorkflowRecord | null {
  if (!row) return null;
  return {
    id: row.id,
    lifecycleState: row.status,
    updatedAt: row.updated_at,
  };
}

function createdStatusRecord(row: CreatedStatusRow | undefined): RegulatoryWorkflowRecord | null {
  if (!row) return null;
  return {
    id: row.id,
    lifecycleState: row.status,
    updatedAt: row.created_at,
  };
}

function stageRecord(row: StageRow | undefined): RegulatoryWorkflowRecord | null {
  if (!row) return null;
  return {
    id: row.id,
    lifecycleState: row.stage,
    updatedAt: row.updated_at,
  };
}

export async function getRegulatoryControlTowerSnapshot(organizationId: string) {
  const supabase = createAdminClient();

  const [
    literacyResult,
    friaResult,
    prohibitedResult,
    providerDataResult,
    annexIvResult,
    qmsResult,
    article50Result,
    conformityResult,
  ] = await Promise.all([
    supabase
      .from('ai_literacy_programs')
      .select('id,status,updated_at')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase
      .from('ai_fria_assessments')
      .select('id,stage,updated_at')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase
      .from('ai_prohibited_practice_reviews')
      .select('id,status,updated_at')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase
      .from('ai_provider_data_programs')
      .select('id,status,updated_at')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase
      .from('ai_annex_iv_packages')
      .select('id,status,updated_at')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase
      .from('ai_qms_systems')
      .select('id,status,updated_at')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase
      .from('ai_article50_assessments')
      .select('id,status,created_at')
      .eq('organization_id', organizationId)
      .order('version', { ascending: false })
      .limit(1),
    supabase
      .from('ai_conformity_assessments')
      .select('id,status,updated_at')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(1),
  ]);

  const results = [
    ['ai_literacy_programs', literacyResult],
    ['ai_fria_assessments', friaResult],
    ['ai_prohibited_practice_reviews', prohibitedResult],
    ['ai_provider_data_programs', providerDataResult],
    ['ai_annex_iv_packages', annexIvResult],
    ['ai_qms_systems', qmsResult],
    ['ai_article50_assessments', article50Result],
    ['ai_conformity_assessments', conformityResult],
  ] as const;

  for (const [area, result] of results) {
    if (result.error) throwQueryError(area, result.error);
  }

  const input: RegulatoryControlTowerInput = {
    ai_literacy: statusRecord((literacyResult.data?.[0] ?? undefined) as StatusRow | undefined),
    fria: stageRecord((friaResult.data?.[0] ?? undefined) as StageRow | undefined),
    prohibited_practices: statusRecord((prohibitedResult.data?.[0] ?? undefined) as StatusRow | undefined),
    high_risk_provider_data: statusRecord((providerDataResult.data?.[0] ?? undefined) as StatusRow | undefined),
    annex_iv: statusRecord((annexIvResult.data?.[0] ?? undefined) as StatusRow | undefined),
    qms: statusRecord((qmsResult.data?.[0] ?? undefined) as StatusRow | undefined),
    article_50_transparency: createdStatusRecord((article50Result.data?.[0] ?? undefined) as CreatedStatusRow | undefined),
    conformity: statusRecord((conformityResult.data?.[0] ?? undefined) as StatusRow | undefined),
  };

  return buildRegulatoryControlTower(input);
}
