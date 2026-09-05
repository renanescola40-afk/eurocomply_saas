#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

export const SYNTHETIC_PURPOSE = 'audit-chain-live-proof';
export const SYNTHETIC_SLUG_PREFIX = `${SYNTHETIC_PURPOSE}-`;
export const SYNTHETIC_EMAIL_PREFIX = `${SYNTHETIC_PURPOSE}-`;
export const SYNTHETIC_AUDIT_ACTION = 'security.audit_chain_live_validation';
export const MAX_RECOVERY_WINDOW_MS = 2 * 60 * 60 * 1000;
export const REQUEST_TIMEOUT_MS = 8_000;
export const MAX_RETRY_ATTEMPTS = 3;
export const MAX_SYNTHETIC_ORGANIZATIONS = 20;
export const MAX_SYNTHETIC_USERS = 30;
export const MAX_SYNTHETIC_AUDIT_EVENTS = 1_000;
export const PROTECTED_ORGANIZATION_IDS = new Set([
  '0d5926df-1027-42da-8b14-579cc2630947',
  'bf6115c2-4258-4fde-9d43-854cb98bb075',
]);

const EVIDENCE_PATH = 'docs/security/evidence/runtime/audit-chain-synthetic-recovery.json';

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function safeFailureCode(value) {
  const raw = value instanceof Error ? value.message : String(value || 'unknown_error');
  return (raw.split(':', 1)[0] || 'unknown_error')
    .replace(/[^a-zA-Z0-9_.-]+/g, '_')
    .slice(0, 96);
}

function timedFetch(input, init = {}) {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
  return fetch(input, { ...init, signal });
}

export function validateRecoveryWindow(fromValue, toValue) {
  const from = new Date(fromValue);
  const to = new Date(toValue);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error('recovery_window_invalid');
  }
  if (from >= to) throw new Error('recovery_window_order_invalid');
  if (to.getTime() - from.getTime() > MAX_RECOVERY_WINDOW_MS) {
    throw new Error('recovery_window_too_wide');
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

export function isSyntheticOrganizationRow(row) {
  return Boolean(row?.id)
    && typeof row?.slug === 'string'
    && row.slug.startsWith(SYNTHETIC_SLUG_PREFIX)
    && !PROTECTED_ORGANIZATION_IDS.has(row.id);
}

export function isSyntheticAuthUser(user, fromIso, toIso) {
  const email = String(user?.email || '').toLowerCase();
  const createdAt = new Date(user?.created_at || '');
  return Boolean(user?.id)
    && email.startsWith(SYNTHETIC_EMAIL_PREFIX)
    && email.endsWith('@example.com')
    && !Number.isNaN(createdAt.getTime())
    && createdAt >= new Date(fromIso)
    && createdAt <= new Date(toIso);
}

function assertBoundedCount(count, maximum, code) {
  if (!Number.isInteger(count) || count < 0 || count > maximum) throw new Error(code);
}

async function withRetry(label, operation) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRY_ATTEMPTS) await sleep(250 * (2 ** (attempt - 1)));
    }
  }
  throw new Error(`${label}:${safeFailureCode(lastError)}`);
}

function requireNoError(response, code) {
  if (response?.error) throw new Error(`${code}:${response.error.code || 'provider_error'}`);
  return response?.data ?? null;
}

async function querySyntheticOrganizations(admin, from, to) {
  const data = await withRetry('organization_discovery_failed', async () => requireNoError(
    await admin
      .from('organizations')
      .select('id,slug,created_at')
      .like('slug', `${SYNTHETIC_SLUG_PREFIX}%`)
      .gte('created_at', from)
      .lte('created_at', to)
      .limit(MAX_SYNTHETIC_ORGANIZATIONS + 1),
    'organization_discovery_failed',
  ));
  const rows = Array.isArray(data) ? data : [];
  assertBoundedCount(rows.length, MAX_SYNTHETIC_ORGANIZATIONS, 'organization_scope_too_large');
  if (rows.some((row) => !isSyntheticOrganizationRow(row))) throw new Error('organization_scope_not_synthetic');
  return rows;
}

