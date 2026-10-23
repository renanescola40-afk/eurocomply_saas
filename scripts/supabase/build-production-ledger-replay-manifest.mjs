#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const FULL_SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const CROSSWALK_SCHEMA = 'risck-comply.production-migration-source-crosswalk.v1';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export function buildProductionLedgerReplayManifest({ sourceSnapshotSha, crosswalk, migrationFiles, providerRecords = [] }) {
  const blockers = [];
  if (!FULL_SHA.test(String(sourceSnapshotSha ?? ''))) blockers.push('source_snapshot_sha_invalid');
  if (crosswalk?.schema !== CROSSWALK_SCHEMA) blockers.push('crosswalk_schema_invalid');
  if (!Array.isArray(crosswalk?.entries)) blockers.push('crosswalk_entries_missing');
  if (!Array.isArray(migrationFiles)) blockers.push('migration_files_missing');

  const migrationsByPath = new Map((migrationFiles ?? []).map((item) => [item.path, item]));
  const byVersion = new Map();
  for (const item of migrationFiles ?? []) {
    const version = path.posix.basename(item.path).match(/^(\d+)_/)?.[1] ?? null;
    if (!version || !SHA256.test(String(item.sha256 ?? ''))) {
      blockers.push(`migration_inventory_item_invalid:${item.path}`);
      continue;
    }
    const group = byVersion.get(version) ?? [];
    group.push(item.path);
    byVersion.set(version, group);
  }
  const duplicateGroups = [...byVersion.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([version, files]) => ({ version, files: [...files].sort() }));
  const duplicateVersionByPath = new Map(duplicateGroups.flatMap((group) => group.files.map((file) => [file, group.version])));

  const productionEntries = [];
  const uniqueReplaySources = new Map();
  const postLedgerForwardReconciliations = new Map();
  const providerRecordByVersion = new Map((providerRecords ?? []).map((record) => [record.version, record]));
  for (const [index, row] of (crosswalk?.entries ?? []).entries()) {
    if (row.order !== index + 1) blockers.push(`production_ledger_order_not_contiguous:${row.production_version}`);
    if (!/^\d{8,14}$/.test(String(row.production_version ?? ''))) blockers.push(`production_version_invalid:${row.production_version ?? 'missing'}`);
    const source = migrationsByPath.get(row.source);
    if (!source) blockers.push(`production_source_missing:${row.source ?? 'missing'}`);
    const record = {
      order: row.order,
      version: row.production_version,
      production_name: row.production_name,
      file: row.source,
      in_production_ledger: true,
      mapping: row.mapping,
      source_sha256: source?.sha256 ?? null,
      provider_statement_sha256: providerRecordByVersion.get(row.production_version)?.statement_sha256 ?? null,
      duplicate_group: source ? duplicateVersionByPath.get(source.path) ?? null : null,
      canonical: ['exact_version', 'canonical_name_match', 'provider_record_to_canonical_source'].includes(row.mapping),
      superseded: row.mapping === 'superseded_by_forward_reconciliation',
      provider_hotfix: row.mapping === 'provider_record_to_canonical_source'
        || row.mapping === 'superseded_by_forward_reconciliation',
      conflicting: source ? duplicateVersionByPath.has(source.path) : true,
      safe_for_replay: false,
      replay_blocker: 'provider_statement_digest_and_schema_postcondition_not_bound_per_ledger_entry',
    };
    productionEntries.push(record);
    if (source && row.mapping === 'superseded_by_forward_reconciliation') {
      if (!postLedgerForwardReconciliations.has(source.path)) {
        postLedgerForwardReconciliations.set(source.path, {
          first_production_order: row.order,
          file: source.path,
          source_sha256: source.sha256,
          production_versions: [],
          execution_order: 'AFTER_PRODUCTION_LEDGER_REPLAY',
          safe_for_replay: false,
          replay_blocker: record.replay_blocker,
        });
      }
      postLedgerForwardReconciliations.get(source.path).production_versions.push(row.production_version);
    } else if (source) {
      if (!uniqueReplaySources.has(source.path)) {
        uniqueReplaySources.set(source.path, {
          first_production_order: row.order,
          file: source.path,
          source_sha256: source.sha256,
          production_versions: [],
          safe_for_replay: false,
          replay_blocker: record.replay_blocker,
        });
      }
      uniqueReplaySources.get(source.path).production_versions.push(row.production_version);
    }
  }

  const productionSourceSet = new Set([
    ...uniqueReplaySources.keys(),
    ...postLedgerForwardReconciliations.keys(),
  ]);
  const declaredConsolidatedSources = new Set((crosswalk?.consolidated_sources ?? []).map((item) => item.source));
  const ledgerRowsBySource = new Map();
  for (const row of crosswalk?.entries ?? []) {
    const rows = ledgerRowsBySource.get(row.source) ?? [];
    rows.push(row);
    ledgerRowsBySource.set(row.source, rows);
  }
  const allMigrations = (migrationFiles ?? []).map((item) => {
    const version = path.posix.basename(item.path).match(/^(\d+)_/)?.[1] ?? null;
    const ledgerRows = ledgerRowsBySource.get(item.path) ?? [];
    const mappings = [...new Set(ledgerRows.map((row) => row.mapping))];
    const duplicateGroup = duplicateVersionByPath.get(item.path) ?? null;
    const superseded = mappings.includes('superseded_by_forward_reconciliation');
    const providerHotfix = mappings.includes('provider_record_to_canonical_source') || superseded;
    const canonical = mappings.some((mapping) => [
      'exact_version',
      'canonical_name_match',
      'provider_record_to_canonical_source',
      'superseded_by_forward_reconciliation',
    ].includes(mapping));
    const inProductionLedger = ledgerRows.length > 0;
    return {
      version,
      file: item.path,
      source_sha256: item.sha256,
      in_production_ledger: inProductionLedger,
      production_versions: ledgerRows.map((row) => row.production_version),
      mapping: mappings,
      duplicate_group: duplicateGroup,
      canonical,
      superseded,
      provider_hotfix: providerHotfix,
      conflicting: Boolean(duplicateGroup)
        || (mappings.length > 1 && !declaredConsolidatedSources.has(item.path)),
      safe_for_replay: false,
      classification: inProductionLedger
        ? superseded ? 'PRODUCTION_LEDGER_SOURCE_SUPERSEDED_PROVIDER_HOTFIX' : 'PRODUCTION_LEDGER_SOURCE_MAPPED'
        : duplicateGroup ? 'SOURCE_ONLY_DUPLICATE_UNRESOLVED' : 'SOURCE_ONLY_NOT_IN_PRODUCTION_LEDGER',
      classification_blocker: inProductionLedger
        ? 'provider_statement_digest_and_schema_postcondition_not_bound_per_ledger_entry'
        : duplicateGroup
          ? 'duplicate_historical_version_has_no_production_ledger_canonical_source'
          : 'source_file_not_referenced_by_production_crosswalk',
    };
  });
  const sourceOnly = (migrationFiles ?? [])
    .filter((item) => !productionSourceSet.has(item.path))
    .map((item) => ({
      version: path.posix.basename(item.path).match(/^(\d+)_/)?.[1] ?? null,
      file: item.path,
      source_sha256: item.sha256,
      in_production_ledger: false,
      duplicate_group: duplicateVersionByPath.get(item.path) ?? null,
      safe_for_replay: false,
      classification: 'SOURCE_ONLY_NOT_IN_PRODUCTION_CROSSWALK',
    }));

  const duplicateReplayConflicts = duplicateGroups.filter((group) =>
    group.files.filter((file) => productionSourceSet.has(file)).length > 1,
  );
  const hotfixRecords = (providerRecords ?? []).map((record) => ({
    ...record,
    safe_for_automatic_execution: false,
    classification: 'PROVIDER_RECORD_ONLY',
  }));

  if (crosswalk?.summary?.production_migration_identities !== productionEntries.length) blockers.push('crosswalk_ledger_count_mismatch');
  if (crosswalk?.summary?.unique_source_files !== productionSourceSet.size) blockers.push('crosswalk_unique_source_count_mismatch');
  if (duplicateReplayConflicts.length > 0) blockers.push('duplicate_source_selected_for_multiple_ledger_rows_without_consolidation');

  const replayOrder = [...uniqueReplaySources.values()].sort((left, right) => left.first_production_order - right.first_production_order);
  return {
    schema: 'risck-comply.production-ledger-bound-replay-candidate.v1',
    status: blockers.length === 0 ? 'CANDIDATE_NOT_EXECUTABLE' : 'BLOCKED',
    source_snapshot_sha: sourceSnapshotSha,
    production_project: crosswalk?.production_project ?? null,
    crosswalk_source: 'supabase/reconciliation/20261022_production_migration_source_crosswalk.json',
    crosswalk_generated_on: crosswalk?.generated_on ?? null,
    counts: {
      migration_files: migrationFiles?.length ?? 0,
      distinct_versions: byVersion.size,
      production_ledger_identities: productionEntries.length,
      production_unique_sources: productionSourceSet.size,
      source_only_files: sourceOnly.length,
      duplicate_version_groups: duplicateGroups.length,
      duplicate_groups_selected_for_replay: duplicateReplayConflicts.length,
      provider_hotfix_ledger_entries: productionEntries.filter((entry) => entry.provider_hotfix).length,
      provider_statement_records_with_digest: hotfixRecords.length,
      per_migration_classifications: allMigrations.length,
    },
    production_ledger_entries: productionEntries,
    migrations: allMigrations,
    replay_order: replayOrder,
    post_ledger_forward_reconciliations: [...postLedgerForwardReconciliations.values()].sort((left, right) => left.first_production_order - right.first_production_order),
    source_only_migrations: sourceOnly,
    unresolved_duplicate_groups: duplicateGroups.map((group) => ({
      ...group,
      selected_for_production_replay: false,
      resolution: 'EXCLUDED_FROM_LEDGER_BOUND_REPLAY; HISTORICAL_SOURCE_DUPLICATE_REMAINS_UNRESOLVED',
    })),
    provider_only_hotfixes: hotfixRecords,
    unresolved_duplicate_replay_conflicts: duplicateReplayConflicts,
    blockers,
    safety: {
      sql_executed: false,
      database_modified: false,
      migration_history_modified: false,
      production_write_authorized: false,
      executable: false,
      reason: 'Crosswalk maps ledger identities to repository sources but does not bind each provider SQL statement digest or schema postcondition. This candidate must not be run as a migration plan.',
    },
  };
}

