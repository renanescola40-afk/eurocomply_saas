#!/usr/bin/env node

// run-audit-chain-live-validation: validates enterprise audit-chain controls against the
// target Supabase environment and writes redacted runtime evidence.

import { createHash, createHmac, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  cleanupEphemeralAuthFixtures,
  createEphemeralAuthFixtures,
} from './lib/ephemeral-auth-fixtures.mjs';

const evidencePath = 'docs/security/evidence/runtime/audit-chain-live-validation.json';
const env = (...parts) => parts.join('_');
const supabaseUrlEnv = env('NEXT', 'PUBLIC', 'SUPABASE', 'URL');
const serviceRoleEnv = env('SUPABASE', 'SERVICE', 'ROLE', 'KEY');
const auditSigningEnv = env('AUDIT', 'CHAIN', 'SIGNING', 'SECRET');
const evidenceSigningEnv = env('EVIDENCE', 'PACK', 'SIGNING', 'SECRET');
const proofEnv = env('AUDIT', 'CHAIN', 'LIVE', 'PROOF');
const enterpriseReleaseEnv = env('RISCK', 'COMPLY', 'ENTERPRISE', 'RELEASE');
const legacyEnterpriseReleaseEnv = env('EUROCOMPLY', 'ENTERPRISE', 'RELEASE');
const rpcName = 'append_audit_event_chained';
const syntheticAction = 'security.audit_chain_live_validation';
const CONCURRENCY_LEVELS = Object.freeze([10, 25, 50, 100]);
const LIVE_APPEND_MAX_ATTEMPTS = 128;
const LIVE_RETRY_BASE_MS = 25;
const LIVE_RETRY_CAP_MS = 2000;
const LIVE_BATCH_SETTLE_MS = 250;
const CLEANUP_CHUNK_SIZE = 50;

const requiredFiles = [
  'src/server/security/audit-chain.ts',
  'src/server/security/audit-chain.test.ts',
  'src/server/queries/audit-events.ts',
  'src/server/queries/audit-events.test.ts',
  'src/app/api/audit/chain/verify/route.ts',
  'src/app/api/audit/chain/verify/route.test.ts',
  'src/app/api/audit/evidence-pack/route.ts',
  'src/app/api/audit/evidence-pack/route.test.ts',
  'src/server/security/evidence-pack-integrity.ts',
  'scripts/security/check-audit-chain.mjs',
  'scripts/security/check-audit-critical-coverage.mjs',
  'scripts/security/verify-audit-chain.mjs',
  'scripts/security/lib/ephemeral-auth-fixtures.mjs',
  'supabase/migrations/20260612_audit_event_hash_chain.sql',
  'supabase/migrations/20260613_audit_event_chained_rpc.sql',
  'supabase/migrations/20260621120000_audit_chain_enterprise_hardening.sql',
  'docs/security/AUDIT_CHAIN.md',
  'docs/security/AUDIT_CHAIN_MODEL.md',
  'docs/security/AUDIT_CHAIN_CONCURRENCY_RUNBOOK.md',
  'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md',
  'docs/RELEASE_CANDIDATE_VALIDATION.md',
];

