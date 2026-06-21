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

type SupabaseAdminClient = NonNullable<ReturnType<typeof tryCreateAdminClient>>;
type SupabaseError = { code?: string; message?: string };

const AUDIT_EVENT_COLUMNS = 'id,organization_id,actor_user_id,action,entity_type,entity_id,metadata,created_at,previous_hash,event_hash,hash_algorithm,hash_signature';
const LEGACY_AUDIT_EVENT_COLUMNS = 'id,organization_id,actor_user_id:actor_id,action,entity_type,entity_id,metadata,created_at';
const CHAIN_APPEND_RPC = 'append_audit_event_chained';
const MAX_CHAIN_APPEND_ATTEMPTS = 2;

function isMissingAuditEventsTable(error: SupabaseError) {
  return error.code === '42P01' || error.code === 'PGRST205' || /audit_events/i.test(error.message ?? '');
}

function isMissingAuditChainColumns(error: SupabaseError) {
  return error.code === '42703' || error.code === 'PGRST204' || /(previous_hash|event_hash|hash_algorithm|hash_signature|actor_user_id)/i.test(error.message ?? '');
}

function isMissingAuditChainRpc(error: SupabaseError) {
  return error.code === '42883' || error.code === 'PGRST202' || /append_audit_event_chained|function/i.test(error.message ?? '');
}

function isAuditChainPreviousHashMismatch(error: SupabaseError) {
  return error.code === '40001' || /previous hash mismatch/i.test(error.message ?? '');
}

const isPreviousHashMismatch = isAuditChainPreviousHashMismatch;

async function getPreviousAuditHash(supabase: SupabaseAdminClient, organizationId: string) {
  const { data, error } = await supabase
    .from('audit_events')
    .select('event_hash')
    .eq('organization_id', organizationId)
    .not('event_hash', 'is', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
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
    actor_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  };
}

function buildAuditChainRpcParams(input: AuditEventInput, chain: ReturnType<typeof buildAuditChainRecord>) {
  return {
    p_organization_id: input.organizationId,
    p_actor_user_id: input.actorUserId,
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId ?? null,
    p_metadata: input.metadata ?? {},
    p_previous_hash: chain.previousHash,
    p_event_hash: chain.eventHash,
    p_hash_signature: chain.signature ?? null,
    p_hash_algorithm: 'sha256',
  };
}

async function appendAuditEventWithRpc(supabase: SupabaseAdminClient, input: AuditEventInput) {
  let lastError: SupabaseError | null = null;

  for (let attempt = 1; attempt <= MAX_CHAIN_APPEND_ATTEMPTS; attempt += 1) {
    const previousHash = await getPreviousAuditHash(supabase, input.organizationId);
    const { chain } = buildChainedPayload(input, previousHash);

    const { error } = await supabase.rpc(CHAIN_APPEND_RPC, buildAuditChainRpcParams(input, chain));

    if (!error) {
      return { ok: true as const, eventHash: chain.eventHash, previousHash: chain.previousHash, viaRpc: true as const };
    }

    lastError = error;

    if (isPreviousHashMismatch(error) && attempt < MAX_CHAIN_APPEND_ATTEMPTS) {
      continue;
    }

    break;
  }

  return { ok: false as const, error: lastError };
}

async function appendAuditEventWithDirectInsert(supabase: SupabaseAdminClient, input: AuditEventInput) {
  const previousHash = await getPreviousAuditHash(supabase, input.organizationId);
  const { chain, payload } = buildChainedPayload(input, previousHash);
  const { error } = await supabase.from('audit_events').insert(payload);

  if (!error) {
    return { ok: true as const, eventHash: chain.eventHash, previousHash: chain.previousHash };
  }

  return { ok: false as const, error };
}

export async function createAuditEvent(input: AuditEventInput) {
  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return { persisted: false };
  }

  const rpcAppend = await appendAuditEventWithRpc(supabase, input);

  if (rpcAppend.ok) {
    return {
      persisted: true,
      eventHash: rpcAppend.eventHash,
      previousHash: rpcAppend.previousHash,
      transactional: true,
    };
  }

  if (rpcAppend.error && !isMissingAuditChainRpc(rpcAppend.error)) {
    console.warn('[audit] create_event_rpc_failed', { code: rpcAppend.error.code ?? 'unknown' });
    return { persisted: false };
  }

  const directAppend = await appendAuditEventWithDirectInsert(supabase, input);

  if (directAppend.ok) {
    return {
      persisted: true,
      eventHash: directAppend.eventHash,
      previousHash: directAppend.previousHash,
      transactional: false,
      rpcUnavailable: true,
    };
  }

  if (directAppend.error && !isMissingAuditChainColumns(directAppend.error)) {
    console.warn('[audit] create_event_failed', { code: directAppend.error.code ?? 'unknown' });
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
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('audit_events')
    .select(AUDIT_EVENT_COLUMNS)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!error) return data ?? [];

  if (isMissingAuditChainColumns(error)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from('audit_events')
      .select(LEGACY_AUDIT_EVENT_COLUMNS)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!legacyError) {
      return (legacyData ?? []).map((event) => ({
        id: event.id,
        organization_id: event.organization_id,
        actor_user_id: event.actor_user_id ?? null,
        action: event.action,
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        metadata: event.metadata,
        created_at: event.created_at,
      }));
    }
  }

  if (isMissingAuditEventsTable(error)) return [];
  console.warn('[audit] list_events_failed', { code: error.code ?? 'unknown' });
  return [];
}
