#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const OUTPUT = 'docs/security/evidence/runtime/final-technical-controls-validation.json';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const BUCKET = 'compliance-documents';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FULL_SHA = /^[0-9a-f]{40}$/;
const env = (name) => String(process.env[name] ?? '').trim();
const failures = [];
const checks = {};

function required(name) {
  const value = env(name);
  if (!value) failures.push(`missing_${name.toLowerCase()}`);
  return value;
}

function client(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function signIn(label, supabase, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) throw new Error(`${label}_sign_in_failed`);
}

function sql(connection, statement) {
  return execFileSync('psql', [
    connection,
    '--no-psqlrc',
    '--tuples-only',
    '--no-align',
    '--quiet',
    '--set', 'ON_ERROR_STOP=1',
    '--command', statement,
  ], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120_000,
    maxBuffer: 1024 * 1024,
  }).trim();
}

async function proveStorageIsolation({ url, anonKey, serviceRoleKey, organizationId, ownerEmail, ownerPassword, outsiderEmail, outsiderPassword }) {
  if (!UUID.test(organizationId)) throw new Error('organization_fixture_invalid');
  const owner = client(url, anonKey);
  const outsider = client(url, anonKey);
  const admin = client(url, serviceRoleKey);
  const proofId = randomUUID();
  const ownerPath = `${organizationId}/enterprise-proof/${proofId}-owner.txt`;
  const outsiderPath = `${organizationId}/enterprise-proof/${proofId}-outsider.txt`;
  const content = `risck-comply-storage-proof-${randomBytes(16).toString('hex')}`;

  try {
    await signIn('owner', owner, ownerEmail, ownerPassword);
    await signIn('outsider', outsider, outsiderEmail, outsiderPassword);

    const ownerUpload = await owner.storage.from(BUCKET).upload(ownerPath, content, {
      contentType: 'text/plain',
      cacheControl: '0',
      upsert: false,
    });
    checks.ownerUploadAllowed = !ownerUpload.error;
    if (!checks.ownerUploadAllowed) throw new Error('owner_storage_upload_failed');

    const ownerDownload = await owner.storage.from(BUCKET).download(ownerPath);
    checks.ownerReadAllowed = !ownerDownload.error
      && ownerDownload.data !== null
      && await ownerDownload.data.text() === content;
    if (!checks.ownerReadAllowed) throw new Error('owner_storage_read_failed');

    const outsiderRead = await outsider.storage.from(BUCKET).download(ownerPath);
    checks.outsiderReadDenied = Boolean(outsiderRead.error) || outsiderRead.data === null;
    if (!checks.outsiderReadDenied) throw new Error('outsider_storage_read_not_denied');

    const outsiderUpload = await outsider.storage.from(BUCKET).upload(outsiderPath, content, {
      contentType: 'text/plain',
      cacheControl: '0',
      upsert: false,
    });
    checks.outsiderUploadDenied = Boolean(outsiderUpload.error);
    if (!checks.outsiderUploadDenied) throw new Error('outsider_storage_upload_not_denied');
  } finally {
    try {
      const cleanup = await admin.storage.from(BUCKET).remove([ownerPath, outsiderPath]);
      const ownerAfterCleanup = await admin.storage.from(BUCKET).download(ownerPath);
      const outsiderAfterCleanup = await admin.storage.from(BUCKET).download(outsiderPath);
      checks.syntheticObjectsRemoved = !cleanup.error
        && (Boolean(ownerAfterCleanup.error) || ownerAfterCleanup.data === null)
        && (Boolean(outsiderAfterCleanup.error) || outsiderAfterCleanup.data === null);
    } finally {
      const signOutResults = await Promise.all([owner.auth.signOut(), outsider.auth.signOut()]);
      checks.sessionsRevoked = signOutResults.every((result) => !result.error);
    }
  }
}

function proveSecurityEvents(connection) {
  const marker = `enterprise-proof-${randomBytes(12).toString('hex')}`;
  const digest = randomBytes(32).toString('hex');
  const transaction = `
    begin;
    create temporary table final_proof_context (incident_id uuid not null, organization_id uuid not null) on commit drop;
    insert into final_proof_context (incident_id, organization_id)
      select gen_random_uuid(), id from public.organizations order by id asc limit 1;
    insert into public.security_incidents (id, organization_id, title, severity, status, category)
      select incident_id, organization_id, '${marker}', 'sev4', 'detected', 'other' from final_proof_context;
    insert into public.incident_timeline_events (organization_id, incident_id, event_type, summary, occurred_at, evidence_digest_sha256)
      select organization_id, incident_id, 'evidence', '${marker}', now(), '${digest}' from final_proof_context;
    select
      (select count(*) from public.security_incidents where title = '${marker}')::text || '|' ||
      (select count(*) from public.incident_timeline_events where summary = '${marker}')::text;
    rollback;
  `;
  const result = sql(connection, transaction).split('\n').filter(Boolean).at(-1) ?? '';
  const [incidentCount, timelineCount] = result.split('|').map(Number);
  checks.securityEventInserted = incidentCount === 1;
  checks.timelineEventInserted = timelineCount === 1;
  if (!checks.securityEventInserted || !checks.timelineEventInserted) throw new Error('security_event_transaction_failed');

  const afterRollback = Number(sql(connection, `
    select
      (select count(*) from public.security_incidents where title = '${marker}') +
      (select count(*) from public.incident_timeline_events where summary = '${marker}');
  `));
  checks.transactionRolledBack = afterRollback === 0;
  if (!checks.transactionRolledBack) throw new Error('security_event_transaction_not_rolled_back');
}

