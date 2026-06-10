import { createAdminClient, tryCreateAdminClient } from '@/lib/supabase/admin';
import type { AiIncidentCategory, AiIncidentDeadline, AiIncidentReportStatus, AiIncidentSeverity } from '@/lib/ai-governance/incidents';

const AI_INCIDENT_COLUMNS = [
  'id',
  'organization_id',
  'ai_system_id',
  'title',
  'summary',
  'category',
  'severity',
  'detected_at',
  'report_status',
  'authority',
  'internal_owner',
  'deadline_plan',
  'next_actions',
  'created_by',
  'created_at',
  'updated_at',
].join(',');

export type AiIncidentRecord = {
  id: string;
  organization_id: string;
  ai_system_id: string | null;
  title: string;
  summary: string;
  category: AiIncidentCategory;
  severity: AiIncidentSeverity;
  detected_at: string;
  report_status: AiIncidentReportStatus;
  authority: string | null;
  internal_owner: string | null;
  deadline_plan: AiIncidentDeadline[];
  next_actions: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateAiIncidentInput = {
  organizationId: string;
  createdBy: string;
  aiSystemId?: string | null;
  title: string;
  summary: string;
  category: AiIncidentCategory;
  severity: AiIncidentSeverity;
  detectedAt: string;
  reportStatus: AiIncidentReportStatus;
  authority?: string | null;
  internalOwner?: string | null;
  deadlinePlan: AiIncidentDeadline[];
  nextActions: string[];
};

function isMissingAiIncidentsTable(error: { code?: string; message?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205' || /ai_incidents/i.test(error.message ?? '');
}

export async function listAiIncidents(organizationId: string): Promise<AiIncidentRecord[]> {
  const supabase = tryCreateAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('ai_incidents')
    .select(AI_INCIDENT_COLUMNS)
    .eq('organization_id', organizationId)
    .order('detected_at', { ascending: false });

  if (error) {
    if (!isMissingAiIncidentsTable(error)) {
      console.warn('[ai-incidents] list_failed', { code: error.code ?? 'unknown' });
    }
    return [];
  }

  return (data ?? []) as AiIncidentRecord[];
}

export async function createAiIncident(input: CreateAiIncidentInput): Promise<AiIncidentRecord> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_incidents')
    .insert({
      organization_id: input.organizationId,
      created_by: input.createdBy,
      ai_system_id: input.aiSystemId ?? null,
      title: input.title,
      summary: input.summary,
      category: input.category,
      severity: input.severity,
      detected_at: input.detectedAt,
      report_status: input.reportStatus,
      authority: input.authority ?? null,
      internal_owner: input.internalOwner ?? null,
      deadline_plan: input.deadlinePlan,
      next_actions: input.nextActions,
    })
    .select(AI_INCIDENT_COLUMNS)
    .single();

  if (error) {
    console.warn('[ai-incidents] create_failed', { code: error.code ?? 'unknown' });
    throw error;
  }

  return data as AiIncidentRecord;
}
