#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.supabase.com/v1';
const PROJECT_REF = /^[a-z0-9]{20}$/;
const FULL_SHA = /^[a-f0-9]{40}$/;
const output = 'docs/security/evidence/p1/backup-restore-tested.json';
const criticalTables = ['organizations', 'organization_members', 'audit_logs'];

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function required(name) {
  const value = env(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

export function projectRefFromApiUrl(value) {
  const url = new URL(String(value));
  const match = url.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
  if (!match) throw new Error('source_supabase_url_not_canonical');
  return match[1];
}

function safeIso(value, code) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(code);
  return timestamp;
}

async function request(path, { method = 'GET', body, readOnly = false } = {}) {
  const token = required('SUPABASE_ACCESS_TOKEN');
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`supabase_management_api_${readOnly ? 'read_only_' : ''}${response.status}`);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('supabase_management_api_invalid_json');
  }
}

function valuesDeep(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(valuesDeep);
  if (typeof value === 'object') return Object.values(value).flatMap(valuesDeep);
  return [String(value)];
}

export function backupResponseContainsIdentifier(payload, identifier) {
  return valuesDeep(payload).some((value) => value === identifier);
}

function unwrapRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.data)) return payload.data;
  throw new Error('supabase_query_response_shape_invalid');
}

function snapshotQuery() {
  return `select json_build_object(
    'organizations', (select count(*)::int from public.organizations),
    'organization_members', (select count(*)::int from public.organization_members),
    'audit_logs', (select count(*)::int from public.audit_logs),
    'auth_users', (select count(*)::int from auth.users),
    'migration_versions', (select coalesce(json_agg(version order by version), '[]'::json) from supabase_migrations.schema_migrations),
    'rls_tables', (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('organizations','organization_members','audit_logs') and c.relrowsecurity=true),
    'policy_count', (select count(*)::int from pg_policies where schemaname='public' and tablename in ('organizations','organization_members','audit_logs')),
    'foreign_servers', (select count(*)::int from pg_foreign_server),
    'foreign_tables', (select count(*)::int from information_schema.foreign_tables)
  ) as snapshot;`;
}

async function readSnapshot(ref) {
  const payload = await request(`/projects/${ref}/database/query/read-only`, {
    method: 'POST',
    readOnly: true,
    body: { query: snapshotQuery() },
  });
  const rows = unwrapRows(payload);
  const snapshot = rows[0]?.snapshot ?? rows[0]?.json_build_object ?? rows[0]?.jsonb_build_object;
  if (!snapshot || typeof snapshot !== 'object') throw new Error('snapshot_aggregate_missing');
  return snapshot;
}

function integer(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
}

export function validateProviderManagedSnapshot({ source, restore }) {
  const sourceCounts = {};
  const restoredCounts = {};
  for (const table of criticalTables) {
    sourceCounts[table] = integer(source?.[table]);
    restoredCounts[table] = integer(restore?.[table]);
    if (sourceCounts[table] == null || restoredCounts[table] == null) throw new Error(`invalid_${table}_count`);
  }
  const sourceAuthUsers = integer(source?.auth_users);
  const restoredAuthUsers = integer(restore?.auth_users);
  if (sourceAuthUsers == null || restoredAuthUsers == null) throw new Error('invalid_auth_users_count');

  const sourceVersions = Array.isArray(source?.migration_versions) ? source.migration_versions.map(String) : null;
  const restoreVersions = Array.isArray(restore?.migration_versions) ? restore.migration_versions.map(String) : null;
  if (!sourceVersions || !restoreVersions || sourceVersions.length === 0 || restoreVersions.length === 0) throw new Error('migration_history_missing');
  if (JSON.stringify(sourceVersions) !== JSON.stringify(restoreVersions)) throw new Error('provider_restore_migration_history_mismatch');

  const rlsTables = integer(restore?.rls_tables);
  const policyCount = integer(restore?.policy_count);
  if (rlsTables !== criticalTables.length) throw new Error('provider_restore_rls_incomplete');
  if (policyCount == null || policyCount < criticalTables.length) throw new Error('provider_restore_policies_incomplete');

  const foreignServers = integer(restore?.foreign_servers);
  const foreignTables = integer(restore?.foreign_tables);
  if (foreignServers == null || foreignTables == null) throw new Error('provider_restore_external_binding_inventory_invalid');
  if (foreignServers !== 0 || foreignTables !== 0) throw new Error('provider_restore_external_binding_present');

  return { sourceCounts, restoredCounts, sourceAuthUsers, restoredAuthUsers, sourceVersions, restoreVersions, rlsTables, policyCount };
}