async function main() {
  const [crosswalkPath, outputPath = '/tmp/production-ledger-replay-candidate.json'] = process.argv.slice(2);
  if (!crosswalkPath) throw new Error('usage: build-production-ledger-replay-manifest.mjs <crosswalk.json> [output.json]');
  const crosswalk = JSON.parse(await readFile(crosswalkPath, 'utf8'));
  const migrationDirectory = 'supabase/migrations';
  const migrationNames = (await readdir(migrationDirectory)).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
  const migrationFiles = await Promise.all(migrationNames.map(async (name) => {
    const file = path.posix.join(migrationDirectory, name);
    const bytes = await readFile(file);
    return { path: file, sha256: sha256(bytes) };
  }));
  const reconciliationDirectory = 'supabase/reconciliation';
  const reconciliationNames = (await readdir(reconciliationDirectory)).filter((name) => name.endsWith('.sql')).sort();
  const providerRecords = [];
  for (const name of reconciliationNames) {
    const bytes = await readFile(path.join(reconciliationDirectory, name));
    const text = bytes.toString('utf8');
    const version = text.match(/^--\s*(?:provider_version|version):\s*(\d{8,14})\s*$/m)?.[1];
    const statementSha256 = text.match(/^--\s*(?:provider_statement_sha256|provider statement SHA-256):\s*([a-f0-9]{64})\s*$/im)?.[1];
    if (version && statementSha256) providerRecords.push({ version, file: path.posix.join(reconciliationDirectory, name), statement_sha256: statementSha256 });
  }
  const manifest = buildProductionLedgerReplayManifest({ sourceSnapshotSha: process.env.GIT_COMMIT_SHA ?? '70d3545f414d063379d481fd238aed563e05edda', crosswalk, migrationFiles, providerRecords });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ outputPath, status: manifest.status, counts: manifest.counts, blockers: manifest.blockers, executable: manifest.safety.executable }, null, 2));
  if (manifest.blockers.length) process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}