async function querySyntheticAuditEvents(admin, from, to) {
  const data = await withRetry('audit_event_discovery_failed', async () => requireNoError(
    await admin
      .from('audit_events')
      .select('id,action,created_at')
      .eq('action', SYNTHETIC_AUDIT_ACTION)
      .gte('created_at', from)
      .lte('created_at', to)
      .limit(MAX_SYNTHETIC_AUDIT_EVENTS + 1),
    'audit_event_discovery_failed',
  ));
  const rows = Array.isArray(data) ? data : [];
  assertBoundedCount(rows.length, MAX_SYNTHETIC_AUDIT_EVENTS, 'audit_event_scope_too_large');
  if (rows.some((row) => row.action !== SYNTHETIC_AUDIT_ACTION)) throw new Error('audit_event_scope_not_synthetic');
  return rows;
}

async function querySyntheticUsers(admin, from, to) {
  const matched = [];
  const perPage = 200;
  for (let page = 1; page <= 20; page += 1) {
    const response = await withRetry('auth_user_discovery_failed', async () => admin.auth.admin.listUsers({ page, perPage }));
    if (response?.error) throw new Error(`auth_user_discovery_failed:${response.error.status || 'provider_error'}`);
    const users = Array.isArray(response?.data?.users) ? response.data.users : [];
    matched.push(...users.filter((user) => isSyntheticAuthUser(user, from, to)));
    if (users.length < perPage) break;
  }
  assertBoundedCount(matched.length, MAX_SYNTHETIC_USERS, 'auth_user_scope_too_large');
  return matched;
}

async function deleteByIdsAndVerify(admin, table, ids, failureCode) {
  if (ids.length === 0) return;
  await withRetry(`${failureCode}_delete`, async () => {
    const response = await admin.from(table).delete().in('id', ids);
    if (response.error) throw new Error(response.error.code || 'provider_error');
  });
  await withRetry(`${failureCode}_verify`, async () => {
    const response = await admin.from(table).select('id').in('id', ids);
    if (response.error) throw new Error(response.error.code || 'provider_error');
    if (Array.isArray(response.data) && response.data.length > 0) throw new Error('rows_still_present');
  });
}

async function deleteByOrganizationAndVerify(admin, table, organizationIds, selectColumns, failureCode) {
  if (organizationIds.length === 0) return;
  await withRetry(`${failureCode}_delete`, async () => {
    const response = await admin.from(table).delete().in('organization_id', organizationIds);
    if (response.error) throw new Error(response.error.code || 'provider_error');
  });
  await withRetry(`${failureCode}_verify`, async () => {
    const response = await admin.from(table).select(selectColumns).in('organization_id', organizationIds);
    if (response.error) throw new Error(response.error.code || 'provider_error');
    if (Array.isArray(response.data) && response.data.length > 0) throw new Error('rows_still_present');
  });
}

async function deleteUsersAndVerify(admin, users) {
  for (const user of users) {
    await withRetry('auth_user_delete_failed', async () => {
      const response = await admin.auth.admin.deleteUser(user.id);
      if (response?.error) throw new Error(String(response.error.status || 'provider_error'));
    });
  }
  for (const user of users) {
    await withRetry('auth_user_verify_failed', async () => {
      const response = await admin.auth.admin.getUserById(user.id);
      if (!response?.error && response?.data?.user) throw new Error('user_still_present');
      const status = Number(response?.error?.status || 0);
      if (response?.error && status !== 404 && !/not found/i.test(String(response.error.message || ''))) {
        throw new Error(String(status || 'provider_error'));
      }
    });
  }
}

function writeEvidence(evidence) {
  mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
  writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
}

