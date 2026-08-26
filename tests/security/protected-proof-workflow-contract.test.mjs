import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const finalTechnical = readFileSync('.github/workflows/final-technical-controls-proof.yml', 'utf8');
const recovery = readFileSync('.github/workflows/recovery-resilience-proof.yml', 'utf8');
const recoveryGuard = readFileSync('.github/workflows/enterprise-recovery-drill.yml', 'utf8');
const rehearsal = readFileSync('.github/workflows/supabase-forward-reconciliation-rehearsal.yml', 'utf8');
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

test('recovery resilience proof is rollback-only and remains independently protected', () => {
  before(recovery, 'Verify production-recovery environment governance before protected secrets', 'Execute explicitly confirmed Vercel rollback proof');
  before(recovery, 'Preflight protected rollback proof', 'Execute controlled Vercel rollback');
  before(recovery, 'Revalidate rollback producer boundary', 'Execute controlled Vercel rollback');
  before(recovery, 'Execute controlled Vercel rollback', 'Validate canonical rollback evidence');
  assert.match(recovery, /RECOVERY_REQUIRED_EXERCISE: production-rollback/);
  assert.match(recovery, /EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK/);
  assert.match(recovery, /environment: production-recovery/);
  assert.match(recovery, /recovery-resilience-preflight\.json/);
  assert.match(recovery, /rollback-validation\.json/);
  assert.doesNotMatch(recovery, /RECOVERY_SOURCE_DATABASE_URL/);
  assert.doesNotMatch(recovery, /SUPABASE_DB_POOLER_URL/);
  assert.doesNotMatch(recovery, /run-backup-restore-exercise\.mjs/);
  assert.doesNotMatch(recovery, /supabase db dump|pg_dump/);
  assert.doesNotMatch(recovery, /secrets\.RECOVERY_ISOLATED_DATABASE_URL/);
});

test('provider-managed restore is the only protected backup/restore authority and the legacy drill is non-crediting', () => {
  assert.match(rehearsal, /verify-supabase-provider-managed-restore\.mjs/);
  assert.match(rehearsal, /destroy-supabase-provider-managed-restore\.mjs/);
  assert.match(rehearsal, /SUPABASE_RESTORE_TO_NEW_PROJECT_CONFIRMED/);
  assert.match(rehearsal, /supabase-production-migration-dry-run/);
  assert.doesNotMatch(rehearsal, /RECOVERY_SOURCE_DATABASE_URL|SUPABASE_DB_POOLER_URL|run-backup-restore-exercise\.mjs/);
  assert.match(recoveryGuard, /contract guard only/);
  assert.doesNotMatch(recoveryGuard, /secrets\./);
  assert.doesNotMatch(recoveryGuard, /environment: production-recovery/);
});

test('legacy recovery preflight identity parsing remains fail-closed but is no longer reachable from protected backup/restore workflows', () => {
  assert.match(preflight, /canonicalPostgresDatabaseIdentity/);
  assert.match(preflight, /parsed\.port \|\| '5432'/);
  assert.match(preflight, /sourceIdentity !== isolatedIdentity/);
  assert.match(preflight, /recovery_database_identity_unverifiable/);
  assert.match(preflight, /POSTGRES_IDENTITY_OVERRIDE_PARAMS/);
  assert.match(preflight, /databaseIdentitiesStored: false/);
  assert.doesNotMatch(recovery, /RECOVERY_SOURCE_DATABASE_URL/);
  assert.doesNotMatch(recoveryGuard, /RECOVERY_SOURCE_DATABASE_URL/);
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