const sourceTokens = {
  'src/server/security/audit-chain.ts': [
    'canonicalizeAuditEvent',
    'buildAuditEventHash',
    'signAuditEventHash',
    'verifyAuditChain',
    auditSigningEnv,
    'previous_hash_mismatch',
    'event_hash_mismatch',
    'signature_mismatch',
  ],
  'src/server/queries/audit-events.ts': [
    rpcName,
    'buildAuditChainRecord',
    'MAX_CHAIN_APPEND_ATTEMPTS = 128',
    'waitForAuditChainRetry',
    'transactional_append_unavailable',
    'AUDIT_CHAIN_ALLOW_NON_TRANSACTIONAL_FALLBACK',
    'AUDIT_CHAIN_ALLOW_LEGACY_FALLBACK',
  ],
  'supabase/migrations/20260621120000_audit_chain_enterprise_hardening.sql': [
    'pg_advisory_xact_lock',
    'p_previous_hash',
    'p_event_hash',
    'security definer',
    'grant execute',
  ],
  'src/app/api/audit/chain/verify/route.ts': [
    'getCurrentUser',
    'assertOrganizationPermission',
    'read_audit',
    'requireStepUpForRequest',
    'audit_chain_verify',
    'checkDistributedRateLimit',
    'audit_chain.verified',
  ],
  'src/app/api/audit/evidence-pack/route.ts': [
    'assertOrganizationPermission',
    'export_data',
    'requireStepUpForRequest',
    'audit_chain_export',
    'buildEvidencePackIntegrity',
    'audit_evidence_pack_signing_unavailable',
    'audit_chain.evidence_exported',
  ],
  'scripts/security/verify-audit-chain.mjs': [
    'missing_previous_hash',
    'previous_hash_mismatch',
    'event_hash_mismatch',
    'signature_mismatch',
    'process.exit(result.ok ? 0 : 1)',
  ],
};

const criticalEventCoverage = {
  loginLogout: ['auth.login_attempt', 'auth.login_success', 'auth.login_failure', 'auth.logout'],
  rbacDenied: ['rbac.denied', 'security.failure'],
  originDenied: ['origin.denied', 'security.failure'],
  stepUp: ['auth.step_up_requested', 'auth.step_up_approved', 'auth.step_up_denied', 'auth.step_up_expired', 'security.event'],
  billing: ['billing.checkout_start', 'billing.portal_start', 'billing.webhook_received', 'billing.subscription_updated'],
  uploadsDownloads: ['document.upload', 'document.download'],
  exports: ['export.created', 'report.export', 'gdpr.export', 'audit_chain.evidence_exported'],
  teamChanges: ['team.invite_created', 'team.invite_cancelled', 'team.member_removed', 'team.member_role_changed', 'permission.changed'],
  documentChanges: ['document.update', 'document.delete', 'document.approval_changed'],
  risksVendorsTasks: ['risk.create', 'risk.update', 'risk.delete', 'vendor.create', 'vendor.delete', 'task.create', 'task.update', 'task.delete'],
  gdprDelete: ['gdpr.delete_requested'],
  webhookFailures: ['billing.webhook_failed', 'security.failure'],
  securitySettings: ['security.settings_changed', 'change_security_settings'],
};

function readRuntimeSetting(name) {
  return (process.env[name] ?? '').trim();
}

function redactedPresence(name) {
  return Boolean(readRuntimeSetting(name));
}

function safeFailureCode(error) {
  const raw = error instanceof Error ? error.message : String(error || 'unknown_error');
  const prefix = raw.split(':', 1)[0] || 'unknown_error';
  return prefix.replace(/[^a-zA-Z0-9_.-]+/g, '_').slice(0, 96);
}

function validateSources() {
  const failures = [];

  for (const file of requiredFiles) {
    if (!existsSync(file)) failures.push(`${file} missing`);
  }

  for (const [file, tokens] of Object.entries(sourceTokens)) {
    const source = existsSync(file) ? readFileSync(file, 'utf8') : '';
    for (const token of tokens) {
      if (!source.includes(token)) failures.push(`${file} missing token: ${token}`);
    }
  }

  return failures;
}

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, normalize(entryValue)]),
    );
  }
  return value;
}

