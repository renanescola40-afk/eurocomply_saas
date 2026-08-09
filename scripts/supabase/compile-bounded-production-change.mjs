#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [rehearsalPath, requestPath, outputDir = 'artifacts/supabase-production-change'] = process.argv.slice(2);
if (!rehearsalPath || !requestPath) {
  throw new Error('Usage: compile-bounded-production-change.mjs <rehearsal.json> <request.json> [output-dir]');
}

const rehearsalRaw = await readFile(rehearsalPath, 'utf8');
const requestRaw = await readFile(requestPath, 'utf8');
const rehearsal = JSON.parse(rehearsalRaw);
const request = JSON.parse(requestRaw);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const now = new Date();
const blockers = [];

const requireValue = (condition, code) => {
  if (!condition) blockers.push(code);
};

requireValue(rehearsal.schema === 'risck-comply.supabase-staging-rehearsal-attestation.v2', 'unsupported_staging_attestation_schema');
requireValue(request.schema === 'risck-comply.supabase-bounded-production-change-request.v1', 'unsupported_change_request_schema');
requireValue(rehearsal.status === 'STAGING_REHEARSAL_PASSED', 'staging_rehearsal_not_passed');
requireValue(typeof rehearsal.releaseSha === 'string' && /^[a-f0-9]{40}$/i.test(rehearsal.releaseSha), 'invalid_rehearsal_sha');
requireValue(request.releaseSha === rehearsal.releaseSha, 'release_sha_mismatch');
requireValue(request.rehearsalDigest === digest(rehearsalRaw), 'rehearsal_digest_mismatch');
requireValue(request.changeType === 'BOUNDED_SUPABASE_MIGRATION_CHANGE', 'invalid_change_type');
requireValue(request.productionProjectRef && request.stagingProjectRef, 'project_refs_required');
requireValue(request.productionProjectRef !== request.stagingProjectRef, 'staging_matches_production');
requireValue(request.backup?.status === 'verified', 'backup_not_verified');
requireValue(request.backup?.restoreTestOutcome === 'passed', 'restore_test_not_passed');
requireValue(Boolean(request.backup?.evidenceReference), 'backup_evidence_required');
requireValue(Number.isFinite(request.backup?.rpoMinutes) && request.backup.rpoMinutes >= 0, 'invalid_rpo');
requireValue(Number.isFinite(request.backup?.rtoMinutes) && request.backup.rtoMinutes > 0, 'invalid_rto');
requireValue(request.maintenanceWindow?.startsAt && request.maintenanceWindow?.endsAt, 'maintenance_window_required');
requireValue(request.roles?.operator, 'operator_required');
requireValue(request.roles?.approver, 'approver_required');
requireValue(request.roles?.incidentCommander, 'incident_commander_required');
requireValue(request.roles?.rollbackOwner, 'rollback_owner_required');
requireValue(request.roles?.operator !== request.roles?.approver, 'operator_must_not_approve');
requireValue(request.approval?.status === 'approved', 'independent_approval_required');
requireValue(request.approval?.approver === request.roles?.approver, 'approval_identity_mismatch');
requireValue(Boolean(request.approval?.approvedAt), 'approval_timestamp_required');
requireValue(Boolean(request.approval?.evidenceReference), 'approval_evidence_required');
requireValue(Array.isArray(request.batches) && request.batches.length > 0, 'batches_required');
requireValue((request.batches?.length ?? 0) <= 25, 'too_many_batches');
requireValue(Number.isInteger(request.maxBatchSize) && request.maxBatchSize >= 1 && request.maxBatchSize <= 10, 'invalid_max_batch_size');
requireValue(request.rollback?.commandReference, 'rollback_command_reference_required');
requireValue(request.rollback?.decisionThreshold, 'rollback_threshold_required');
requireValue(request.postChange?.requiredChecks?.includes('migration_history'), 'migration_history_check_required');
requireValue(request.postChange?.requiredChecks?.includes('schema'), 'schema_check_required');
requireValue(request.postChange?.requiredChecks?.includes('rls_cross_tenant'), 'rls_check_required');
requireValue(request.postChange?.requiredChecks?.includes('authenticated_smoke'), 'authenticated_smoke_required');
requireValue(request.postChange?.requiredChecks?.includes('observability'), 'observability_check_required');

const windowStart = new Date(request.maintenanceWindow?.startsAt ?? 0);
const windowEnd = new Date(request.maintenanceWindow?.endsAt ?? 0);
requireValue(Number.isFinite(windowStart.valueOf()) && Number.isFinite(windowEnd.valueOf()), 'invalid_maintenance_window');
requireValue(windowEnd > windowStart, 'maintenance_window_order_invalid');
requireValue((windowEnd - windowStart) <= 4 * 60 * 60 * 1000, 'maintenance_window_too_large');
requireValue(windowStart > now, 'maintenance_window_must_be_future');

const approvedAt = new Date(request.approval?.approvedAt ?? 0);
const expiresAt = new Date(request.approval?.expiresAt ?? 0);
requireValue(Number.isFinite(approvedAt.valueOf()) && approvedAt <= now, 'approval_timestamp_invalid');
requireValue(Number.isFinite(expiresAt.valueOf()) && expiresAt > windowEnd, 'approval_expiry_invalid');

