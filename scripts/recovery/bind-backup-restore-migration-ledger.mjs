#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import {
  normalizeSqlForManagementApi,
  projectRefFromApiUrl,
} from './verify-supabase-provider-managed-restore.mjs';

const API = 'https://api.supabase.com/v1';
const PROJECT_REF = /^[a-z0-9]{20}$/;
const FULL_SHA = /^[a-f0-9]{40}$/;
const VERSION = /^\d{14}$/;
const evidencePath = 'docs/security/evidence/p1/backup-restore-tested.json';
const forwardConfigPath = 'config/supabase-forward-reconciliation.json';
const POSTCONDITION_FILES = [
  'scripts/supabase/verify-forward-reconciliation-postconditions.sql',
  'scripts/security/validate-enterprise-integrations-runtime.sql',
  'scripts/security/validate-enterprise-billing-runtime.sql',
  'scripts/security/validate-live-rls-inventory-helper-boundary.sql',
  'scripts/security/validate-gap-remediation-runtime.sql',
];

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function required(name) {
  const value = env(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

function unwrapRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.data)) return payload.data;
  throw new Error('supabase_query_response_shape_invalid');
}

async function readOnlyQuery(ref, query) {
  const payload = await request(`/projects/${ref}/database/query/read-only`, {
    method: 'POST',
    readOnly: true,
    body: { query },
  });
  return unwrapRows(payload);
}

function canonicalLedgerDigest(versions) {
  return `sha256:${createHash('sha256').update(JSON.stringify(versions)).digest('hex')}`;
}

async function captureLedger(ref) {
  const rows = await readOnlyQuery(
    ref,
    'select version from supabase_migrations.schema_migrations order by version;',
  );
  const versions = rows
    .map((row) => String(row?.version ?? '').trim())
    .filter((version) => VERSION.test(version));
  assert(versions.length > 0, 'migration_ledger_empty');
  assert(new Set(versions).size === versions.length, 'migration_ledger_duplicate_version');
  assert(JSON.stringify([...versions].sort()) === JSON.stringify(versions), 'migration_ledger_not_sorted');
  return {
    versions,
    summary: {
      count: versions.length,
      head: versions.at(-1),
      sha256: canonicalLedgerDigest(versions),
    },
  };
}

function selectedForwardVersions() {
  const config = JSON.parse(readFileSync(forwardConfigPath, 'utf8'));
  assert(config?.schema === 'risck-comply.supabase-forward-reconciliation-config.v1', 'forward_reconciliation_config_invalid');
  assert(Array.isArray(config?.migrations) && config.migrations.length > 0, 'forward_reconciliation_selected_set_empty');
  const versions = config.migrations.map((item) => {
    const filename = String(item?.filename ?? '');
    const match = filename.match(/^(\d{14})_[a-z0-9_]+\.sql$/);
    assert(match, `forward_reconciliation_filename_invalid:${filename || 'missing'}`);
    return match[1];
  });
  assert(new Set(versions).size === versions.length, 'forward_reconciliation_selected_versions_duplicate');
  return [...versions].sort();
}

async function proveRestoredForwardPostconditions(restoreRef) {
  for (const path of POSTCONDITION_FILES) {
    const raw = readFileSync(path, 'utf8');
    assert(Buffer.byteLength(raw, 'utf8') > 0 && Buffer.byteLength(raw, 'utf8') <= 2 * 1024 * 1024, `forward_postcondition_file_invalid:${path}`);
    const query = normalizeSqlForManagementApi(raw, path);
    await readOnlyQuery(restoreRef, query);
  }
  return true;
}

