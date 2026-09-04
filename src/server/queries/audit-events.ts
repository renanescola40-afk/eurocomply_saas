import { randomUUID } from 'crypto';

import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { buildAuditChainRecord } from '@/server/security/audit-chain';

type AuditRequestContextInput = {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  origin?: string | null;
  method?: string | null;
  path?: string | null;
};

type AuditEventInput = {
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  requestContext?: AuditRequestContextInput | null;
};

type NormalizedAuditEventInput = {
  organizationId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
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
const MAX_CHAIN_APPEND_ATTEMPTS = 128;
const CHAIN_APPEND_RETRY_BASE_MS = 3;
const CHAIN_APPEND_RETRY_CAP_MS = 50;
const NON_TRANSACTIONAL_FALLBACK_ENV = 'AUDIT_CHAIN_ALLOW_NON_TRANSACTIONAL_FALLBACK';
const LEGACY_FALLBACK_ENV = 'AUDIT_CHAIN_ALLOW_LEGACY_FALLBACK';
const MAX_METADATA_DEPTH = 6;
const MAX_METADATA_ARRAY_LENGTH = 50;
const MAX_METADATA_KEYS = 80;
const MAX_METADATA_STRING_LENGTH = 2048;
const MAX_REQUEST_CONTEXT_STRING_LENGTH = 512;
const MAX_REQUEST_PATH_LENGTH = 2048;

const BLOCKED_METADATA_KEYS = [
  'password',
  'passwd',
  'token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'set-cookie',
  'jwt',
  'session',
  'csrf',
  'mfa_code',
  'otp',
  'private_key',
];

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

function isFallbackEnabled(name: string) {
  return (process.env[name] ?? '').trim().toLowerCase() === 'true';
}

export function isNonTransactionalAuditAppendFallbackAllowed() {
  return isFallbackEnabled(NON_TRANSACTIONAL_FALLBACK_ENV);
}

function isLegacyAuditAppendFallbackAllowed() {
  return isFallbackEnabled(LEGACY_FALLBACK_ENV);
}

function isBlockedMetadataKey(key: string) {
  const normalized = key.trim().toLowerCase();
  return BLOCKED_METADATA_KEYS.some((blocked) => normalized.includes(blocked));
}

function sanitizeString(value: string) {
  return value.length > MAX_METADATA_STRING_LENGTH ? `${value.slice(0, MAX_METADATA_STRING_LENGTH)}…[truncated]` : value;
}

function sanitizeAuditValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return sanitizeString(value);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();

  if (Array.isArray(value)) {
    if (depth >= MAX_METADATA_DEPTH) return '[max-depth]';
    return value.slice(0, MAX_METADATA_ARRAY_LENGTH).map((entry) => sanitizeAuditValue(entry, depth + 1));
  }

  if (typeof value === 'object') {
    if (depth >= MAX_METADATA_DEPTH) return '[max-depth]';

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !isBlockedMetadataKey(key))
        .slice(0, MAX_METADATA_KEYS)
        .map(([key, entryValue]) => [key, sanitizeAuditValue(entryValue, depth + 1)]),
    );
  }

  return null;
}

export function sanitizeAuditMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
  if (!metadata) return {};
  return sanitizeAuditValue(metadata, 0) as Record<string, unknown>;
}

function normalizeRequestContextString(value: string | null | undefined, maxLength = MAX_REQUEST_CONTEXT_STRING_LENGTH) {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null;
}

function normalizeRequestIpAddress(value: string | null | undefined) {
  const normalized = normalizeRequestContextString(value?.split(',')[0], 128);
  if (!normalized) return null;
  return /^[a-zA-Z0-9:.,\-_[\] ]+$/.test(normalized) ? normalized : null;
}

function sanitizeAuditRequestContext(context?: AuditRequestContextInput | null) {
  if (!context) return {};

  const safeContext = {
    ipAddress: normalizeRequestIpAddress(context.ipAddress),
    userAgent: normalizeRequestContextString(context.userAgent),
    requestId: normalizeRequestContextString(context.requestId, 128),
    origin: normalizeRequestContextString(context.origin),
    method: normalizeRequestContextString(context.method, 16),
    path: normalizeRequestContextString(context.path, MAX_REQUEST_PATH_LENGTH),
  };

  return Object.fromEntries(Object.entries(safeContext).filter(([, value]) => value !== null));
}

function isPlainAuditMetadataObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function mergeAuditMetadata(metadata?: Record<string, unknown>, requestContext?: AuditRequestContextInput | null) {
  const sanitizedMetadata = sanitizeAuditMetadata(metadata);
  const sanitizedRequestContext = sanitizeAuditRequestContext(requestContext);

  if (Object.keys(sanitizedRequestContext).length === 0) return sanitizedMetadata;

  const existingRequestContext = isPlainAuditMetadataObject(sanitizedMetadata.requestContext) ? sanitizedMetadata.requestContext : {};

  return sanitizeAuditMetadata({
    ...sanitizedMetadata,
    requestContext: {
      ...existingRequestContext,
      ...sanitizedRequestContext,
    },
  });
}

export function buildAuditRequestContextFromRequest(request: Request): AuditRequestContextInput {
  let path: string | null = null;

  try {
    path = new URL(request.url).pathname;
  } catch {
    path = null;
  }

  return {
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    userAgent: request.headers.get('user-agent'),
    requestId: request.headers.get('x-request-id') ?? request.headers.get('x-correlation-id'),
    origin: request.headers.get('origin'),
    method: request.method,
    path,
  };
}

