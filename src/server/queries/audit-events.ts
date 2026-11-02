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
const CHAIN_APPEND_RETRY_BASE_MS = 10;
const CHAIN_APPEND_RETRY_CAP_MS = 1000;
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
  return error.code === '42P01' || error.code === 'PGRST205';
}

function isMissingAuditChainColumns(error: SupabaseError) {
  // A message mentioning an audit column may describe an authorization error,
  // not a missing column. Never use it to justify a legacy-write downgrade.
  return error.code === '42703' || error.code === 'PGRST204';
}

function isMissingAuditChainRpc(error: SupabaseError) {
  // Message-only matching can mistake an authorization/operational error for
  // a missing RPC and permit an explicitly configured downgrade to direct
  // insertion. Only recognized undefined-function / schema-cache codes qualify.
  return error.code === '42883' || error.code === 'PGRST202';
}

function isAuditChainPreviousHashMismatch(error: SupabaseError) {
  const message = error.message ?? '';
  return (error.code === '40001' && /audit chain previous hash mismatch/i.test(message))
    || (error.code === 'P0001' && /audit chain write conflict: stale head/i.test(message));
}

function isAuditChainAppendContention(error: SupabaseError) {
  const message = error.message ?? '';
  return (error.code === '40001' && /audit chain append contention/i.test(message))
    || (error.code === '55P03' && /audit chain write conflict: lock unavailable/i.test(message));
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
  // Treat separator and Unicode-width variants of credential names alike.
  const normalized = key.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, '');
  return BLOCKED_METADATA_KEYS.some((blocked) =>
    normalized.includes(blocked.replace(/[^a-z0-9]/g, '')),
  );
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

  if (error) return { hash: null, error };
  const hash = (data as { event_hash?: unknown } | null)?.event_hash;
  return { hash: typeof hash === 'string' ? hash : null, error: null };
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
  const ceiling = Math.min(
    CHAIN_APPEND_RETRY_CAP_MS,
    CHAIN_APPEND_RETRY_BASE_MS * (2 ** Math.min(Math.max(attempt, 1), 7)),
  );
  const jitterSpan = Math.max(0, ceiling - CHAIN_APPEND_RETRY_BASE_MS);
  const delay = CHAIN_APPEND_RETRY_BASE_MS + Math.floor(Math.random() * (jitterSpan + 1));
  return new Promise<void>((resolve) => setTimeout(resolve, delay));
}

async function appendAuditEventWithRpc(supabase: SupabaseAdminClient, input: NormalizedAuditEventInput) {
  let lastError: SupabaseError | null = null;

  for (let attempt = 1; attempt <= MAX_CHAIN_APPEND_ATTEMPTS; attempt += 1) {
    const previousHashRead = await getPreviousAuditHash(supabase, input.organizationId);
    if (previousHashRead.error) {
      lastError = previousHashRead.error;
      break;
    }

    const { id, createdAt, chain } = buildChainedPayload(input, previousHashRead.hash);

    const { error } = await supabase.rpc(CHAIN_APPEND_RPC, buildAuditChainRpcParams(input, chain, id, createdAt));

    if (!error) {
      return { ok: true as const, eventHash: chain.eventHash, previousHash: chain.previousHash, viaRpc: true as const };
    }

    lastError = error;

    if (isAuditChainAppendContention(error)) {
      break;
    }

    if (isPreviousHashMismatch(error) && attempt < MAX_CHAIN_APPEND_ATTEMPTS) {
      await waitForAuditChainRetry(attempt);
      continue;
    }

    break;
  }

  return { ok: false as const, error: lastError };
}

