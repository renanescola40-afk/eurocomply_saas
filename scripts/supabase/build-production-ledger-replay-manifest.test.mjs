import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductionLedgerReplayManifest } from './build-production-ledger-replay-manifest.mjs';

const sha = (character) => character.repeat(64);
const crosswalk = (entries, overrides = {}) => ({
  schema: 'risck-comply.production-migration-source-crosswalk.v1',
  generated_on: '2026-10-22',
  production_project: 'synthetic-project',
  summary: {
    production_migration_identities: entries.length,
    unique_source_files: new Set(entries.map((entry) => entry.source)).size,
  },
  entries,
  consolidated_sources: [],
  ...overrides,
});
const entry = (order, production_version, source, mapping = 'exact_version') => ({
  order,
  production_version,
  production_name: `migration_${order}`,
  source,
  mapping,
});
const migration = (file, digest) => ({ path: `supabase/migrations/${file}`, sha256: digest });

test('preserves production-ledger order and binds source hashes without authorizing replay', () => {
  const entries = [
    entry(1, '20261001000000', 'supabase/migrations/20261001000000_first.sql'),
    entry(2, '20261002000000', 'supabase/migrations/20261002000000_second.sql'),
  ];
  const manifest = buildProductionLedgerReplayManifest({
    sourceSnapshotSha: 'a'.repeat(40),
    crosswalk: crosswalk(entries),
    migrationFiles: [migration('20261001000000_first.sql', sha('a')), migration('20261002000000_second.sql', sha('b'))],
  });

  assert.equal(manifest.status, 'CANDIDATE_NOT_EXECUTABLE');
  assert.deepEqual(manifest.replay_order.map((item) => item.first_production_order), [1, 2]);
  assert.deepEqual(manifest.replay_order.map((item) => item.production_versions), [['20261001000000'], ['20261002000000']]);
  assert.ok(manifest.replay_order.every((item) => item.safe_for_replay === false));
  assert.equal(manifest.safety.production_write_authorized, false);
  assert.equal(manifest.safety.sql_executed, false);
});

test('keeps duplicate versions unresolved and excludes source-only migrations from production replay', () => {
  const entries = [entry(1, '20261001000000', 'supabase/migrations/20261001000000_alpha.sql')];
  const manifest = buildProductionLedgerReplayManifest({
    sourceSnapshotSha: 'a'.repeat(40),
    crosswalk: crosswalk(entries),
    migrationFiles: [
      migration('20261001000000_alpha.sql', sha('a')),
      migration('20261001000000_beta.sql', sha('b')),
      migration('20261002000000_source_only.sql', sha('c')),
    ],
  });

  assert.equal(manifest.counts.duplicate_version_groups, 1);
  assert.equal(manifest.counts.duplicate_groups_selected_for_replay, 0);
  assert.equal(manifest.unresolved_duplicate_groups[0].selected_for_production_replay, false);
  assert.equal(manifest.source_only_migrations.length, 2);
  assert.ok(manifest.source_only_migrations.every((item) => item.safe_for_replay === false));
  assert.equal(manifest.safety.executable, false);
});

test('supports reviewed consolidation as ordered ledger entries sharing one source', () => {
  const source = 'supabase/migrations/20261003000000_consolidated.sql';
  const entries = [
    entry(1, '20261003111111', source, 'provider_record_to_canonical_source'),
    entry(2, '20261003122222', source, 'canonical_name_match'),
  ];
  const manifest = buildProductionLedgerReplayManifest({
    sourceSnapshotSha: 'a'.repeat(40),
    crosswalk: crosswalk(entries, {
      summary: { production_migration_identities: 2, unique_source_files: 1 },
      consolidated_sources: [{ source, production_versions: ['20261003111111', '20261003122222'] }],
    }),
    migrationFiles: [migration('20261003000000_consolidated.sql', sha('d'))],
    providerRecords: [{ version: '20261003111111', statement_sha256: sha('e') }],
  });

  assert.deepEqual(manifest.replay_order[0].production_versions, ['20261003111111', '20261003122222']);
  assert.equal(manifest.counts.production_ledger_identities, 2);
  assert.equal(manifest.counts.production_unique_sources, 1);
  assert.equal(manifest.provider_only_hotfixes[0].safe_for_automatic_execution, false);
});

test('classifies every migration and never treats source-only duplicates as replay-safe', () => {
  const duplicateA = 'supabase/migrations/20261001000000_legacy_a.sql';
  const duplicateB = 'supabase/migrations/20261001000000_legacy_b.sql';
  const ledger = 'supabase/migrations/20261002000000_current.sql';
  const manifest = buildProductionLedgerReplayManifest({
    sourceSnapshotSha: 'a'.repeat(40),
    crosswalk: crosswalk([entry(1, '20261002000000', ledger)]),
    migrationFiles: [migration('20261001000000_legacy_a.sql', sha('a')), migration('20261001000000_legacy_b.sql', sha('b')), migration('20261002000000_current.sql', sha('c'))],
  });

  assert.equal(manifest.migrations.length, 3);
  assert.ok(manifest.migrations.every((item) => item.safe_for_replay === false));
  assert.equal(manifest.migrations.find((item) => item.file === ledger).in_production_ledger, true);
  assert.equal(manifest.migrations.find((item) => item.file === duplicateA).classification, 'SOURCE_ONLY_DUPLICATE_UNRESOLVED');
  assert.equal(manifest.migrations.find((item) => item.file === duplicateB).classification, 'SOURCE_ONLY_DUPLICATE_UNRESOLVED');
  assert.equal(manifest.migrations.find((item) => item.file === duplicateA).conflicting, true);
});

test('blocks missing mapped source and non-contiguous production order', () => {
  const entries = [entry(2, '20261001000000', 'supabase/migrations/20261001000000_missing.sql')];
  const manifest = buildProductionLedgerReplayManifest({
    sourceSnapshotSha: 'a'.repeat(40),
    crosswalk: crosswalk(entries),
    migrationFiles: [],
  });

  assert.ok(manifest.blockers.includes('production_ledger_order_not_contiguous:20261001000000'));
  assert.ok(manifest.blockers.includes('production_source_missing:supabase/migrations/20261001000000_missing.sql'));
  assert.equal(manifest.status, 'BLOCKED');
  assert.equal(manifest.safety.executable, false);
});