function normalizeAuditEventInput(input: AuditEventInput): NormalizedAuditEventInput | null {
  const organizationId = input.organizationId?.trim();
  const action = input.action?.trim();

  if (!organizationId || !action) return null;

  return {
    organizationId,
    actorUserId: input.actorUserId?.trim() || null,
    action,
    entityType: input.entityType?.trim() || 'system',
    entityId: input.entityId?.trim() || null,
    metadata: mergeAuditMetadata(input.metadata, input.requestContext),
  };
}

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

function buildChainedPayload(input: NormalizedAuditEventInput, previousHash: string | null) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const chain = buildAuditChainRecord(
    {
      id,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      createdAt,
    },
    previousHash,
  );

  return {
    id,
    createdAt,
    chain,
    payload: {
      id,
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      metadata: input.metadata,
      created_at: createdAt,
      previous_hash: chain.previousHash,
      event_hash: chain.eventHash,
      hash_algorithm: 'sha256',
      hash_signature: chain.signature ?? null,
    },
  };
}

function buildLegacyPayload(input: NormalizedAuditEventInput) {
  return {
    organization_id: input.organizationId,
    actor_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata,
  };
}

function buildAuditChainRpcParams(input: NormalizedAuditEventInput, chain: ReturnType<typeof buildAuditChainRecord>, id: string, createdAt: string) {
  return {
    p_id: id,
    p_organization_id: input.organizationId,
    p_actor_user_id: input.actorUserId,
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_metadata: input.metadata,
    p_created_at: createdAt,
    p_previous_hash: chain.previousHash,
    p_event_hash: chain.eventHash,
    p_hash_signature: chain.signature ?? null,
    p_hash_algorithm: 'sha256',
  };
}

function waitForAuditChainRetry(attempt: number) {
  const exponential = Math.min(
    CHAIN_APPEND_RETRY_CAP_MS,
    CHAIN_APPEND_RETRY_BASE_MS * (2 ** Math.min(Math.max(attempt - 1, 0), 4)),
  );
  const jitter = Math.floor(Math.random() * (CHAIN_APPEND_RETRY_BASE_MS + 1));
  return new Promise<void>((resolve) => setTimeout(resolve, exponential + jitter));
}

async function appendAuditEventWithRpc(supabase: SupabaseAdminClient, input: NormalizedAuditEventInput) {
  let lastError: SupabaseError | null = null;

  for (let attempt = 1; attempt <= MAX_CHAIN_APPEND_ATTEMPTS; attempt += 1) {
    const previousHash = await getPreviousAuditHash(supabase, input.organizationId);
    const { id, createdAt, chain } = buildChainedPayload(input, previousHash);

    const { error } = await supabase.rpc(CHAIN_APPEND_RPC, buildAuditChainRpcParams(input, chain, id, createdAt));

    if (!error) {
      return { ok: true as const, eventHash: chain.eventHash, previousHash: chain.previousHash, viaRpc: true as const };
    }

    lastError = error;

    if (isPreviousHashMismatch(error) && attempt < MAX_CHAIN_APPEND_ATTEMPTS) {
      await waitForAuditChainRetry(attempt);
      continue;
    }

    break;
  }

  return { ok: false as const, error: lastError };
}

async function appendAuditEventWithDirectInsert(supabase: SupabaseAdminClient, input: NormalizedAuditEventInput) {
  const previousHash = await getPreviousAuditHash(supabase, input.organizationId);
  const { chain, payload } = buildChainedPayload(input, previousHash);
  const { error } = await supabase.from('audit_events').insert(payload);

  if (!error) {
    return { ok: true as const, eventHash: chain.eventHash, previousHash: chain.previousHash };
  }

  return { ok: false as const, error };
}

export async function createAuditEvent(input: AuditEventInput) {
  const normalizedInput = normalizeAuditEventInput(input);

  if (!normalizedInput) {
    return { persisted: false, reason: 'invalid_audit_event_input' as const };
  }

  const supabase = tryCreateAdminClient();

  if (!supabase) {
    return { persisted: false, reason: 'admin_client_unavailable' as const };
  }

  const rpcAppend = await appendAuditEventWithRpc(supabase, normalizedInput);

  if (rpcAppend.ok) {
    return {
      persisted: true,
      eventHash: rpcAppend.eventHash,
      previousHash: rpcAppend.previousHash,
      transactional: true,
    };
  }

  if (rpcAppend.error && isMissingAuditChainRpc(rpcAppend.error) && isNonTransactionalAuditAppendFallbackAllowed()) {
    const directAppend = await appendAuditEventWithDirectInsert(supabase, normalizedInput);

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
      console.warn('[audit] create_event_direct_append_failed', { code: directAppend.error.code ?? 'unknown' });
      return { persisted: false, reason: 'direct_append_failed' as const };
    }
  }

  if (rpcAppend.error && isMissingAuditChainRpc(rpcAppend.error) && isLegacyAuditAppendFallbackAllowed()) {
    const { error: legacyError } = await supabase.from('audit_events').insert(buildLegacyPayload(normalizedInput));

    if (!legacyError) {
      return { persisted: true, legacy: true };
    }

    console.warn('[audit] create_event_legacy_failed', { code: legacyError.code ?? 'unknown' });
    return { persisted: false, reason: 'legacy_append_failed' as const };
  }

  if (rpcAppend.error) {
    console.warn('[audit] create_event_transactional_append_failed', { code: rpcAppend.error.code ?? 'unknown' });
  }

  return { persisted: false, reason: 'transactional_append_unavailable' as const };
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