async function appendAuditEventWithDirectInsert(supabase: SupabaseAdminClient, input: NormalizedAuditEventInput) {
  const previousHashRead = await getPreviousAuditHash(supabase, input.organizationId);
  if (previousHashRead.error) {
    return { ok: false as const, error: previousHashRead.error };
  }

  const { chain, payload } = buildChainedPayload(input, previousHashRead.hash);
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



type AuditedRemoveOutcome = 'removed' | 'last_owner' | 'state_changed' | 'not_found'
  | 'invalid_input' | 'permission_denied' | 'unavailable';
type AuditedRemoveRow = {
  outcome: AuditedRemoveOutcome;
  affected_member_id: string | null;
  affected_user_id: string | null;
  previous_role: string | null;
};

/**
 * Single RPC transaction: membership deletion + signed chain append + legacy
 * audit log. A failed RPC always rolls back the member deletion and its FK
 * effects. There is deliberately NO direct-insert or legacy audit fallback.
 * Release gate: verify P0-C migration and canonical signing in PostgreSQL.
 */
export async function removeMemberWithChainedAuditAtomic(input: {
  organizationId: string;
  memberId: string;
  expectedUserId: string;
  expectedRole: string;
  actorUserId: string;
  metadata: Record<string, unknown>;
}): Promise<{ row: AuditedRemoveRow | null; error: string | null }> {
  if (!input.expectedUserId || !input.actorUserId || !input.memberId) {
    return { row: null, error: 'unsupported_or_missing_identity' };
  }
  const normalized = normalizeAuditEventInput({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: 'team.member_removed',
    entityType: 'organization_member',
    entityId: input.memberId,
    metadata: input.metadata,
  });
  if (!normalized) return { row: null, error: 'invalid_audit_payload' };

  const admin = tryCreateAdminClient();
  if (!admin) return { row: null, error: 'admin_unavailable' };

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const head = await getPreviousAuditHash(admin, input.organizationId);
    if (head.error) return { row: null, error: 'audit_head_unavailable' };
    const payload = buildChainedPayload(normalized, head.hash);
    if (!payload.chain.signature) return { row: null, error: 'audit_signing_unavailable' };

    const { data, error } = await admin.rpc('remove_organization_member_audited_atomic', {
      p_organization_id: input.organizationId,
      p_member_id: input.memberId,
      p_expected_user_id: input.expectedUserId,
      p_expected_role: input.expectedRole,
      p_actor_user_id: input.actorUserId,
      p_audit_id: payload.id,
      p_audit_created_at: payload.createdAt,
      p_audit_previous_hash: payload.chain.previousHash,
      p_audit_event_hash: payload.chain.eventHash,
      p_audit_hash_signature: payload.chain.signature,
      p_audit_metadata: normalized.metadata,
    });

    if (!error) {
      const row = (Array.isArray(data) ? data[0] : data) as AuditedRemoveRow | null;
      return row ? { row, error: null } : { row: null, error: 'empty_rpc_result' };
    }

    // Only stale-head CAS gets a strictly bounded retry. Lock contention
    // remains fail-closed to avoid the historical audit-retry storm.
    if (isPreviousHashMismatch(error) && attempt < 3) {
      await waitForAuditChainRetry(attempt);
      continue;
    }
    return { row: null, error: 'atomic_audit_or_member_removal_failed' };
  }
  return { row: null, error: 'audit_retry_exhausted' };
}


type AuditedRoleRow = {
  outcome: 'changed' | 'unchanged' | 'last_owner' | 'state_changed' | 'not_found' | 'invalid_input' |
    'invalid_role' | 'admin_limit_reached' | 'contract_not_active' | 'entitlements_missing' | 'permission_denied';
  affected_member_id: string | null;
  affected_user_id: string | null;
  previous_role: string | null;
  applied_role: string | null;
};

/**
 * Fail-closed role mutation and tamper-evident audit in one database transaction.
 * Source readiness is NOT proof of PostgreSQL concurrency, deployment or runtime.
 */
export async function changeMemberRoleWithChainedAuditAtomic(input: {
  organizationId: string;
  memberId: string;
  expectedUserId: string;
  expectedRole: string;
  nextRole: string;
  actorUserId: string;
  metadata: Record<string, unknown>;
}): Promise<{ row: AuditedRoleRow | null; error: string | null }> {
  if (!input.expectedUserId || !input.actorUserId || !input.memberId || !input.expectedRole || !input.nextRole) {
    return { row: null, error: 'unsupported_or_missing_identity' };
  }

  const normalized = normalizeAuditEventInput({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: 'team_member_role_changed',
    entityType: 'organization_member',
    entityId: input.memberId,
    metadata: input.metadata,
  });
  if (!normalized) return { row: null, error: 'invalid_audit_payload' };
  const admin = tryCreateAdminClient();
  if (!admin) return { row: null, error: 'admin_unavailable' };

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const head = await getPreviousAuditHash(admin, input.organizationId);
    if (head.error) return { row: null, error: 'audit_head_unavailable' };
    const payload = buildChainedPayload(normalized, head.hash);
    if (!payload.chain.signature) return { row: null, error: 'audit_signing_unavailable' };

    const { data, error } = await admin.rpc('change_organization_member_role_audited_atomic', {
      p_organization_id: input.organizationId,
      p_member_id: input.memberId,
      p_expected_user_id: input.expectedUserId,
      p_expected_role: input.expectedRole,
      p_next_role: input.nextRole,
      p_actor_user_id: input.actorUserId,
      p_audit_id: payload.id,
      p_audit_created_at: payload.createdAt,
      p_audit_previous_hash: payload.chain.previousHash,
      p_audit_event_hash: payload.chain.eventHash,
      p_audit_hash_signature: payload.chain.signature,
      p_audit_metadata: normalized.metadata,
    });

    if (!error) {
      const row = (Array.isArray(data) ? data[0] : data) as AuditedRoleRow | null;
      return row ? { row, error: null } : { row: null, error: 'empty_rpc_result' };
    }
    if (isPreviousHashMismatch(error) && attempt < 3) {
      await waitForAuditChainRetry(attempt);
      continue;
    }
    return { row: null, error: 'atomic_audit_or_member_role_change_failed' };
  }
  return { row: null, error: 'audit_retry_exhausted' };
}

