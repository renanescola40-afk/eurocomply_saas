import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const SCRIPT = 'scripts/security/preflight-protected-proof.mjs';
const SHA = 'a'.repeat(40);

function run(mode, overrides = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'protected-proof-preflight-'));
  const output = path.join(root, 'evidence.json');
  const env = {
    ...process.env,
    GITHUB_ACTIONS: 'true',
    GITHUB_REPOSITORY: 'renanescola40-afk/eurocomply_saas',
    GITHUB_REF_NAME: 'main',
    GITHUB_SHA: SHA,
    GITHUB_RUN_ID: '12345',
    PROTECTED_PROOF_PREFLIGHT_OUTPUT: output,
    ...overrides,
  };
  const result = spawnSync(process.execPath, [SCRIPT, mode], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
  });
  const evidence = JSON.parse(readFileSync(output, 'utf8'));
  rmSync(root, { recursive: true, force: true });
  return { result, evidence };
}

function finalTechnicalEnv(overrides = {}) {
  return {
    ENTERPRISE_EXPECTED_SHA: SHA,
    FINAL_TECHNICAL_CONFIRMATION: 'EXECUTE_FINAL_TECHNICAL_PROOF',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-secret-value',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret-value',
    RECOVERY_ISOLATED_DATABASE_URL: 'postgres://isolated-secret-value',
    ...overrides,
  };
}

test('final technical preflight passes only when every protected prerequisite is present', () => {
  const { result, evidence } = run('final-technical', finalTechnicalEnv());
  assert.equal(result.status, 0);
  assert.equal(evidence.status, 'Complete');
  assert.equal(evidence.outcome, 'passed');
  assert.equal(evidence.ready, true);
  assert.equal(evidence.targetSha, SHA);
  assert.deepEqual(evidence.failures, []);
  assert.equal(evidence.evidenceIntegrity.runtimeMutationPerformed, false);
});

test('final technical preflight fails before fixtures when isolated recovery database is missing', () => {
  const { result, evidence } = run('final-technical', finalTechnicalEnv({ RECOVERY_ISOLATED_DATABASE_URL: '' }));
  assert.equal(result.status, 1);
  assert.equal(evidence.status, 'Open');
  assert.equal(evidence.outcome, 'blocked');
  assert.equal(evidence.ready, false);
  assert.ok(evidence.failures.includes('missing_recovery_isolated_database_url'));
  assert.ok(evidence.missingConfiguration.includes('RECOVERY_ISOLATED_DATABASE_URL'));
  assert.equal(evidence.checks.preflightPerformedWithoutRuntimeMutation, true);
});

test('backup restore rejects a source database reused as the isolated target', () => {
  const shared = 'postgres://same-secret-value';
  const { result, evidence } = run('recovery', {
    TARGET_SHA: SHA,
    RECOVERY_REQUIRED_EXERCISE: 'backup-restore',
    RECOVERY_SOURCE_DATABASE_URL: shared,
    RECOVERY_ISOLATED_DATABASE_URL: shared,
  });
  assert.equal(result.status, 1);
  assert.equal(evidence.databaseIsolationVerified, false);
  assert.ok(evidence.failures.includes('recovery_source_matches_isolated_database'));
});

test('production rollback requires the protected Vercel and known-good target group', () => {
  const { result, evidence } = run('recovery', {
    TARGET_SHA: SHA,
    RECOVERY_REQUIRED_EXERCISE: 'production-rollback',
    RECOVERY_EXERCISE_CONFIRMATION: 'EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK',
    VERCEL_TOKEN: '',
    VERCEL_ORG_ID: 'org-secret-value',
    VERCEL_PROJECT_ID: 'project-secret-value',
    LAST_KNOWN_GOOD_DEPLOYMENT_URL: 'https://known-good.example.com',
    LAST_KNOWN_GOOD_COMMIT_SHA: 'b'.repeat(40),
    PRODUCTION_URL: 'https://production.example.com',
  });
  assert.equal(result.status, 1);
  assert.ok(evidence.failures.includes('missing_vercel_token'));
  assert.ok(evidence.missingConfiguration.includes('VERCEL_TOKEN'));
});

test('preflight evidence never stores secret values or raw URLs', () => {
  const secretMarkers = [
    'anon-secret-value',
    'service-role-secret-value',
    'postgres://isolated-secret-value',
  ];
  const { evidence } = run('final-technical', finalTechnicalEnv());
  const serialized = JSON.stringify(evidence);
  for (const marker of secretMarkers) assert.equal(serialized.includes(marker), false);
  assert.equal(evidence.evidenceIntegrity.containsSensitiveValues, false);
  assert.equal(evidence.evidenceIntegrity.secretValuesStored, false);
  assert.equal(evidence.evidenceIntegrity.rawUrlsStored, false);
  assert.equal(evidence.evidenceIntegrity.databaseUrlsStored, false);
});
