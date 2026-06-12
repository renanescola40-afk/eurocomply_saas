import { randomUUID } from 'crypto';

import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { buildAuditChainRecord } from '@/server/security/audit-chain';

type AuditEventInput = {
  organizationId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export type AuditEventRecord = {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  previous_hash?: string | null;
  event_hash?: string | null;
  hash_algorithm?: string | null;
  hash_signature?: string | null;
};

const AUDIT_EVENT_COLUMNS = 'id,organization_id,actor_user_id,action,entity_type,entity_id,metadata,created_at,previous_hash,event_hash,hash_algorithm,hash_signature';
const LEGACY_AUDIT_EVENT_COLUMNS = 'id,organization_id,actor_user_id,action,entity_type,entity_id,metadata,created_at';

function isMissingAuditEventsTable(error: { code?: string; message?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205' || /audit_events/i.test(error.message ?? '');
}

function isMissingAuditChainColumns(error: { code?: string; message?: string }) {
  return error.code === '42703' || error.code === 'PGRST204' || /(previous_hash|event_hash|hash_algorithm|hash_signature|actor_user_id)/i.test(error.message ?? '');
}

async function getPreviousAuditHash(supabase: NonNullable<ReturnType<typeof tryCreateAdminClient>>, organizationId: string) {
  const { data, error } = await supabase
    .from('audit_events')
    .select('event_hash')
    .eq('organization_id', organizationId)
    .not('event_hash', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  const hash = (data as { event_hash?: unknown } | null)?.event_hash;
  return typeof hash === 'string' ? hash : null;
}

function buildChainedPayload(input: AuditEventInput, previousHash: string | null) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const chain = buildAuditChainRecord(
    {
      id,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {},
      createdAt,
    },
    previousHash,
  );

  return {
    chain,
    payload: {
      id,
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
      created_at: createdAt,
      previous_hash: chain.previousHash,
      event_hash: chain.eventHash,
      hash_algorithm: 'sha256',
      hash_signature: chain.signature ?? null,
    },
  };
}

function buildLegacyPayload(input: AuditEventInput) {
  return {
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  };
}

export async function createAuditEvent(input: AuditEventInput) {
  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return { persisted: false };
  }

  const previousHash = await getPreviousAuditHash(supabase, input.organizationId);
  const { chain, payload } = buildChainedPayload(input, previousHash);
  const { error } = await supabase.from('audit_events').insert(payload);

  if (!error) {
    return { persisted: true, eventHash: chain.eventHash, previousHash: chain.previousHash };
  }

  if (!isMissingAuditChainColumns(error)) {
    console.warn('[audit] create_event_failed', { code: error.code ?? 'unknown' });
    return { persisted: false };
  }

  const { error: legacyError } = await supabase.from('audit_events').insert(buildLegacyPayload(input));

  if (legacyError) {
    console.warn('[audit] create_event_failed', { code: legacyError.code ?? 'unknown' });
    return { persisted: false };
  }

  return { persisted: true, legacy: true };
}

export async function listAuditEvents(organizationId: string, limit = 100): Promise<AuditEventRecord[]> {
  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('audit_events')
    .select(AUDIT_EVENT_COLUMNS)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!error) {
    return (data ?? []) as unknown as AuditEventRecord[];
  }

  if (!isMissingAuditChainColumns(error)) {
    if (!isMissingAuditEventsTable(error)) console.warn('[audit] list_events_failed', { code: error.code ?? 'unknown' });
    return [];
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from('audit_events')
    .select(LEGACY_AUDIT_EVENT_COLUMNS)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (legacyError) {
    if (!isMissingAuditEventsTable(legacyError)) console.warn('[audit] list_events_failed', { code: legacyError.code ?? 'unknown' });
    return [];
  }

  return (legacyData ?? []) as unknown as AuditEventRecord[];
}