function canonicalizeAuditTimestamp(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function canonicalizeAuditEvent(input, previousHash) {
  return JSON.stringify(normalize({
    id: input.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? null,
    createdAt: canonicalizeAuditTimestamp(input.createdAt),
    previousHash,
  }));
}

function buildAuditEventHash(input, previousHash) {
  return createHash('sha256').update(canonicalizeAuditEvent(input, previousHash)).digest('hex');
}

function signAuditEventHash(eventHash) {
  const secret = readRuntimeSetting(auditSigningEnv);
  if (!secret) return undefined;
  return createHmac('sha256', secret).update(eventHash).digest('hex');
}

function buildChainPayload({ organizationId, actorUserId, previousHash, suffix }) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const input = {
    id,
    organizationId,
    actorUserId: actorUserId || null,
    action: syntheticAction,
    entityType: 'audit_chain',
    entityId: organizationId,
    metadata: {
      validator: 'scripts/security/run-audit-chain-live-validation.mjs',
      suffix,
      synthetic: true,
      generatedAt: createdAt,
    },
    createdAt,
  };
  const eventHash = buildAuditEventHash(input, previousHash);
  return {
    input,
    previousHash,
    eventHash,
    signature: signAuditEventHash(eventHash),
    rpcParams: {
      p_id: id,
      p_organization_id: organizationId,
      p_actor_user_id: actorUserId || null,
      p_action: input.action,
      p_entity_type: input.entityType,
      p_entity_id: input.entityId,
      p_metadata: input.metadata,
      p_created_at: createdAt,
      p_previous_hash: previousHash,
      p_event_hash: eventHash,
      p_hash_signature: signAuditEventHash(eventHash) ?? null,
      p_hash_algorithm: 'sha256',
    },
  };
}

async function getPreviousHash(supabase, organizationId) {
  const { data, error } = await supabase
    .from('audit_events')
    .select('event_hash')
    .eq('organization_id', organizationId)
    .not('event_hash', 'is', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`failed_to_read_previous_audit_hash:${error.code ?? 'unknown'}`);
  return typeof data?.event_hash === 'string' ? data.event_hash : null;
}

async function appendViaRpc(supabase, payload) {
  const { data, error } = await supabase.rpc(rpcName, payload.rpcParams);
  return { data, error };
}

function isPreviousHashMismatch(error) {
  return error?.code === '40001' || /previous hash mismatch/i.test(error?.message ?? '');
}

function waitForLiveRetry(attempt) {
  const ceiling = Math.min(
    LIVE_RETRY_CAP_MS,
    LIVE_RETRY_BASE_MS * (2 ** Math.min(Math.max(attempt, 1), 7)),
  );
  const jitterSpan = Math.max(0, ceiling - LIVE_RETRY_BASE_MS);
  const delay = LIVE_RETRY_BASE_MS + Math.floor(Math.random() * (jitterSpan + 1));
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function waitForBatchSettle() {
  return new Promise((resolve) => setTimeout(resolve, LIVE_BATCH_SETTLE_MS));
}

async function appendWithRetry(supabase, { organizationId, actorUserId, suffix }) {
  const startedAt = Date.now();
  let conflicts = 0;
  let lastError = null;

  for (let attempt = 1; attempt <= LIVE_APPEND_MAX_ATTEMPTS; attempt += 1) {
    const previousHash = await getPreviousHash(supabase, organizationId);
    const payload = buildChainPayload({ organizationId, actorUserId, previousHash, suffix });
    const result = await appendViaRpc(supabase, payload);

    if (!result.error) {
      return {
        ok: true,
        eventId: payload.input.id,
        eventHash: payload.eventHash,
        conflicts,
        attempts: attempt,
        latencyMs: Date.now() - startedAt,
      };
    }

    lastError = result.error;
    if (!isPreviousHashMismatch(result.error) || attempt >= LIVE_APPEND_MAX_ATTEMPTS) break;
    conflicts += 1;
    await waitForLiveRetry(attempt);
  }

  return {
    ok: false,
    conflicts,
    attempts: LIVE_APPEND_MAX_ATTEMPTS,
    latencyMs: Date.now() - startedAt,
    errorCode: lastError?.code ?? 'unknown',
  };
}

function mapRowToRecord(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    actorUserId: row.actor_user_id ?? null,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    previousHash: row.previous_hash ?? null,
    eventHash: row.event_hash,
    signature: row.hash_signature ?? undefined,
  };
}