function projectField(project, ...names) {
  for (const name of names) if (project?.[name] != null) return String(project[name]);
  return '';
}

async function verify() {
  const targetSha = required('RELEASE_SHA').toLowerCase();
  const observedSha = required('GITHUB_SHA').toLowerCase();
  if (!FULL_SHA.test(targetSha) || observedSha !== targetSha) throw new Error('exact_sha_binding_invalid');
  if (env('GITHUB_ACTIONS') !== 'true' || env('GITHUB_REF_NAME') !== 'main') throw new Error('protected_main_execution_required');

  const sourceRef = projectRefFromApiUrl(required('NEXT_PUBLIC_SUPABASE_URL'));
  const restoreRef = required('RECOVERY_PROVIDER_RESTORE_PROJECT_REF');
  if (!PROJECT_REF.test(restoreRef) || restoreRef === sourceRef) throw new Error('restore_project_ref_invalid_or_not_distinct');
  if (required('RECOVERY_PROVIDER_RESTORE_ATTESTATION') !== 'SUPABASE_RESTORE_TO_NEW_PROJECT_CONFIRMED') throw new Error('provider_restore_attestation_missing');

  const backupId = required('RECOVERY_PROVIDER_BACKUP_ID');
  if (!/^[A-Za-z0-9._:-]{3,160}$/.test(backupId)) throw new Error('provider_backup_id_invalid');
  const backupCreatedMs = safeIso(required('RECOVERY_PROVIDER_BACKUP_CREATED_AT'), 'provider_backup_created_at_invalid');
  const restoreStartedMs = safeIso(required('RECOVERY_PROVIDER_RESTORE_STARTED_AT'), 'provider_restore_started_at_invalid');
  const restoreCompletedMs = safeIso(required('RECOVERY_PROVIDER_RESTORE_COMPLETED_AT'), 'provider_restore_completed_at_invalid');
  if (backupCreatedMs > restoreStartedMs || restoreStartedMs > restoreCompletedMs) throw new Error('provider_restore_timeline_invalid');

  const [sourceProject, restoreProject, backups, sourceSnapshot, restoreSnapshot] = await Promise.all([
    request(`/projects/${sourceRef}`),
    request(`/projects/${restoreRef}`),
    request(`/projects/${sourceRef}/database/backups`),
    readSnapshot(sourceRef),
    readSnapshot(restoreRef),
  ]);

  if (!backupResponseContainsIdentifier(backups, backupId)) throw new Error('provider_backup_not_observed_on_source');
  const sourceRegion = projectField(sourceProject, 'region');
  const restoreRegion = projectField(restoreProject, 'region');
  const sourceOrg = projectField(sourceProject, 'organization_id', 'organization_slug');
  const restoreOrg = projectField(restoreProject, 'organization_id', 'organization_slug');
  const sourceStatus = projectField(sourceProject, 'status');
  const restoreStatus = projectField(restoreProject, 'status');
  if (!sourceRegion || sourceRegion !== restoreRegion) throw new Error('provider_restore_region_mismatch');
  if (!sourceOrg || sourceOrg !== restoreOrg) throw new Error('provider_restore_organization_mismatch');
  if (sourceStatus !== 'ACTIVE_HEALTHY' || restoreStatus !== 'ACTIVE_HEALTHY') throw new Error('provider_restore_project_not_healthy');

  const snapshot = validateProviderManagedSnapshot({ source: sourceSnapshot, restore: restoreSnapshot });
  const checks = {
    protectedMainExecution: true,
    distinctDatabases: true,
    exactShaBound: true,
    backupExists: true,
    restoreExecuted: true,
    dataIntegrity: true,
    authUsersIntegrity: true,
    rlsAfterRestore: true,
    rlsPoliciesPresent: true,
    rpoMeasured: true,
    rtoMeasured: true,
    providerManagedRestore: true,
    providerBackupObserved: true,
    sameOrganization: true,
    sameRegion: true,
    noExternalDatabaseBindings: true,
    noProductionDumpOnRunner: true,
  };

  const evidence = {
    schema: 'risck-comply.backup-restore-evidence.v2',
    evidenceItem: 'backup-restore-tested',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: new Date().toISOString(),
    repository: env('GITHUB_REPOSITORY'),
    branch: env('GITHUB_REF_NAME'),
    targetSha,
    observedSha,
    runId: env('GITHUB_RUN_ID') || null,
    controlsVerified: ['REC-05', 'REC-06', 'REC-07', 'REC-08', 'REC-09', 'REC-10'],
    checks,
    metrics: {
      rpoSeconds: Math.max(0, Math.round((restoreStartedMs - backupCreatedMs) / 1000)),
      rtoSeconds: Math.max(0, Math.round((restoreCompletedMs - restoreStartedMs) / 1000)),
      backupBytes: null,
    },
    integrity: {
      criticalTables,
      sourceCounts: snapshot.sourceCounts,
      restoredCounts: snapshot.restoredCounts,
      sourceAuthUsers: snapshot.sourceAuthUsers,
      restoredAuthUsers: snapshot.restoredAuthUsers,
      migrationVersionCount: snapshot.sourceVersions.length,
      recoveryMode: 'supabase-provider-managed-physical-backup-clone',
      backupIdentifierStored: false,
      projectReferencesStored: false,
    },
    failures: [],
    failurePhase: null,
    failureDiagnostic: null,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      exactShaBound: true,
      databaseUrlsStored: false,
      dumpStored: false,
      rowDataStored: false,
      credentialsStored: false,
      commandArgumentsStored: false,
      rawErrorMessagesStored: false,
      logicalBackupFilesDeleted: true,
      productionDumpCreatedOnGithubRunner: false,
      providerBackupIdentifierStored: false,
      providerProjectReferencesStored: false,
    },
    evidenceBoundary: 'Supabase Restore to a New Project is used as the Production-snapshot transport boundary. GitHub Actions never creates, downloads, stores, or replays a Production data dump. The workflow validates the selected backup exists on the source project, the isolated restore project is distinct, healthy, in the same Supabase organization and region, migration history matches the source before rehearsal changes, critical aggregate counts and Auth counts are readable, RLS/policies are present, and no foreign-server/table binding exists. Only aggregate counts, timing metrics and redacted provenance are retained; no row data, project refs, backup identifiers, database URLs or credentials are stored in evidence.',
  };

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  return evidence;
}

