import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const rollbackScript = resolve('scripts/release/run-rollback-dry-run.mjs');
const closeoutWorkflow = resolve('.github/workflows/enterprise-runtime-evidence-closeout.yml');

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
