import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { shouldAcceptProtectedRollback } from '../../scripts/release/rollback-protection-policy.mjs';

const rollbackScript = resolve('scripts/release/run-rollback-dry-run.mjs');
const closeoutWorkflow = resolve('.github/workflows/enterprise-runtime-evidence-closeout.yml');
const enterpriseGateWorkflow = resolve('.github/workflows/enterprise-production-gate.yml');
const publicFinalWorkflow = resolve('.github/workflows/public-production-final.yml');

function runNode(script, cwd, env) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [script], {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolveRun({ code, stdout, stderr }));
  });
}

test('rollback dry-run can verify a Vercel-protected deployment without persisting the bypass secret', async (t) => {
  const bypassSecret = 'test-vercel-bypass-secret-never-persist';
  let observedBypassHeader = null;

  const server = http.createServer((request, response) => {
    observedBypassHeader = request.headers['x-vercel-protection-bypass'] ?? null;
    if (request.url !== '/api/health' || observedBypassHeader !== bypassSecret) {
      response.statusCode = 401;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ status: 'protected' }));
      return;
    }

    response.statusCode = 200;
    response.setHeader('content-type', 'application/json');
    response.setHeader('cache-control', 'no-store, max-age=0');
    response.end(JSON.stringify({ status: 'ok' }));
  });

  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  t.after(() => new Promise((resolveClose) => server.close(resolveClose)));

  const address = server.address();
  assert.ok(address && typeof address === 'object');

  const root = mkdtempSync(join(tmpdir(), 'risck-rollback-bypass-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'docs', 'operations'), { recursive: true });
  writeFileSync(join(root, 'docs', 'operations', 'ROLLBACK_RUNBOOK.md'), '# Rollback\n');
  writeFileSync(join(root, 'docs', 'RELEASE_ROLLBACK_PLAN.md'), '# Legacy rollback plan\n');

  const currentSha = 'a'.repeat(40);
  const rollbackSha = 'b'.repeat(40);
  const result = await runNode(rollbackScript, root, {
    ...process.env,
    RELEASE_TARGET: 'production',
    RELEASE_COMMIT_SHA: currentSha,
    RELEASE_BUILD_SHA: currentSha,
    RELEASE_ROLLBACK_TARGET_URL: `http://127.0.0.1:${address.port}`,
    RELEASE_ROLLBACK_TARGET_SHA: rollbackSha,
    RELEASE_ROLLBACK_TARGET_VALIDATED: 'true',
    RELEASE_ROLLBACK_CHECK_READY: 'false',
    VERCEL_AUTOMATION_BYPASS_SECRET: bypassSecret,
    GITHUB_ACTIONS: 'true',
    GITHUB_RUN_ID: '123456',
    GITHUB_RUN_ATTEMPT: '1',
    GITHUB_REPOSITORY: 'renanescola40-afk/eurocomply_saas',
    GITHUB_REF_NAME: 'main',
    GITHUB_WORKFLOW: 'Enterprise Runtime Evidence Closeout',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
  });

  assert.equal(result.code, 0, `rollback dry-run failed:\n${result.stderr}`);
  assert.equal(observedBypassHeader, bypassSecret);

  const evidencePath = join(root, 'docs', 'security', 'evidence', 'runtime', 'rollback-dry-run-validation.json');
  const evidenceText = readFileSync(evidencePath, 'utf8');
  const evidence = JSON.parse(evidenceText);

  assert.equal(evidence.status, 'Complete');
  assert.equal(evidence.outcome, 'passed');
  assert.equal(evidence.rollbackTarget.protectionBypassUsed, true);
  assert.equal(evidence.targetValidation.protectionBypassUsed, true);
  assert.equal(evidence.evidenceIntegrity.protectionBypassSecretStored, false);
  assert.equal(evidenceText.includes(bypassSecret), false);
  assert.equal(result.stdout.includes(bypassSecret), false);
  assert.equal(result.stderr.includes(bypassSecret), false);
});

test('runtime closeout keeps the Vercel automation bypass secret step-local', () => {
  const workflow = readFileSync(closeoutWorkflow, 'utf8');
  assert.match(
    workflow,
    /^\s{10}VERCEL_AUTOMATION_BYPASS_SECRET: \$\{\{ secrets\.VERCEL_AUTOMATION_BYPASS_SECRET \}\}/m,
  );
  assert.doesNotMatch(workflow, /^\s{6}VERCEL_AUTOMATION_BYPASS_SECRET:/m);
  assert.match(
    workflow,
    /Run public production final validation[\s\S]*VERCEL_AUTOMATION_BYPASS_SECRET:[\s\S]*npm run release:production-final/,
  );
});


