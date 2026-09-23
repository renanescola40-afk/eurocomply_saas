import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

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
});


test('rollback dry-run accepts only provider-bound exact-SHA Vercel auth boundary with prior validation', async (t) => {
  const currentSha = 'c'.repeat(40);
  const rollbackSha = 'd'.repeat(40);
  let baseUrl = '';

  const server = http.createServer((request, response) => {
    if (request.url === '/api/health') {
      response.statusCode = 401;
      response.setHeader('server', 'Vercel');
      response.setHeader('x-vercel-id', 'test::rollback');
      response.setHeader('cache-control', 'no-store, max-age=0');
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ status: 'protected' }));
      return;
    }

    if (request.url?.startsWith('/repos/renanescola40-afk/eurocomply_saas/deployments?sha=')) {
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify([{
        id: 42,
        sha: rollbackSha,
        ref: 'main',
        task: 'deploy',
        environment: 'Production',
        created_at: '2026-09-23T08:00:00Z',
        updated_at: '2026-09-23T08:01:00Z',
      }]));
      return;
    }

    if (request.url === '/repos/renanescola40-afk/eurocomply_saas/deployments/42/statuses?per_page=100') {
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify([{
        id: 43,
        state: 'success',
        creator: { login: 'vercel[bot]' },
        environment: 'Production',
        environment_url: baseUrl,
        created_at: '2026-09-23T08:01:00Z',
        updated_at: '2026-09-23T08:01:00Z',
      }]));
      return;
    }

    response.statusCode = 404;
    response.end();
  });

  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  t.after(() => new Promise((resolveClose) => server.close(resolveClose)));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  baseUrl = `http://127.0.0.1:${address.port}`;

  const root = mkdtempSync(join(tmpdir(), 'risck-rollback-provider-bound-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'docs', 'operations'), { recursive: true });
  writeFileSync(join(root, 'docs', 'operations', 'ROLLBACK_RUNBOOK.md'), '# Rollback\n');
  writeFileSync(join(root, 'docs', 'RELEASE_ROLLBACK_PLAN.md'), '# Legacy rollback plan\n');

  const result = await runNode(rollbackScript, root, {
    ...process.env,
    RELEASE_TARGET: 'production',
    RELEASE_COMMIT_SHA: currentSha,
    RELEASE_BUILD_SHA: currentSha,
    RELEASE_ROLLBACK_TARGET_URL: baseUrl,
    RELEASE_ROLLBACK_TARGET_SHA: rollbackSha,
    RELEASE_ROLLBACK_TARGET_VALIDATED: 'true',
    RELEASE_ROLLBACK_CHECK_READY: 'false',
    GITHUB_TOKEN: 'test-token',
    GITHUB_API_URL: baseUrl,
    GITHUB_ACTIONS: 'true',
    GITHUB_RUN_ID: '123456',
    GITHUB_RUN_ATTEMPT: '1',
    GITHUB_REPOSITORY: 'renanescola40-afk/eurocomply_saas',
    GITHUB_REF_NAME: 'main',
    GITHUB_WORKFLOW: 'Enterprise Production Gate',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
  });

  assert.equal(result.code, 0, `rollback provider-bound fallback failed:\n${result.stderr}`);
  const evidence = JSON.parse(readFileSync(join(root, 'docs', 'security', 'evidence', 'runtime', 'rollback-dry-run-validation.json'), 'utf8'));
  assert.equal(evidence.rollbackTarget.providerBoundExactSha, true);
  assert.equal(evidence.rollbackTarget.authBoundaryObserved, true);
  assert.equal(evidence.rollbackTarget.protectedValidatedFallbackUsed, true);
  assert.equal(evidence.targetValidation.healthOk, true);
  assert.equal(evidence.targetValidation.directHealthOk, false);
});