async function main() {
  const releaseSha = required('RELEASE_SHA').toLowerCase();
  const observedSha = required('GITHUB_SHA').toLowerCase();
  const runId = required('GITHUB_RUN_ID');
  const sourceRef = projectRefFromApiUrl(required('NEXT_PUBLIC_SUPABASE_URL'));
  const restoreRef = required('RECOVERY_PROVIDER_RESTORE_PROJECT_REF');

  assert(FULL_SHA.test(releaseSha), 'release_sha_invalid');
  assert(observedSha === releaseSha, 'release_sha_not_exact_current_execution');
  assert(/^\d+$/.test(runId), 'recovery_run_id_invalid');
  assert(PROJECT_REF.test(restoreRef) && restoreRef !== sourceRef, 'restore_project_ref_invalid_or_not_distinct');
  assert(required('RECOVERY_PROVIDER_RESTORE_ATTESTATION') === 'SUPABASE_RESTORE_TO_NEW_PROJECT_CONFIRMED', 'provider_restore_attestation_missing');

  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
  assert(evidence?.schema === 'risck-comply.backup-restore-evidence.v2', 'backup_restore_schema_invalid');
  assert(evidence?.evidenceItem === 'backup-restore-tested', 'backup_restore_evidence_item_invalid');
  assert(evidence?.status === 'Complete' && evidence?.outcome === 'passed', 'backup_restore_not_complete_passed');
  assert(evidence?.targetSha === releaseSha && evidence?.observedSha === releaseSha, 'backup_restore_sha_mismatch');
  assert(String(evidence?.runId ?? '') === runId, 'backup_restore_run_id_mismatch');
  assert(evidence?.checks?.providerManagedRestore === true, 'backup_restore_not_provider_managed');
  assert(evidence?.checks?.productionObservationReadOnly === true, 'production_observation_not_read_only');
  assert(evidence?.evidenceIntegrity?.productionDumpCreatedOnGithubRunner === false, 'production_dump_boundary_invalid');

  const [sourceLedger, restoreLedger] = await Promise.all([
    captureLedger(sourceRef),
    captureLedger(restoreRef),
  ]);
  assert(sourceLedger.summary.sha256 === restoreLedger.summary.sha256, 'provider_restore_migration_history_mismatch');
  assert(sourceLedger.summary.count === restoreLedger.summary.count, 'provider_restore_migration_count_mismatch');
  assert(sourceLedger.summary.head === restoreLedger.summary.head, 'provider_restore_migration_head_mismatch');

  const selectedVersions = selectedForwardVersions();
  const sourceVersionSet = new Set(sourceLedger.versions);
  const selectedForwardSetPresentInSource = selectedVersions.every((version) => sourceVersionSet.has(version));
  assert(selectedForwardSetPresentInSource, 'selected_forward_set_missing_from_post_promotion_source');

  const restoredPostconditionsExecuted = true;
  const restoredPostconditionsPassed = await proveRestoredForwardPostconditions(restoreRef);

  evidence.checks = {
    ...evidence.checks,
    sourceMigrationLedgerCaptured: true,
  };
  evidence.integrity = {
    ...evidence.integrity,
    sourceMigrationLedger: sourceLedger.summary,
  };
  evidence.forwardReconciliation = {
    selectedForwardMigrationCount: selectedVersions.length,
    selectedForwardSetPresentInSource,
    restoredPostconditionsExecuted,
    restoredPostconditionsPassed,
  };
  evidence.evidenceIntegrity = {
    ...evidence.evidenceIntegrity,
    migrationVersionsStored: false,
    sourceMigrationLedgerDigestStored: true,
    restoredPostconditionOutputStored: false,
  };

  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({
    status: evidence.status,
    outcome: evidence.outcome,
    sourceMigrationLedgerCount: sourceLedger.summary.count,
    sourceMigrationLedgerHead: sourceLedger.summary.head,
    sourceMigrationLedgerDigestStored: true,
    selectedForwardMigrationCount: selectedVersions.length,
    selectedForwardSetPresentInSource,
    restoredPostconditionsExecuted,
    restoredPostconditionsPassed,
    migrationVersionsStored: false,
    restoredPostconditionOutputStored: false,
    productionObservationReadOnly: true,
    productionDumpCreatedOnGithubRunner: false,
  })}\n`);
}

main().catch((error) => {
  console.error(JSON.stringify({
    outcome: 'failed',
    failure: error instanceof Error ? error.message : 'unknown_failure',
  }));
  process.exit(1);
});