export async function runRecovery() {
  const targetSha = env('TARGET_SHA').toLowerCase();
  const confirmation = env('AUDIT_CHAIN_SYNTHETIC_CLEANUP_CONFIRMATION');
  const sourceRunId = env('RECOVERY_SOURCE_RUN_ID');
  const { from, to } = validateRecoveryWindow(env('RECOVERY_FROM'), env('RECOVERY_TO'));
  if (!/^[0-9a-f]{40}$/.test(targetSha)) throw new Error('target_sha_invalid');
  if (confirmation !== 'CLEANUP_AUDIT_CHAIN_SYNTHETIC') throw new Error('cleanup_confirmation_invalid');
  if (!/^\d+$/.test(sourceRunId)) throw new Error('source_run_id_invalid');

  const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) throw new Error('supabase_configuration_missing');

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: timedFetch },
  });

  const startedAt = new Date().toISOString();
  try {
    const [organizations, auditEvents, users] = await Promise.all([
      querySyntheticOrganizations(admin, from, to),
      querySyntheticAuditEvents(admin, from, to),
      querySyntheticUsers(admin, from, to),
    ]);
    const organizationIds = organizations.map((row) => row.id);
    const auditEventIds = auditEvents.map((row) => row.id);

    await deleteByIdsAndVerify(admin, 'audit_events', auditEventIds, 'audit_event_cleanup');
    await deleteByOrganizationAndVerify(admin, 'organization_entitlements', organizationIds, 'organization_id', 'organization_entitlement_cleanup');
    await deleteByOrganizationAndVerify(admin, 'organization_usage', organizationIds, 'organization_id', 'organization_usage_cleanup');
    await deleteByOrganizationAndVerify(admin, 'enterprise_contracts', organizationIds, 'id', 'enterprise_contract_cleanup');
    await deleteByOrganizationAndVerify(admin, 'organization_members', organizationIds, 'id', 'membership_cleanup');
    await deleteByIdsAndVerify(admin, 'organizations', organizationIds, 'organization_cleanup');
    await deleteUsersAndVerify(admin, users);

    const evidence = {
      schema: 'risck-comply.audit-chain-synthetic-recovery.v1',
      status: 'Complete',
      outcome: 'passed',
      generatedAt: new Date().toISOString(),
      targetSha,
      sourceRunId,
      recoveryWindow: { from, to },
      syntheticScope: {
        purpose: SYNTHETIC_PURPOSE,
        auditAction: SYNTHETIC_AUDIT_ACTION,
        organizationsMatched: organizations.length,
        auditEventsMatched: auditEvents.length,
        authUsersMatched: users.length,
      },
      cleanup: {
        verified: true,
        historicalFixtureCleanupAttempted: false,
        protectedOrganizationIdsTouched: false,
      },
      evidenceIntegrity: {
        containsSensitiveValues: false,
        rawIdentifiersStored: false,
        credentialsStored: false,
      },
      startedAt,
    };
    writeEvidence(evidence);
    return evidence;
  } catch (error) {
    const evidence = {
      schema: 'risck-comply.audit-chain-synthetic-recovery.v1',
      status: 'Failed',
      outcome: 'failed',
      generatedAt: new Date().toISOString(),
      targetSha,
      sourceRunId,
      recoveryWindow: { from, to },
      failureCode: safeFailureCode(error),
      cleanup: {
        verified: false,
        historicalFixtureCleanupAttempted: false,
        protectedOrganizationIdsTouched: false,
      },
      evidenceIntegrity: {
        containsSensitiveValues: false,
        rawIdentifiersStored: false,
        credentialsStored: false,
      },
      startedAt,
    };
    writeEvidence(evidence);
    throw error;
  }
}

const directExecution = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (directExecution) {
  runRecovery()
    .then((evidence) => {
      console.log(`Synthetic recovery ${evidence.status}; organizations=${evidence.syntheticScope.organizationsMatched}, auditEvents=${evidence.syntheticScope.auditEventsMatched}, authUsers=${evidence.syntheticScope.authUsersMatched}.`);
    })
    .catch((error) => {
      console.error(`Synthetic recovery failed: ${safeFailureCode(error)}.`);
      process.exitCode = 1;
    });
}