async function main() {
  const generatedAt = new Date().toISOString();
  const url = required('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = required('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
  const organizationId = required('AUTH_RBAC_ORGANIZATION_A_ID');
  const ownerEmail = required('AUTH_RBAC_OWNER_EMAIL');
  const ownerPassword = required('AUTH_RBAC_OWNER_PASSWORD');
  const outsiderEmail = required('AUTH_RBAC_OUTSIDER_EMAIL');
  const outsiderPassword = required('AUTH_RBAC_OUTSIDER_PASSWORD');
  const recoveryDatabase = required('RECOVERY_ISOLATED_DATABASE_URL');
  const targetSha = env('ENTERPRISE_EXPECTED_SHA').toLowerCase();
  const observedSha = env('GITHUB_SHA').toLowerCase();

  checks.protectedMainExecution = env('GITHUB_ACTIONS') === 'true'
    && env('GITHUB_REF_NAME') === 'main'
    && env('FINAL_TECHNICAL_CONFIRMATION') === 'EXECUTE_FINAL_TECHNICAL_PROOF';
  checks.exactShaBound = FULL_SHA.test(targetSha) && observedSha === targetSha;

  try {
    if (failures.length || !checks.protectedMainExecution || !checks.exactShaBound) {
      throw new Error('final_technical_preconditions_failed');
    }
    await proveStorageIsolation({
      url,
      anonKey,
      serviceRoleKey,
      organizationId,
      ownerEmail,
      ownerPassword,
      outsiderEmail,
      outsiderPassword,
    });
    if (!checks.syntheticObjectsRemoved || !checks.sessionsRevoked) throw new Error('storage_cleanup_failed');
    proveSecurityEvents(recoveryDatabase);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : 'unknown_final_technical_failure');
  }

  const canonicalChecks = {
    protectedMainExecution: checks.protectedMainExecution === true,
    exactShaBound: checks.exactShaBound === true,
    ownerUploadAllowed: checks.ownerUploadAllowed === true,
    ownerReadAllowed: checks.ownerReadAllowed === true,
    outsiderReadDenied: checks.outsiderReadDenied === true,
    outsiderUploadDenied: checks.outsiderUploadDenied === true,
    syntheticObjectsRemoved: checks.syntheticObjectsRemoved === true,
    sessionsRevoked: checks.sessionsRevoked === true,
    securityEventInserted: checks.securityEventInserted === true,
    timelineEventInserted: checks.timelineEventInserted === true,
    transactionRolledBack: checks.transactionRolledBack === true,
  };
  const passed = failures.length === 0 && Object.values(canonicalChecks).every(Boolean);
  const evidence = {
    schema: 'risck-comply.final-technical-controls-evidence.v1',
    evidenceItem: 'final-technical-controls-validation',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'failed',
    generatedAt,
    repository: REPOSITORY,
    branch: 'main',
    targetSha: FULL_SHA.test(targetSha) ? targetSha : null,
    observedSha: FULL_SHA.test(observedSha) ? observedSha : null,
    workflowRunId: /^\d+$/.test(env('GITHUB_RUN_ID')) ? env('GITHUB_RUN_ID') : null,
    checks: canonicalChecks,
    failures: [...new Set(failures)],
    evidenceIntegrity: {
      containsSensitiveValues: false,
      objectPathsStored: false,
      organizationIdentifiersStored: false,
      userIdentifiersStored: false,
      credentialsStored: false,
      objectBodiesStored: false,
      databaseUrlStored: false,
      securityEventContentStored: false,
      syntheticStorageRemoved: canonicalChecks.syntheticObjectsRemoved,
      syntheticDatabaseRowsRolledBack: canonicalChecks.transactionRolledBack,
      exactShaBound: canonicalChecks.exactShaBound,
    },
    evidenceBoundary: 'Protected synthetic proof of storage tenant isolation and security-event persistence. The object is deleted, database writes are rolled back, and no paths, identities, credentials, payloads, database URLs or event content are retained.',
  };
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(`Final technical controls evidence: ${evidence.status}/${evidence.outcome}`);
  if (!passed) process.exitCode = 1;
}

await main();