const stagedMigrations = new Map();
for (const batch of rehearsal.stagedBatches ?? []) {
  for (const migration of batch.migrations ?? []) {
    const existing = stagedMigrations.get(migration.filename);
    requireValue(!existing, `duplicate_staged_migration:${migration.filename}`);
    stagedMigrations.set(migration.filename, migration.sha256);
  }
}
requireValue(stagedMigrations.size > 0, 'staged_migration_set_empty');

const seenBatchIds = new Set();
const seenMigrations = new Set();
for (const batch of request.batches ?? []) {
  requireValue(typeof batch.id === 'string' && batch.id.length > 0, 'batch_id_required');
  requireValue(!seenBatchIds.has(batch.id), `duplicate_batch_id:${batch.id}`);
  seenBatchIds.add(batch.id);
  requireValue(Array.isArray(batch.migrations) && batch.migrations.length > 0, `empty_batch:${batch.id}`);
  requireValue((batch.migrations?.length ?? 0) <= request.maxBatchSize, `batch_too_large:${batch.id}`);
  requireValue(batch.executionAuthorized === false, `batch_pre_authorized:${batch.id}`);
  requireValue(batch.rollbackReference, `batch_rollback_missing:${batch.id}`);
  requireValue(Array.isArray(batch.validationChecks) && batch.validationChecks.length >= 4, `batch_validation_incomplete:${batch.id}`);
  for (const migration of batch.migrations ?? []) {
    requireValue(typeof migration.filename === 'string', `migration_filename_missing:${batch.id}`);
    requireValue(/^[a-f0-9]{64}$/i.test(migration.sha256 ?? ''), `migration_digest_invalid:${migration.filename ?? batch.id}`);
    requireValue(!seenMigrations.has(migration.filename), `duplicate_migration:${migration.filename}`);
    seenMigrations.add(migration.filename);
    requireValue(stagedMigrations.has(migration.filename), `migration_not_staged:${migration.filename}`);
    requireValue(stagedMigrations.get(migration.filename) === migration.sha256, `staged_migration_digest_mismatch:${migration.filename}`);
  }
}

for (const filename of stagedMigrations.keys()) {
  requireValue(seenMigrations.has(filename), `staged_migration_missing_from_request:${filename}`);
}

const status = blockers.length === 0 ? 'READY_FOR_PROTECTED_PRODUCTION_EXECUTION' : 'BLOCKED';
const result = {
  schema: 'risck-comply.supabase-bounded-production-change.v2',
  generatedAt: now.toISOString(),
  status,
  releaseSha: request.releaseSha ?? null,
  sourceDigests: {
    rehearsal: digest(rehearsalRaw),
    stagedMigrationSet: rehearsal.stagedMigrationSetDigest ?? null,
    request: digest(requestRaw),
  },
  blockers,
  summary: {
    batches: request.batches?.length ?? 0,
    migrations: seenMigrations.size,
    stagedMigrations: stagedMigrations.size,
    historyRepairCandidates: request.historyRepairCandidates?.length ?? 0,
    rpoMinutes: request.backup?.rpoMinutes ?? null,
    rtoMinutes: request.backup?.rtoMinutes ?? null,
  },
  controls: {
    exactShaBound: blockers.includes('release_sha_mismatch') === false,
    stagingRehearsalAccepted: rehearsal.status === 'STAGING_REHEARSAL_PASSED',
    stagedMigrationSetBound: blockers.some((item) => item.startsWith('migration_not_staged:') || item.startsWith('staged_migration_digest_mismatch:') || item.startsWith('staged_migration_missing_from_request:')) === false,
    backupAndRestoreVerified: request.backup?.status === 'verified' && request.backup?.restoreTestOutcome === 'passed' && Boolean(request.backup?.evidenceReference),
    independentApproval: request.roles?.operator !== request.roles?.approver && request.approval?.status === 'approved' && Boolean(request.approval?.evidenceReference),
    boundedBatches: (request.batches?.length ?? 0) > 0 && (request.batches?.length ?? 0) <= 25,
  },
  safety: {
    databaseModified: false,
    migrationHistoryModified: false,
    productionWritePerformed: false,
    automaticExecutionAllowed: false,
    unrestrictedDbPushAllowed: false,
    authorizationScope: status === 'READY_FOR_PROTECTED_PRODUCTION_EXECUTION'
      ? 'The named operator may request protected execution of only the exact staged migrations during the approved window.'
      : 'No production execution is authorized.',
  },
};

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'bounded-production-change.json'), JSON.stringify(result, null, 2) + '\n');
let markdown = '# Bounded Supabase production change\n\n';
markdown += `Status: **${status}**\n\n`;
markdown += `Release SHA: \`${result.releaseSha ?? 'missing'}\`\n\n`;
markdown += `Batches: ${result.summary.batches}\n\nMigrations: ${result.summary.migrations}\n\n`;
markdown += '## Blockers\n\n';
markdown += blockers.length ? blockers.map((item) => `- \`${item}\``).join('\n') + '\n' : '- None\n';
markdown += '\n## Safety boundary\n\n- No database write was performed.\n- No migration history was modified.\n- Automatic execution remains disabled.\n- Unrestricted `supabase db push` remains forbidden.\n';
await writeFile(path.join(outputDir, 'bounded-production-change.md'), markdown);
process.stdout.write(markdown);
if (blockers.length > 0) process.exitCode = 2;
