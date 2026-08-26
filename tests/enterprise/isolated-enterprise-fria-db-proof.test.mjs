import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile('scripts/enterprise/verify-isolated-enterprise-fria-db.mjs', 'utf8');

test('isolated proof is exact-SHA, managed-loopback-only and sanitized', () => {
  assert.match(source, /FULL_SHA/);
  assert.match(source, /CANONICAL_REPOSITORY/);
  assert.match(source, /isLoopbackDatabaseUrl/);
  assert.match(source, /databaseUrlUsesPort/);
  assert.match(source, /RECOVERY_LOCAL_DB_HOST_PORT/);
  assert.match(source, /managed isolated loopback PostgreSQL port/);
  assert.match(source, /productionDataAccessed: false/);
  assert.match(source, /databaseUrlStored: false/);
  assert.doesNotMatch(source, /process\.env\.(SUPABASE_SERVICE_ROLE_KEY|DATABASE_PASSWORD)/);
  assert.doesNotMatch(source, /\^postgres\(\?:ql\)/);
});

test('psql fail-closed mode is passed as a client option, not embedded SQL', () => {
  assert.match(source, /--set=ON_ERROR_STOP=on/);
  assert.doesNotMatch(source, /\\set ON_ERROR_STOP on/);
});

test('isolated proof requires the reviewed schema replay to remain noncanonical for migration history', () => {
  assert.match(source, /RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL/);
  assert.match(source, /migrationHistoryCanonical !== 'false'/);
  assert.match(source, /schemaEffectsReplayed: true/);
  assert.match(source, /migrationHistoryCanonical: false/);
  assert.match(source, /does not prove production migration completion, migration-history reconciliation/);
  assert.doesNotMatch(source, /migrationsApplied: true/);
});

test('isolated proof covers enterprise licensing and FRIA boundaries', () => {
  for (const table of [
    'enterprise_contracts',
    'organization_entitlements',
    'enterprise_seat_operations',
    'ai_fria_assessments',
    'ai_fria_evidence',
    'ai_fria_decisions',
  ]) assert.match(source, new RegExp(table));
  assert.match(source, /relrowsecurity/);
  assert.match(source, /relforcerowsecurity/);
  assert.match(source, /pg_get_functiondef/);
  assert.match(source, /FOR\[\[:space:\]\]\+UPDATE\|pg_advisory_xact_lock/);
  assert.match(source, /unsafeDirectGrants/);
});

test('proof remains evidence-only and never claims production capacity', () => {
  assert.match(source, /ISOLATED_DB_PROOF_COMPLETE/);
  assert.match(source, /does not prove production capacity/);
  assert.doesNotMatch(source, /releaseDecision:\s*'GO'/);
  assert.doesNotMatch(source, /controlsVerified/);
});
