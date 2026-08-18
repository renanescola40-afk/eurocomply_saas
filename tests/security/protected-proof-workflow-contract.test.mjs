import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const enterpriseRecovery = readFileSync('.github/workflows/enterprise-recovery-drill.yml', 'utf8');
const finalTechnical = readFileSync('.github/workflows/final-technical-controls-proof.yml', 'utf8');
const recovery = readFileSync('.github/workflows/recovery-resilience-proof.yml', 'utf8');
const clientVerifier = readFileSync('scripts/recovery/verify-postgresql-client.mjs', 'utf8');
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

test('enterprise recovery verifies the preinstalled client before any source-secret use and scopes the secret to producer steps', () => {
  const recoveryJob = enterpriseRecovery.indexOf('  recovery:');
  const recoverySteps = enterpriseRecovery.indexOf('    steps:', recoveryJob);
  assert.ok(recoveryJob >= 0 && recoverySteps > recoveryJob);
  const recoveryJobHeader = enterpriseRecovery.slice(recoveryJob, recoverySteps);

  before(enterpriseRecovery, 'Verify runner PostgreSQL client without network installation', 'Validate protected read-only source configuration');
  before(enterpriseRecovery, 'Validate protected read-only source configuration', 'Start disposable isolated Supabase restore target');
  before(enterpriseRecovery, 'Start disposable isolated Supabase restore target', 'Preflight protected backup restore proof');
  before(enterpriseRecovery, 'Preflight protected backup restore proof', 'Execute supported logical backup and isolated restore');

  assert.doesNotMatch(recoveryJobHeader, /SUPABASE_DB_POOLER_URL|RECOVERY_SOURCE_DATABASE_URL/);
  assert.equal((enterpriseRecovery.match(/secrets\.SUPABASE_DB_POOLER_URL/g) ?? []).length, 3);
  assert.doesNotMatch(enterpriseRecovery, /apt-get|apt install|Install PostgreSQL client/);
});

test('final technical proof provisions exact-SHA project isolation after hermetic client verification and always removes it after proof', () => {
  const projectStart = 'Start exact-SHA disposable Supabase project database';
  before(finalTechnical, 'Set up pinned Supabase CLI', projectStart);
  before(finalTechnical, 'Verify runner PostgreSQL client without network installation', projectStart);
  before(finalTechnical, projectStart, 'Preflight protected final technical proof');
  before(finalTechnical, 'Preflight protected final technical proof', 'Execute protected final technical proof');
  before(finalTechnical, 'Execute protected final technical proof', 'Remove disposable recovery database');
  assert.match(finalTechnical, /final-technical-controls-preflight\.json/);
  assert.match(finalTechnical, /Remove disposable recovery database[\s\S]*?if: always\(\)/);
  assert.doesNotMatch(finalTechnical, /secrets\.RECOVERY_ISOLATED_DATABASE_URL/);
  assert.doesNotMatch(finalTechnical, /apt-get|apt install|Install PostgreSQL client/);
});

test('recovery proof provisions an empty restore target after hermetic client verification and keeps rollback independently protected', () => {
  before(recovery, 'Set up pinned Supabase CLI', 'Start disposable Supabase recovery database');
  before(recovery, 'Verify runner PostgreSQL client without network installation', 'Start disposable Supabase recovery database');
  before(recovery, 'Start disposable Supabase recovery database', 'Preflight protected recovery proof');
  before(recovery, 'Preflight protected recovery proof', 'Execute isolated backup and restore');
  before(recovery, 'Preflight protected recovery proof', 'Execute controlled Vercel rollback');
  before(recovery, 'Execute isolated backup and restore', 'Remove disposable recovery database');
  assert.match(recovery, /recovery-resilience-preflight\.json/);
  assert.match(recovery, /Remove disposable recovery database[\s\S]*?if: always\(\) &&/);
  assert.doesNotMatch(recovery, /secrets\.RECOVERY_ISOLATED_DATABASE_URL/);
  assert.match(recovery, /RECOVERY_EXERCISE_CONFIRMATION/);
  assert.match(recovery, /EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK/);
  assert.doesNotMatch(recovery, /apt-get|apt install|Install PostgreSQL client/);
});

test('PostgreSQL client verification is bounded, local-only and does not install packages', () => {
  assert.match(clientVerifier, /execFileSync/);
  assert.match(clientVerifier, /'psql', \['--version'\]/);
  assert.match(clientVerifier, /MIN_POSTGRESQL_CLIENT_MAJOR = 16/);
  assert.match(clientVerifier, /MAX_POSTGRESQL_CLIENT_MAJOR = 17/);
  assert.match(clientVerifier, /postgresql_client_unavailable/);
  assert.match(clientVerifier, /postgresql_client_version_unparseable/);
  assert.match(clientVerifier, /postgresql_client_version_unsupported/);
  assert.doesNotMatch(clientVerifier, /apt-get|sudo|curl|wget|npm install|npx/);
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