test('enterprise and public production release workflows keep Vercel rollback auth step-local', () => {
  for (const workflowPath of [enterpriseGateWorkflow, publicFinalWorkflow]) {
    const workflow = readFileSync(workflowPath, 'utf8');
    assert.match(
      workflow,
      /^\s{10}VERCEL_AUTOMATION_BYPASS_SECRET: \$\{\{ secrets\.VERCEL_AUTOMATION_BYPASS_SECRET \}\}/m,
    );
    assert.doesNotMatch(workflow, /^\s{6}VERCEL_AUTOMATION_BYPASS_SECRET:/m);
    assert.match(workflow, /VERCEL_AUTOMATION_BYPASS_SECRET:[\s\S]*npm run release:production-final/);
  }

  const enterpriseWorkflow = readFileSync(enterpriseGateWorkflow, 'utf8');
  for (const key of ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID']) {
    assert.doesNotMatch(
      enterpriseWorkflow,
      new RegExp(`^\\s{6}${key}:`, 'm'),
      `${key} must never be materialized at protected job scope`,
    );
    assert.match(
      enterpriseWorkflow,
      new RegExp(`^\\s{10}${key}: \\$\\{\\{ secrets\\.${key} \\}\\}`, 'm'),
      `${key} must be injected only into provider-consuming steps`,
    );
  }
});


test('rollback dry-run accepts only a complete provider-attested automatic rollback proof', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'risck-rollback-auto-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  mkdirSync(join(root, 'docs', 'operations'), { recursive: true });
  mkdirSync(join(root, 'artifacts', 'release'), { recursive: true });
  writeFileSync(join(root, 'docs', 'operations', 'ROLLBACK_RUNBOOK.md'), '# Rollback\n');
  writeFileSync(join(root, 'docs', 'RELEASE_ROLLBACK_PLAN.md'), '# Legacy rollback plan\n');

  const currentSha = 'c'.repeat(40);
  const projectDigest = `sha256:${'1'.repeat(64)}`;
  const currentDeploymentDigest = `sha256:${'2'.repeat(64)}`;

  writeFileSync(
    join(root, 'artifacts', 'release', 'public-ga-rollback-resolution.json'),
    JSON.stringify({
      schema: 'risck-comply.public-ga-rollback-resolution.v3',
      status: 'Complete',
      outcome: 'passed',
      resolutionMode: 'automatic',
      policy: {
        exactProjectRequired: true,
        exactCurrentReleaseExcluded: true,
        previousDeploymentRequired: true,
        deploymentStateRequired: 'READY',
        deploymentTargetRequired: 'production',
      },
      checks: {
        rollbackCandidateValidated: true,
        providerIdentityValidated: true,
        healthEndpointValidated: true,
        healthNoStoreValidated: true,
      },
      provenance: {
        repository: 'renanescola40-afk/eurocomply_saas',
        releaseSha: currentSha,
        projectDigest,
        currentDeploymentDigest,
        githubRunId: '654321',
        githubRunAttempt: '1',
        githubWorkflow: 'Enterprise Production Gate',
        githubEventName: 'workflow_dispatch',
      },
      evidenceIntegrity: {
        containsSensitiveValues: false,
        selectedRollbackIdentifiersStored: false,
        rawDeploymentUrlStored: false,
        tokenStored: false,
        provenanceContainsRawProviderIdentifiers: false,
      },
    }),
  );

  const result = await runNode(rollbackScript, root, {
    ...process.env,
    RELEASE_TARGET: 'enterprise',
    RELEASE_COMMIT_SHA: currentSha,
    RELEASE_BUILD_SHA: currentSha,
    RELEASE_ROLLBACK_RESOLUTION_MODE: 'automatic',
    RELEASE_ROLLBACK_TARGET_VALIDATED: 'true',
    RELEASE_ROLLBACK_EXPECTED_PROJECT_DIGEST: projectDigest,
    RELEASE_ROLLBACK_EXPECTED_CURRENT_DEPLOYMENT_DIGEST: currentDeploymentDigest,
    RELEASE_ROLLBACK_CHECK_READY: 'false',
    GITHUB_ACTIONS: 'true',
    GITHUB_RUN_ID: '654321',
    GITHUB_RUN_ATTEMPT: '1',
    GITHUB_REPOSITORY: 'renanescola40-afk/eurocomply_saas',
    GITHUB_REF_NAME: 'main',
    GITHUB_WORKFLOW: 'Enterprise Production Gate',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
  });

  assert.equal(result.code, 0, `automatic rollback dry-run failed:\n${result.stderr}`);

  const evidence = JSON.parse(readFileSync(
    join(root, 'docs', 'security', 'evidence', 'runtime', 'rollback-dry-run-validation.json'),
    'utf8',
  ));

  assert.equal(evidence.status, 'Complete');
  assert.equal(evidence.outcome, 'passed');
  assert.equal(evidence.dryRun.mutatesProduction, false);
  assert.equal(evidence.dryRun.commandMode, 'automatic-provider-attestation-validation');
  assert.equal(evidence.targetValidation.passed, true);
  assert.equal(evidence.targetValidation.targetConfigured, true);
  assert.equal(evidence.targetValidation.targetShaConfigured, true);
  assert.equal(evidence.targetValidation.targetDiffersFromCurrentRelease, true);
  assert.equal(evidence.targetValidation.healthOk, true);
  assert.equal(evidence.targetValidation.healthNoStore, true);
  assert.equal(evidence.rollbackTarget.identifiersResolvedWithoutPersistence, true);
  assert.equal(evidence.evidenceIntegrity.rollbackTargetStored, false);
});