const AUDIT_EXPORT_PAGE_SIZE = 500;

type AuditExportCursor = {
  createdAt: string;
  id: string;
};

function auditCursorFilter(cursor: AuditExportCursor) {
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}

async function listAuditEventsPage(
  supabase: SupabaseAdminClient,
  organizationId: string,
  cursor: AuditExportCursor | null,
): Promise<{ rows: AuditEventRecord[]; legacy: boolean }> {
  let query = supabase
    .from('audit_events')
    .select(AUDIT_EVENT_COLUMNS)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(AUDIT_EXPORT_PAGE_SIZE);

  if (cursor) query = query.or(auditCursorFilter(cursor));

  const { data, error } = await query;

  if (!error) {
    return { rows: data ?? [], legacy: false };
  }

  if (isMissingAuditChainColumns(error)) {
    let legacyQuery = supabase
      .from('audit_events')
      .select(LEGACY_AUDIT_EVENT_COLUMNS)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(AUDIT_EXPORT_PAGE_SIZE);

    if (cursor) legacyQuery = legacyQuery.or(auditCursorFilter(cursor));

    const { data: legacyData, error: legacyError } = await legacyQuery;

    if (!legacyError) {
      return {
        rows: (legacyData ?? []).map((event) => ({
          id: event.id,
          organization_id: event.organization_id,
          actor_user_id: event.actor_user_id ?? null,
          action: event.action,
          entity_type: event.entity_type,
          entity_id: event.entity_id,
          metadata: event.metadata,
          created_at: event.created_at,
        })),
        legacy: true,
      };
    }

    if (isMissingAuditEventsTable(legacyError)) {
      return { rows: [], legacy: true };
    }

    throw new Error(`audit_event_export_legacy_query_failed:${legacyError.code ?? 'unknown'}`);
  }

  if (isMissingAuditEventsTable(error)) {
    return { rows: [], legacy: false };
  }

  throw new Error(`audit_event_export_query_failed:${error.code ?? 'unknown'}`);
}

export async function countAuditEvents(organizationId: string): Promise<number> {
  const supabase = tryCreateAdminClient();
  if (!supabase) {
    throw new Error('audit_event_count_admin_client_unavailable');
  }

  const { count, error } = await supabase
    .from('audit_events')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (!error) return count ?? 0;
  if (isMissingAuditEventsTable(error)) return 0;
  throw new Error(`audit_event_count_query_failed:${error.code ?? 'unknown'}`);
}

export async function listAllAuditEventsForExport(organizationId: string): Promise<AuditEventRecord[]> {
  const supabase = tryCreateAdminClient();
  if (!supabase) {
    throw new Error('audit_event_export_admin_client_unavailable');
  }

  const events: AuditEventRecord[] = [];
  let cursor: AuditExportCursor | null = null;

  while (true) {
    const page = await listAuditEventsPage(supabase, organizationId, cursor);
    events.push(...page.rows);

    if (page.rows.length < AUDIT_EXPORT_PAGE_SIZE) break;

    const last = page.rows.at(-1);
    if (!last?.created_at || !last?.id) {
      throw new Error('audit_event_export_cursor_missing');
    }

    cursor = { createdAt: last.created_at, id: last.id };
  }

  return events;
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