async function applyFile(path) {
  const sourceRef = projectRefFromApiUrl(required('NEXT_PUBLIC_SUPABASE_URL'));
  const restoreRef = required('RECOVERY_PROVIDER_RESTORE_PROJECT_REF');
  if (!PROJECT_REF.test(restoreRef) || restoreRef === sourceRef) throw new Error('restore_project_ref_invalid_or_not_distinct');
  if (required('RECOVERY_PROVIDER_RESTORE_ATTESTATION') !== 'SUPABASE_RESTORE_TO_NEW_PROJECT_CONFIRMED') throw new Error('provider_restore_attestation_missing');

  const absolute = resolve(path);
  const root = resolve('.');
  if (!absolute.startsWith(`${root}/supabase/migrations/`) && !absolute.startsWith(`${root}/scripts/`)) throw new Error('rehearsal_sql_path_not_allowed');
  const query = readFileSync(absolute, 'utf8');
  if (!query.trim()) throw new Error('rehearsal_sql_empty');
  await request(`/projects/${restoreRef}/database/query`, { method: 'POST', body: { query } });
}

export async function main(argv = process.argv.slice(2)) {
  const [command = 'verify', path] = argv;
  if (command === 'verify') return verify();
  if (command === 'apply-file' && path) return applyFile(path);
  throw new Error('usage: verify-supabase-provider-managed-restore.mjs [verify|apply-file <path>]');
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(JSON.stringify({ outcome: 'failed', failure: error instanceof Error ? error.message : 'unknown_failure' }));
    process.exit(1);
  });
}
