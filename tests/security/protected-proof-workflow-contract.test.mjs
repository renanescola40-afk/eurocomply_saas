import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const finalTechnical = readFileSync('.github/workflows/final-technical-controls-proof.yml', 'utf8');
const recovery = readFileSync('.github/workflows/recovery-resilience-proof.yml', 'utf8');
const preflight = readFileSync('scripts/security/preflight-protected-proof.mjs', 'utf8');
const observability = readFileSync('scripts/release/run-observability-smoke-validation.mjs', 'utf8');
const observabilityValidator = readFileSync('scripts/release/validate-observability-runtime-evidence.mjs', 'utf8');

function before(source, first, second) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  assert.ok(firstIndex >= 0, `${first} must exist`);
  assert.ok(secondIndex >= 0, `${second} must exist`);
  assert.ok(firstIndex < secondIndex, `${first} must run before ${second}`);
}

test('final technical proof preflights before dependencies, psql, or runtime fixtures', () => {
  before(finalTechnical, 'Preflight protected final technical proof', 'Install deterministic dependencies');
  before(finalTechnical, 'Preflight protected final technical proof', 'Install PostgreSQL client');
  before(finalTechnical, 'Preflight protected final technical proof', 'Execute protected final technical proof');
  assert.match(finalTechnical, /final-technical-controls-preflight\.json/);
  assert.match(finalTechnical, /if: always\(\)/);
});

test('recovery proof preflights before psql, backup restore, or rollback', () => {
  before(recovery, 'Preflight protected recovery proof', 'Install PostgreSQL client');
  before(recovery, 'Preflight protected recovery proof', 'Execute isolated backup and restore');
  before(recovery, 'Preflight protected recovery proof', 'Execute controlled Vercel rollback');
  assert.match(recovery, /recovery-resilience-preflight\.json/);
  assert.match(recovery, /if: always\(\)/);
});

test('recovery isolation is based on canonical host port and database identity', () => {
  assert.match(preflight, /canonicalPostgresDatabaseIdentity/);
  assert.match(preflight, /parsed\.port \|\| '5432'/);
  assert.match(preflight, /sourceIdentity !== isolatedIdentity/);
  assert.match(preflight, /recovery_database_identity_unverifiable/);
  assert.match(preflight, /POSTGRES_IDENTITY_OVERRIDE_PARAMS/);
  assert.match(preflight, /databaseIdentitiesStored: false/);
  assert.doesNotMatch(preflight, /RECOVERY_SOURCE_DATABASE_URL'\) !== env\('RECOVERY_ISOLATED_DATABASE_URL/);
});

test('observability runtime evidence binds every probed hostname to the deployed SHA, not only runner variables', () => {
  assert.match(observability, /RELEASE_COMMIT_SHA/);
  assert.match(observability, /RELEASE_BUILD_SHA/);
  assert.match(observability, /\/api\/ready\/release/);
  assert.match(observability, /sanitizeRuntimeReleaseResponse/);
  assert.match(observability, /evaluateRuntimeReleaseSha/);
  assert.match(observability, /observedCommitShaMatchedExpected/);
  assert.match(observability, /deployedTargetsBoundToExpectedSha/);
  assert.match(observability, /releaseShaBindingValid/);
  assert.match(observability, /rawRuntimeReleaseResponseStored: false/);
  assert.match(observability, /mismatchedObservedShaStored: false/);
  assert.match(observabilityValidator, /every observability target must prove deployed runtime SHA binding/);
  assert.match(observabilityValidator, /observedRuntimeCommitMatchesExpected must pass/);
  assert.match(observabilityValidator, /evidenceIntegrity\.exactShaBound must be true/);
});