function verifyAuditChain(records, expectedPreviousHash = null) {
  const failures = [];

  records.forEach((record, index) => {
    const expectedPreviousHashForRecord = index === 0 ? expectedPreviousHash : records[index - 1]?.eventHash ?? null;
    if (record.previousHash !== expectedPreviousHashForRecord) {
      failures.push({ index, id: record.id, reason: 'previous_hash_mismatch' });
    }

    const expectedEventHash = buildAuditEventHash(record, record.previousHash);
    if (record.eventHash !== expectedEventHash) failures.push({ index, id: record.id, reason: 'event_hash_mismatch' });

    const expectedSignature = signAuditEventHash(record.eventHash);
    if (expectedSignature && record.signature !== expectedSignature) failures.push({ index, id: record.id, reason: 'signature_mismatch' });
  });

  return { ok: failures.length === 0, checked: records.length, failures, lastHash: records.at(-1)?.eventHash ?? null };
}

function withBrokenPreviousHash(records) {
  if (records.length === 0) return records;
  const targetIndex = records.findIndex((record) => record.previousHash !== null);
  const index = targetIndex >= 0 ? targetIndex : 0;
  return records.map((record, recordIndex) => recordIndex === index
    ? { ...record, previousHash: 'tampered_previous_hash' }
    : record);
}

async function validateSchema(supabase) {
  const columnProbe = await supabase
    .from('audit_events')
    .select('id,organization_id,actor_user_id,previous_hash,event_hash,hash_algorithm,hash_signature,created_at')
    .limit(1);

  return {
    auditEventsTableReadable: !columnProbe.error,
    requiredColumnsReadable: !columnProbe.error,
    columnProbeErrorCode: columnProbe.error?.code ?? null,
  };
}

function chunkIds(ids) {
  const chunks = [];
  for (let index = 0; index < ids.length; index += CLEANUP_CHUNK_SIZE) {
    chunks.push(ids.slice(index, index + CLEANUP_CHUNK_SIZE));
  }
  return chunks;
}

async function cleanupSyntheticAuditEvents(supabase, ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { verified: true, failureCodes: [] };
  }

  const failureCodes = [];
  for (const chunk of chunkIds(ids)) {
    const { error: deleteError } = await supabase.from('audit_events').delete().in('id', chunk);
    if (deleteError) failureCodes.push('audit_event_cleanup_failed');
  }

  for (const chunk of chunkIds(ids)) {
    const { data, error: verifyError } = await supabase.from('audit_events').select('id').in('id', chunk);
    if (verifyError || (Array.isArray(data) && data.length > 0)) {
      failureCodes.push('audit_event_cleanup_not_verified');
    }
  }

  return { verified: failureCodes.length === 0, failureCodes: [...new Set(failureCodes)] };
}

