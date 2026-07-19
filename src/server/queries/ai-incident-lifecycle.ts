import { randomUUID } from 'crypto';

import { createAdminClient } from '@/lib/supabase/admin';
import type { AiIncidentCategory, AiIncidentDeadline, AiIncidentReportStatus, AiIncidentSeverity } from '@/lib/ai-governance/incidents';
import type { AiIncidentRecord } from '@/server/queries/ai-incidents';
import { buildAuditChainRecord } from '@/server/security/audit-chain';

const TRANSITION_RPC = 'transition_ai_incident_atomic';
const MAX_TRANSITION_ATTEMPTS = 4;

export type AiIncidentHistoryRecord = {
  id: string;
  incident_id: string;
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  previous_status: AiIncidentReportStatus | null;
  next_status: AiIncidentReportStatus | null;
  snapshot: Record<string, unknown>;
  created_at: string;
};

export type UpdateAiIncidentInput = {
  organizationId: string;
  actorUserId: string;
  expectedUpdatedAt: string;
  aiSystemId?: string | null;
  title?: string;
  summary?: string;
  category?: AiIncidentCategory;
  severity?: AiIncidentSeverity;
  reportStatus?: AiIncidentReportStatus;
  authority?: string | null;
  internalOwner?: string | null;
  deadlinePlan?: AiIncidentDeadline[];
  nextActions?: string[];
  auditMetadata: Record<string, unknown>;
};

export type UpdateAiIncidentResult =
  | { status: 'updated'; incident: AiIncidentRecord }
  | { status: 'conflict' }
  | { status: 'not_found' }
  | { status: 'invalid_transition' }
  | { status: 'authority_required' }
  | { status: 'invalid_ai_system' };

type TransitionRow = {
  outcome:
    | 'updated'
    | 'state_changed'
    | 'not_found'
    | 'invalid_transition'
    | 'authority_required'
    | 'invalid_ai_system'
    | 'invalid_input';
  incident: AiIncidentRecord | null;
};

function firstTransitionRow(value: unknown): TransitionRow | null {
  if (!Array.isArray(value) || value.length !== 1) return null;
  const row = value[0];
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const candidate = row as Partial<TransitionRow>;
  if (
    ![
      'updated',
      'state_changed',
      'not_found',
      'invalid_transition',
      'authority_required',
      'invalid_ai_system',
      'invalid_input',
    ].includes(String(candidate.outcome))
  ) {
    return null;
  }
  return candidate as TransitionRow;
}

function isPreviousHashMismatch(error: { code?: string; message?: string }) {
  return error.code === '40001' || /previous hash mismatch/i.test(error.message ?? '');
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

  if (error) throw error;
  const eventHash = (data as { event_hash?: unknown } | null)?.event_hash;
  return typeof eventHash === 'string' ? eventHash : null;
}

export async function getAiIncidentWithHistory(incidentId: string, organizationId: string) {
  const supabase = createAdminClient();
  const [{ data: incident, error: incidentError }, { data: history, error: historyError }] = await Promise.all([
    supabase.from('ai_incidents').select('*').eq('id', incidentId).eq('organization_id', organizationId).maybeSingle(),
    supabase
      .from('ai_incident_history')
      .select('id,incident_id,organization_id,actor_user_id,action,previous_status,next_status,snapshot,created_at')
      .eq('incident_id', incidentId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
  ]);

  if (incidentError) throw incidentError;
  if (historyError) throw historyError;
  return {
    incident: (incident as AiIncidentRecord | null) ?? null,
    history: (history ?? []) as AiIncidentHistoryRecord[],
  };
}

export async function updateAiIncidentAtomic(
  incidentId: string,
  input: UpdateAiIncidentInput,
): Promise<UpdateAiIncidentResult> {
  const supabase = createAdminClient();

  for (let attempt = 1; attempt <= MAX_TRANSITION_ATTEMPTS; attempt += 1) {
    const previousHash = await getPreviousAuditHash(input.organizationId);
    const auditId = randomUUID();
    const createdAt = new Date().toISOString();
    const chain = buildAuditChainRecord(
      {
        id: auditId,
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: 'ai_incident_updated',
        entityType: 'ai_incident',
        entityId: incidentId,
        metadata: input.auditMetadata,
        createdAt,
      },
      previousHash,
    );

    const patch = {
      ...(input.aiSystemId !== undefined ? { ai_system_id: input.aiSystemId } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.severity !== undefined ? { severity: input.severity } : {}),
      ...(input.reportStatus !== undefined ? { report_status: input.reportStatus } : {}),
      ...(input.authority !== undefined ? { authority: input.authority } : {}),
      ...(input.internalOwner !== undefined ? { internal_owner: input.internalOwner } : {}),
      ...(input.deadlinePlan !== undefined ? { deadline_plan: input.deadlinePlan } : {}),
      ...(input.nextActions !== undefined ? { next_actions: input.nextActions } : {}),
    };

    const { data, error } = await supabase.rpc(TRANSITION_RPC, {
      p_incident_id: incidentId,
      p_organization_id: input.organizationId,
      p_expected_updated_at: input.expectedUpdatedAt,
      p_actor_user_id: input.actorUserId,
      p_patch: patch,
      p_audit_id: auditId,
      p_audit_metadata: input.auditMetadata,
      p_audit_created_at: createdAt,
      p_previous_hash: chain.previousHash,
      p_event_hash: chain.eventHash,
      p_hash_signature: chain.signature ?? null,
    });

    if (error) {
      if (isPreviousHashMismatch(error) && attempt < MAX_TRANSITION_ATTEMPTS) continue;
      throw error;
    }

    const result = firstTransitionRow(data);
    if (!result) throw new Error('AI incident transition RPC returned an invalid result');
    if (result.outcome === 'updated' && result.incident) return { status: 'updated', incident: result.incident };
    if (result.outcome === 'state_changed') return { status: 'conflict' };
    if (result.outcome === 'not_found') return { status: 'not_found' };
    if (result.outcome === 'invalid_transition') return { status: 'invalid_transition' };
    if (result.outcome === 'authority_required') return { status: 'authority_required' };
    if (result.outcome === 'invalid_ai_system') return { status: 'invalid_ai_system' };
    throw new Error('AI incident transition RPC rejected validated input');
  }

  throw new Error('AI incident transition exhausted audit-chain retries');
}
