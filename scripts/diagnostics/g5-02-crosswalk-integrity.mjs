#!/usr/bin/env node
// DAT-01 metadata-only integrity preflight; never executes SQL or grants acceptance.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const allowedMappings = new Set([
  'exact_version', 'canonical_name_match',
  'provider_record_to_canonical_source', 'superseded_by_forward_reconciliation',
]);
const canonicalSourcePattern = /^supabase\/migrations\/[A-Za-z0-9_-]+\.sql$/;
const hashPattern = /^[a-f0-9]{64}$/;

export function validateDat01Crosswalk({ ledger, crosswalk, provider, expected = 137, exists = () => true }) {
  const issues = [];
  const fail = (code, detail) => issues.push({ code, detail });
  const versions = Array.isArray(ledger?.versions) ? ledger.versions : [];
  const entries = Array.isArray(crosswalk?.entries) ? crosswalk.entries : [];
  const rows = Array.isArray(provider?.rows) ? provider.rows : [];
  if (versions.length !== expected || new Set(versions).size !== expected) fail('LEDGER_COUNT_OR_UNIQUENESS', versions.length);
  if (entries.length !== expected) fail('CROSSWALK_COUNT', entries.length);
  if (rows.length !== expected) fail('PROVIDER_HASH_COUNT', rows.length);
  if (provider?.ledger_versions !== expected || provider?.distinct_versions !== expected) fail('PROVIDER_LEDGER_IDENTITY', expected);
  if (crosswalk?.summary?.production_migration_identities !== expected || crosswalk?.summary?.mapped !== expected || crosswalk?.summary?.unresolved !== 0) fail('CROSSWALK_SUMMARY', 'not fully mapped');
  const sourceVersions = new Map();
  const categoryCounts = {};
  for (let i = 0; i < Math.max(versions.length, entries.length, rows.length); i++) {
    const version = versions[i];
    const entry = entries[i];
    const row = rows[i];
    if (!/^\d{14}$/.test(version ?? '')) fail('INVALID_LEDGER_VERSION', i + 1);
    if (!entry || entry.production_version !== version || entry.order !== i + 1) fail('CROSSWALK_ORDER_OR_VERSION', i + 1);
    if (!row || row.version !== version || row.name !== entry?.production_name) fail('PROVIDER_VERSION_OR_NAME', i + 1);
    if (row && (!hashPattern.test(row.joined_statement_sha256 ?? '') || !Number.isSafeInteger(row.statement_count) || row.statement_count < 1 || !Number.isSafeInteger(row.joined_bytes) || row.joined_bytes < 1)) fail('INVALID_PROVIDER_HASH_METADATA', i + 1);
    if (!entry) continue;
    if (!allowedMappings.has(entry.mapping)) fail('UNKNOWN_MAPPING', i + 1);
    categoryCounts[entry.mapping] = (categoryCounts[entry.mapping] ?? 0) + 1;
    if (typeof entry.source !== 'string' || !canonicalSourcePattern.test(entry.source)) {
      fail('UNSAFE_OR_NONCANONICAL_SOURCE', i + 1);
      continue;
    }
    if (entry.mapping === 'exact_version' && !entry.source.split('/').at(-1).startsWith(version + '_')) fail('FALSE_EXACT_VERSION_MAPPING', i + 1);
    if (!exists(entry.source)) fail('SOURCE_FILE_MISSING', entry.source);
    if (!sourceVersions.has(entry.source)) sourceVersions.set(entry.source, []);
    sourceVersions.get(entry.source).push(version);
  }
  const duplicateGroups = [...sourceVersions.entries()]
    .filter(([, listed]) => listed.length > 1)
    .map(([source, listed]) => ({ source, production_versions: listed }));
  const normalizedGroup = group => JSON.stringify([group.source, [...group.production_versions].sort()]);
  const actualGroups = duplicateGroups.map(normalizedGroup).sort();
  const declaredGroups = Array.isArray(crosswalk?.consolidated_sources)
    ? crosswalk.consolidated_sources.map(normalizedGroup).sort() : [];
  if (JSON.stringify(actualGroups) !== JSON.stringify(declaredGroups)) fail('CONSOLIDATION_GROUP_MISMATCH', 'source reuse not expressly declared');
  if (sourceVersions.size !== crosswalk?.summary?.unique_source_files || duplicateGroups.length !== crosswalk?.summary?.consolidated_source_groups) fail('SOURCE_CARDINALITY_MISMATCH', sourceVersions.size);
  return {
    schema: 'risck-comply.dat01.crosswalk-integrity.v1',
    status: issues.length ? 'INVALID_METADATA' : 'CONSISTENT_METADATA_ONLY',
    expectedVersions: expected, inspectedVersions: versions.length,
    uniqueSourceFiles: sourceVersions.size, consolidationGroups: duplicateGroups,
    mappingCounts: categoryCounts, issues,
    sqlByteEquivalence: 'NOT_VERIFIED', migrationReplay: 'NOT_EXECUTED',
    qualifiedReview: 'NOT_GRANTED', formalAcceptance: 'NOT_GRANTED',
    note: 'Metadata consistency is not SQL equivalence. Consolidated files must not be replayed once per ledger identity. This script never runs migrations.',
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const read = path => JSON.parse(readFileSync(path, 'utf8'));
  const report = validateDat01Crosswalk({
    ledger: read('scripts/diagnostics/g5-02-prod-ledger-versions.json'),
    crosswalk: read('supabase/reconciliation/20261022_production_migration_source_crosswalk.json'),
    provider: read('docs/enterprise/closure-v20/DAT01_PROD_LEDGER_READONLY_HASHES_20261103.json'),
    exists: source => existsSync(join(process.cwd(), source)),
  });
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (report.issues.length) process.exitCode = 1;
}