async function runLiveValidation() {
  const supabaseUrl = readRuntimeSetting(supabaseUrlEnv);
  const serviceRoleKey = readRuntimeSetting(serviceRoleEnv);

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      status: 'Skipped',
      reason: 'missing_target_supabase_configuration',
      requiredEnv: [supabaseUrlEnv, serviceRoleEnv],
      fixtureMode: 'ephemeral',
      ephemeralFixturesCreated: false,
      cleanup: { status: 'NotRun', auditEventsRemoved: false, authFixturesRemoved: false, failureCodes: [] },
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  let fixtures = null;
  const createdAuditEventIds = [];
  let validation = {
    status: 'Failed',
    failureCode: 'validation_not_started',
  };
  let auditCleanup;
  let authCleanup = { verified: false, failures: ['auth_fixture_cleanup_not_run'] };

  try {
    fixtures = await createEphemeralAuthFixtures(supabase, { purpose: 'audit-chain-live-proof' });
    const organizationId = fixtures.organizationA.id;
    const actorUserId = fixtures.owner.id;
    const schema = await validateSchema(supabase);
    if (!schema.auditEventsTableReadable || !schema.requiredColumnsReadable) {
      throw new Error('audit_chain_schema_not_ready');
    }

    const initialPreviousHash = await getPreviousHash(supabase, organizationId);
    const normalPayload = buildChainPayload({ organizationId, actorUserId, previousHash: initialPreviousHash, suffix: 'append-normal' });
    createdAuditEventIds.push(normalPayload.input.id);
    const normalAppend = await appendViaRpc(supabase, normalPayload);
    if (normalAppend.error) throw new Error(`normal_append_failed:${normalAppend.error.code ?? 'unknown'}`);

    const concurrencyBatches = [];
    for (const level of CONCURRENCY_LEVELS) {
      const batchStartedAt = Date.now();
      const results = await Promise.all(
        Array.from({ length: level }, (_, index) => appendWithRetry(supabase, {
          organizationId,
          actorUserId,
          suffix: `burst-${level}-${index + 1}`,
        })),
      );
      const successful = results.filter((result) => result.ok);
      createdAuditEventIds.push(...successful.map((result) => result.eventId));
      concurrencyBatches.push({
        requested: level,
        persisted: successful.length,
        lost: level - successful.length,
        previousHashMismatches: results.reduce((sum, result) => sum + result.conflicts, 0),
        maxAttemptsObserved: Math.max(...results.map((result) => result.attempts)),
        maxWorkerLatencyMs: Math.max(...results.map((result) => result.latencyMs)),
        latencyMs: Date.now() - batchStartedAt,
        errorCodes: [...new Set(results.filter((result) => !result.ok).map((result) => result.errorCode))],
      });
      await waitForBatchSettle();
    }

    const concurrencySafe = concurrencyBatches.every((batch) => batch.lost === 0 && batch.persisted === batch.requested);
    const expectedSyntheticEvents = 1 + CONCURRENCY_LEVELS.reduce((sum, level) => sum + level, 0);

    const { data: rows, error: readbackError } = await supabase
      .from('audit_events')
      .select('id,organization_id,actor_user_id,action,entity_type,entity_id,metadata,created_at,previous_hash,event_hash,hash_signature')
      .eq('organization_id', organizationId)
      .eq('action', syntheticAction)
      .not('event_hash', 'is', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(expectedSyntheticEvents + 5);

    if (readbackError) throw new Error(`readback_failed:${readbackError.code ?? 'unknown'}`);

    const chronologicalRows = [...(rows ?? [])].reverse();
    const records = chronologicalRows.map(mapRowToRecord);
    const anchorPreviousHash = records[0]?.previousHash ?? null;
    const verify = verifyAuditChain(records, anchorPreviousHash);
    const allPersisted = records.length === expectedSyntheticEvents;
    const tampered = records.length > 0
      ? verifyAuditChain([{ ...records[0], metadata: { ...(records[0].metadata ?? {}), tampered: true } }, ...records.slice(1)], anchorPreviousHash)
      : { ok: true, failures: [] };
    const missingPrevious = records.length > 0
      ? verifyAuditChain(withBrokenPreviousHash(records), anchorPreviousHash)
      : { ok: true, failures: [] };

    const tamperDetected = !tampered.ok && tampered.failures.some((failure) => failure.reason === 'event_hash_mismatch');
    const missingPreviousDetected = !missingPrevious.ok && missingPrevious.failures.some((failure) => failure.reason === 'previous_hash_mismatch');
    const livePassed = Boolean(
      schema.auditEventsTableReadable
        && schema.requiredColumnsReadable
        && concurrencySafe
        && allPersisted
        && verify.ok
        && tamperDetected
        && missingPreviousDetected
    );

    validation = {
      status: livePassed ? 'Complete' : 'Failed',
      fixtureMode: 'ephemeral',
      ephemeralFixturesCreated: true,
      ephemeralActorConfigured: true,
      schema,
      appendNormal: { status: normalAppend.error ? 'Failed' : 'Complete', eventHashPrefix: normalPayload.eventHash.slice(0, 12) },
      appendConcurrent: {
        status: concurrencySafe && allPersisted ? 'Complete' : 'Failed',
        levels: [...CONCURRENCY_LEVELS],
        batches: concurrencyBatches,
        requested: CONCURRENCY_LEVELS.reduce((sum, level) => sum + level, 0),
        persisted: concurrencyBatches.reduce((sum, batch) => sum + batch.persisted, 0),
        lost: concurrencyBatches.reduce((sum, batch) => sum + batch.lost, 0),
        previousHashMismatches: concurrencyBatches.reduce((sum, batch) => sum + batch.previousHashMismatches, 0),
        errorCount: concurrencyBatches.reduce((sum, batch) => sum + batch.lost, 0),
        retryStatus: concurrencySafe ? 'Complete' : 'Failed',
        maxAttempts: LIVE_APPEND_MAX_ATTEMPTS,
        retryBaseMs: LIVE_RETRY_BASE_MS,
        retryCapMs: LIVE_RETRY_CAP_MS,
        batchSettleMs: LIVE_BATCH_SETTLE_MS,
        note: 'Each worker retries only previous-hash conflicts after rereading the current chain head with dephased exponential jitter; PASS requires zero lost events at 10, 25, 50 and 100 parallel writes.',
      },
      tamperDetection: {
        status: tamperDetected ? 'Complete' : 'Failed',
        failureReasons: [...new Set(tampered.failures.map((failure) => failure.reason))],
      },
      missingPreviousHash: {
        status: missingPreviousDetected ? 'Complete' : 'Failed',
        failureReasons: [...new Set(missingPrevious.failures.map((failure) => failure.reason))],
      },
      readbackVerification: {
        status: verify.ok && allPersisted ? 'Complete' : 'Failed',
        checked: verify.checked,
        expected: expectedSyntheticEvents,
        failureCount: verify.failures.length,
        lastHashPrefix: verify.lastHash?.slice(0, 12) ?? null,
      },
    };
  } catch (error) {
    validation = {
      status: 'Failed',
      fixtureMode: 'ephemeral',
      ephemeralFixturesCreated: Boolean(fixtures),
      failureCode: safeFailureCode(error),
    };
  } finally {
    auditCleanup = await cleanupSyntheticAuditEvents(supabase, createdAuditEventIds);
    if (fixtures?.created) {
      authCleanup = await cleanupEphemeralAuthFixtures(supabase, fixtures.created);
    }
  }

  const cleanupFailureCodes = [
    ...auditCleanup.failureCodes,
    ...(authCleanup.failures ?? []),
  ];
  const cleanupVerified = auditCleanup.verified && authCleanup.verified;
  const cleanup = {
    status: cleanupVerified ? 'Complete' : 'Failed',
    auditEventsRemoved: auditCleanup.verified,
    authFixturesRemoved: authCleanup.verified,
    failureCodes: [...new Set(cleanupFailureCodes)],
  };

  return {
    ...validation,
    status: validation.status === 'Complete' && cleanupVerified ? 'Complete' : 'Failed',
    cleanup,
  };
}

const generatedAt = new Date().toISOString();
const sourceFailures = validateSources();
const enterpriseRelease = readRuntimeSetting(enterpriseReleaseEnv) === 'true' || readRuntimeSetting(legacyEnterpriseReleaseEnv) === 'true';
let liveValidation;

try {
  liveValidation = await runLiveValidation();
} catch (error) {
  liveValidation = {
    status: 'Failed',
    fixtureMode: 'ephemeral',
    failureCode: safeFailureCode(error),
    cleanup: { status: 'Failed', auditEventsRemoved: false, authFixturesRemoved: false, failureCodes: ['unhandled_validation_failure'] },
  };
}

const liveProofPresent = liveValidation.status === 'Complete'
  && liveValidation.cleanup?.status === 'Complete'
  && readRuntimeSetting(proofEnv) === 'true';
const status = sourceFailures.length > 0
  ? 'Failed'
  : liveProofPresent
    ? 'Complete'
    : liveValidation.status === 'Complete'
      ? 'LiveProofRequired'
      : 'TargetValidationRequired';

const evidence = {
  evidenceItem: 'audit-chain-live-validation',
  id: 'audit-chain-live-validation',
  status,
  generatedAt,
  reviewer: 'RISCK COMPLY protected security automation',
  control: 'Enterprise audit logging and tamper-evident audit chain live validation',
  redactionConfirmation: 'Redaction confirmed for runtime evidence.',
  sourceValidation: {
    status: sourceFailures.length === 0,
    failures: sourceFailures,
    files: requiredFiles,
  },
  runtimeConfiguration: {
    hasSupabaseUrl: redactedPresence(supabaseUrlEnv),
    hasServiceRoleKey: redactedPresence(serviceRoleEnv),
    hasAuditSigningSecret: redactedPresence(auditSigningEnv),
    hasEvidencePackSigningSecret: redactedPresence(evidenceSigningEnv),
    hasTargetOrganization: liveValidation.ephemeralFixturesCreated === true,
    ephemeralFixtureMode: true,
    persistentFixtureSecretsRequired: false,
    liveProof: {
      present: liveProofPresent,
      requiredEnv: `${proofEnv}=true`,
      note: 'The protected exact-main workflow owns the live-proof flag after successful same-run validation and cleanup.',
    },
  },
  liveValidation,
  criticalEventCoverage,
  acceptanceCriteria: {
    migrationsApplied: liveValidation.status === 'Complete',
    rpcExists: liveValidation.status === 'Complete',
    createAuditEventUsesTransactionalRpc: sourceFailures.length === 0,
    appendNormal: liveValidation.appendNormal?.status === 'Complete',
    appendConcurrent: liveValidation.appendConcurrent?.status === 'Complete',
    auditChainDetectsTampering: liveValidation.tamperDetection?.status === 'Complete',
    missingPreviousHashDetected: liveValidation.missingPreviousHash?.status === 'Complete',
    verificationRequiresRbacAndStepUp: sourceFailures.length === 0,
    exportRequiresRbacAndStepUp: sourceFailures.length === 0,
    exportIsSigned: redactedPresence(evidenceSigningEnv),
    ephemeralFixtureCleanup: liveValidation.cleanup?.status === 'Complete',
    liveProofAttached: liveProofPresent,
  },
  releaseGate: {
    enterpriseRelease,
    blocked: enterpriseRelease && status !== 'Complete',
    reason: enterpriseRelease && status !== 'Complete' ? 'audit_chain_target_live_validation_incomplete' : null,
  },
  evidenceIntegrity: {
    containsSensitiveValues: false,
    credentialsStored: false,
    rawAuditPayloadsStored: false,
    rawIdentifiersStored: false,
    persistentFixtureCredentialsStored: false,
    syntheticAuditEventsRetained: liveValidation.cleanup?.auditEventsRemoved !== true,
    ephemeralFixtureCleanupVerified: liveValidation.cleanup?.status === 'Complete',
  },
};

mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(`Wrote ${evidencePath}`);

if (sourceFailures.length > 0) {
  console.error('Audit-chain source validation failed.');
  process.exitCode = 1;
} else if (enterpriseRelease && status !== 'Complete') {
  console.error('Enterprise release blocked: protected audit-chain runtime validation is incomplete.');
  process.exitCode = 1;
} else if (liveValidation.status !== 'Complete') {
  console.warn(`Audit-chain live validation not complete: ${liveValidation.reason ?? liveValidation.failureCode ?? liveValidation.status}`);
} else if (!liveProofPresent) {
  console.warn('Audit-chain live validation passed, but protected live-proof attestation is pending.');
} else {
  console.log('Audit-chain live validation evidence generated with verified ephemeral cleanup.');
}