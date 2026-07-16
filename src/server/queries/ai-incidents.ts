import { randomUUID } from 'crypto';

import { createAdminClient } from '@/lib/supabase/admin';
import type { AiIncidentCategory, AiIncidentDeadline, AiIncidentReportStatus, AiIncidentSeverity } from '@/lib/ai-governance/incidents';
import { buildAuditChainRecord } from '@/server/security/audit-chain';

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

const ATOMIC_INCIDENT_RPC = 'create_ai_incident_with_audit_atomic';
const MAX_ATOMIC_CREATE_ATTEMPTS = 4;

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
  auditMetadata: Record<string, unknown>;
};

type AtomicIncidentRow = {
  outcome: 'created' | 'invalid_ai_system' | 'invalid_input';
  incident: AiIncidentRecord | null;
};

function isMissingAiIncidentsTable(error: { code?: string; message?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205' || /ai_incidents/i.test(error.message ?? '');
}

function isPreviousHashMismatch(error: { code?: string; message?: string }) {
  return error.code === '40001' || /previous hash mismatch/i.test(error.message ?? '');
}

function firstAtomicIncidentRow(value: unknown): AtomicIncidentRow | null {
  if (!Array.isArray(value) || value.length !== 1) return null;
  const candidate = value[0];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;

  const row = candidate as Partial<AtomicIncidentRow>;
  if (!['created', 'invalid_ai_system', 'invalid_input'].includes(String(row.outcome))) return null;
  if (row.outcome === 'created') {
    if (!row.incident || typeof row.incident !== 'object' || Array.isArray(row.incident)) return null;
    if (!row.incident.id || !row.incident.organization_id || !row.incident.updated_at) return null;
  }

  return row as AtomicIncidentRow;
}

async function getPreviousAuditHash(organizationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('audit_events')
    .select('event_hash')
    .eq('organization_id', organizationId)
    .not('event_hash', 'is', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[ai-incidents] previous_audit_hash_failed', { code: error.code ?? 'unknown' });
    throw error;
  }

  const hash = (data as { event_hash?: unknown } | null)?.event_hash;
  return typeof hash === 'string' ? hash : null;
}

export async function listAiIncidents(organizationId: string): Promise<AiIncidentRecord[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_incidents')
    .select(AI_INCIDENT_COLUMNS)
    .eq('organization_id', organizationId)
    .order('detected_at', { ascending: false });

  if (error) {
    console.warn('[ai-incidents] list_failed', { code: error.code ?? 'unknown' });
    throw error;
  }

  return (data ?? []) as unknown as AiIncidentRecord[];
}

export async function createAiIncident(input: CreateAiIncidentInput): Promise<AiIncidentRecord> {
  const supabase = createAdminClient();

  for (let attempt = 1; attempt <= MAX_ATOMIC_CREATE_ATTEMPTS; attempt += 1) {
    const incidentId = randomUUID();
    const auditId = randomUUID();
    const createdAt = new Date().toISOString();
    const previousHash = await getPreviousAuditHash(input.organizationId);
    const chain = buildAuditChainRecord(
      {
        id: auditId,
        organizationId: input.organizationId,
        actorUserId: input.createdBy,
        action: 'ai_incident_created',
        entityType: 'ai_incident',
        entityId: incidentId,
        metadata: input.auditMetadata,
        createdAt,
      },
      previousHash,
    );

    const { data, error } = await supabase.rpc(ATOMIC_INCIDENT_RPC, {
      p_incident_id: incidentId,
      p_organization_id: input.organizationId,
      p_actor_user_id: input.createdBy,
      p_ai_system_id: input.aiSystemId ?? null,
      p_title: input.title,
      p_summary: input.summary,
      p_category: input.category,
      p_severity: input.severity,
      p_detected_at: input.detectedAt,
      p_report_status: input.reportStatus,
      p_authority: input.authority ?? null,
      p_internal_owner: input.internalOwner ?? null,
      p_deadline_plan: input.deadlinePlan,
      p_next_actions: input.nextActions,
      p_audit_id: auditId,
      p_audit_metadata: input.auditMetadata,
      p_audit_created_at: createdAt,
      p_previous_hash: chain.previousHash,
      p_event_hash: chain.eventHash,
      p_hash_signature: chain.signature ?? null,
    });

    if (error) {
      if (isPreviousHashMismatch(error) && attempt < MAX_ATOMIC_CREATE_ATTEMPTS) continue;
      console.warn('[ai-incidents] atomic_create_failed', { code: error.code ?? 'unknown' });
      throw error;
    }

    const result = firstAtomicIncidentRow(data);
    if (!result) throw new Error('AI incident atomic create RPC returned an invalid result');
    if (result.outcome === 'invalid_ai_system') throw new Error('AI incident references an invalid AI system');
    if (result.outcome !== 'created' || !result.incident) throw new Error('AI incident atomic create RPC rejected validated input');

    return result.incident;
  }

  throw new Error('AI incident atomic create exhausted audit-chain retries');
}