test('rollback dry-run rejects a stale automatic rollback attestation from another release', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'risck-rollback-stale-auto-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  mkdirSync(join(root, 'docs', 'operations'), { recursive: true });
  mkdirSync(join(root, 'artifacts', 'release'), { recursive: true });
  writeFileSync(join(root, 'docs', 'operations', 'ROLLBACK_RUNBOOK.md'), '# Rollback\n');
  writeFileSync(join(root, 'docs', 'RELEASE_ROLLBACK_PLAN.md'), '# Legacy rollback plan\n');

  const currentSha = 'd'.repeat(40);
  const projectDigest = `sha256:${'3'.repeat(64)}`;
  const currentDeploymentDigest = `sha256:${'4'.repeat(64)}`;

  writeFileSync(
    join(root, 'artifacts', 'release', 'public-ga-rollback-resolution.json'),
    JSON.stringify({
      schema: 'risck-comply.public-ga-rollback-resolution.v3',
      status: 'Complete',
      outcome: 'passed',
      resolutionMode: 'automatic',
      policy: {
        exactProjectRequired: true,
        exactCurrentReleaseExcluded: true,
        previousDeploymentRequired: true,
        deploymentStateRequired: 'READY',
        deploymentTargetRequired: 'production',
      },
      checks: {
        rollbackCandidateValidated: true,
        providerIdentityValidated: true,
        healthEndpointValidated: true,
        healthNoStoreValidated: true,
      },
      provenance: {
        repository: 'renanescola40-afk/eurocomply_saas',
        releaseSha: 'e'.repeat(40),
        projectDigest,
        currentDeploymentDigest,
        githubRunId: '999999',
        githubRunAttempt: '1',
        githubWorkflow: 'Enterprise Production Gate',
        githubEventName: 'workflow_dispatch',
      },
      evidenceIntegrity: {
        containsSensitiveValues: false,
        selectedRollbackIdentifiersStored: false,
        rawDeploymentUrlStored: false,
        tokenStored: false,
        provenanceContainsRawProviderIdentifiers: false,
      },
    }),
  );

  const result = await runNode(rollbackScript, root, {
    ...process.env,
    RELEASE_TARGET: 'enterprise',
    RELEASE_COMMIT_SHA: currentSha,
    RELEASE_BUILD_SHA: currentSha,
    RELEASE_ROLLBACK_RESOLUTION_MODE: 'automatic',
    RELEASE_ROLLBACK_TARGET_VALIDATED: 'true',
    RELEASE_ROLLBACK_EXPECTED_PROJECT_DIGEST: projectDigest,
    RELEASE_ROLLBACK_EXPECTED_CURRENT_DEPLOYMENT_DIGEST: currentDeploymentDigest,
    RELEASE_ROLLBACK_CHECK_READY: 'false',
    GITHUB_ACTIONS: 'true',
    GITHUB_RUN_ID: '654321',
    GITHUB_RUN_ATTEMPT: '1',
    GITHUB_REPOSITORY: 'renanescola40-afk/eurocomply_saas',
    GITHUB_REF_NAME: 'main',
    GITHUB_WORKFLOW: 'Enterprise Production Gate',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
  });

  assert.notEqual(result.code, 0);
  const evidence = JSON.parse(readFileSync(
    join(root, 'docs', 'security', 'evidence', 'runtime', 'rollback-dry-run-validation.json'),
    'utf8',
  ));
  assert.equal(evidence.status, 'Open');
  assert.equal(evidence.outcome, 'failed');
  assert.equal(evidence.targetValidation.passed, false);
});


test('protected rollback policy requires provider binding, Vercel auth boundary and prior validation', () => {
  assert.equal(shouldAcceptProtectedRollback({
    directHealthOk: false,
    authBoundaryObserved: false,
    providerBoundExactSha: false,
    targetValidationProof: false,
  }), false);

  assert.equal(shouldAcceptProtectedRollback({
    directHealthOk: true,
    authBoundaryObserved: false,
    providerBoundExactSha: false,
    targetValidationProof: false,
  }), true);

  assert.equal(shouldAcceptProtectedRollback({
    directHealthOk: false,
    authBoundaryObserved: true,
    providerBoundExactSha: true,
    targetValidationProof: true,
  }), true);

  for (const missing of ['authBoundaryObserved', 'providerBoundExactSha', 'targetValidationProof']) {
    const input = {
      directHealthOk: false,
      authBoundaryObserved: true,
      providerBoundExactSha: true,
      targetValidationProof: true,
    };
    input[missing] = false;
    assert.equal(shouldAcceptProtectedRollback(input), false, `${missing} must remain mandatory`);
  }
});
