import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const envProducer = readFileSync('scripts/release/check-enterprise-release-env.mjs', 'utf8');
const envValidator = readFileSync('scripts/release/validate-enterprise-env-runtime-evidence.mjs', 'utf8');
const rollbackProducer = readFileSync('scripts/release/run-rollback-dry-run.mjs', 'utf8');
const rollbackValidator = readFileSync('scripts/release/validate-rollback-runtime-evidence.mjs', 'utf8');
const deploymentSmoke = readFileSync('scripts/release/run-deployment-smoke.mjs', 'utf8');
const readyRoute = readFileSync('src/app/api/ready/route.ts', 'utf8');
const goNoGoChecklist = readFileSync('docs/RELEASE_GO_NO_GO_CHECKLIST.md', 'utf8');

test('enterprise env producer stamps every GitHub runtime identity field required by its validator', () => {
  for (const field of [
    'generatedByGithubActions',
    'repository',
    'branch',
    'githubRunId',
    'commitSha',
  ]) {
    assert.ok(envValidator.includes(`runtime.${field}`), `validator must require runtime.${field}`);
    assert.ok(envProducer.includes(field), `producer must emit ${field}`);
  }

  assert.match(envProducer, /runtimeContext,/);
  assert.match(envProducer, /schema: 'risck-comply\.enterprise-release-env-readiness\.v2'/);
  assert.match(envProducer, /containsSensitiveValues: false/);
  assert.match(envProducer, /rawUrlsStored: false/);
});

test('rollback producer emits the complete fail-closed structure required by its runtime validator', () => {
  for (const requiredProducerToken of [
    'runtimeContext,',
    'commandExecuted: true',
    'targetConfigured: Boolean(targetUrl)',
    'targetShaConfigured,',
    'targetDiffersFromCurrentRelease,',
    'healthOk,',
    'healthNoStore,',
    'readyCheckRequired: runReadyCheck',
    'present: rollbackRunbookPresent',
    'recorded: targetValidationProof',
    'rollbackTargetStored: false',
  ]) {
    assert.ok(rollbackProducer.includes(requiredProducerToken), `rollback producer missing ${requiredProducerToken}`);
  }

  for (const validatorField of [
    'generatedByGithubActions',
    'commandExecuted',
    'targetConfigured',
    'targetShaConfigured',
    'targetDiffersFromCurrentRelease',
    'healthOk',
    'healthNoStore',
    'runbook',
    'functionalValidation',
    'rollbackTargetStored',
  ]) {
    assert.ok(rollbackValidator.includes(validatorField), `rollback validator missing ${validatorField}`);
  }

  assert.match(rollbackProducer, /currentShaConfigured && targetShaConfigured && currentSha !== targetSha/);
  assert.match(rollbackProducer, /mutatesProduction: false/);
});

test('deployment smoke reports safe readiness failure domains instead of only a generic 503', () => {
  assert.match(deploymentSmoke, /redisEnvironmentConfigured/);
  assert.match(deploymentSmoke, /enterpriseStepUpReady/);
  assert.match(deploymentSmoke, /databaseReachable/);
  assert.match(deploymentSmoke, /stripeApiReachable/);
  assert.match(deploymentSmoke, /enterpriseStorageScannerReady/);
  assert.match(deploymentSmoke, /readyEvidenceIsRedacted/);
  assert.match(deploymentSmoke, /containsSensitiveValues: false/);
});

test('readiness timeout is production-tolerant but still returns 503 when any required domain is not ready', () => {
  assert.match(readyRoute, /const READINESS_DEPENDENCY_TIMEOUT_MS = 5_000;/);
  assert.match(readyRoute, /new ReadinessDependencyTimeoutError\(\)/);
  assert.match(readyRoute, /status: ok \? 'ready' : 'not_ready'/);
  assert.match(readyRoute, /\{ status: ok \? 200 : 503 \}/);
  assert.match(readyRoute, /&& redisConfigured/);
  assert.match(readyRoute, /&& enterpriseStepUpConfigured/);
});

test('Go-No-Go documentation contains the evidence mapping required by the static release gate', () => {
  assert.match(goNoGoChecklist, /## Evidence mapping/);
  assert.match(goNoGoChecklist, /deployment-smoke-validation\.json/);
  assert.match(goNoGoChecklist, /supabase-rls-reconciliation\.json/);
  assert.match(goNoGoChecklist, /release-go-no-go\.json/);
  assert.match(goNoGoChecklist, /same promoted commit SHA/);
});
