import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const SCRIPT = 'scripts/security/write-p0-enterprise-progress.mjs';
const WORKFLOW = readFileSync('.github/workflows/p0-progress.yml', 'utf8');
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const SHA = 'a'.repeat(40);

function runtimeRegister(commitSha = SHA) {
  return {
    schema: 'risck-comply.p0-runtime-evidence-register.v1',
    repository: REPOSITORY,
    branch: 'main',
    commitSha,
    generatedAt: '2026-08-14T16:24:15.870Z',
    decision: 'NO_GO',
    status: 'Open',
    controls: [
      { item: 'Branch protection applied on `main`', status: 'Open', satisfied: false },
      { item: 'Required status checks configured', status: 'Complete', satisfied: true },
      { item: 'Production provider configuration evidence', status: 'Open', satisfied: false },
      { item: 'Supabase live RLS validation completed', status: 'Complete', satisfied: true },
      { item: 'External review', status: 'Open', satisfied: false },
    ],
  };
}

function runReporter(register, expectedSha = SHA) {
  const dir = mkdtempSync(join(tmpdir(), 'risck-p0-progress-'));
  const evidencePath = join(dir, 'p0-runtime-evidence-register.json');
  const outputPath = join(dir, 'p0-enterprise-progress.json');
  writeFileSync(evidencePath, `${JSON.stringify(register, null, 2)}\n`);
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      P0_PROGRESS_ASSESSED_SHA: expectedSha,
      P0_RUNTIME_EVIDENCE_PATH: evidencePath,
      P0_PROGRESS_OUTPUT_PATH: outputPath,
    },
    encoding: 'utf8',
  });
  return { dir, evidencePath, outputPath, result };
}

test('P0 Progress refreshes only after an artifact-backed exact-SHA P0 Runtime Evidence producer succeeds', () => {
  assert.match(WORKFLOW, /workflow_run:\s*[\s\S]*P0 Runtime Evidence/);
  assert.match(WORKFLOW, /classify-source:/);
  assert.match(WORKFLOW, /PARENT_CONCLUSION: \$\{\{ github\.event\.workflow_run\.conclusion \|\| '' \}\}/);
  assert.match(WORKFLOW, /\[ "\$PARENT_CONCLUSION" != 'success' \]/);
  assert.match(WORKFLOW, /\[ "\$PARENT_SHA" != "\$WORKFLOW_SHA" \]/);
  assert.match(WORKFLOW, /actions\/runs\/\$\{PARENT_RUN_ID\}\/artifacts\?per_page=100/);
  assert.match(WORKFLOW, /artifact_count=.*select\(\.name == \$name and \.expired == false\)/);
  assert.match(WORKFLOW, /name: \$\{\{ needs\.classify-source\.outputs\.authoritative == 'true' && 'Report P0 enterprise progress' \|\| 'Stale P0 progress trigger \(ignored\)' \}\}/);
  assert.match(WORKFLOW, /run-id: \$\{\{ github\.event\.workflow_run\.id \}\}/);
  assert.match(WORKFLOW, /name: p0-runtime-evidence-register-\$\{\{ env\.ASSESSED_SHA \}\}/);
  assert.match(WORKFLOW, /P0_PROGRESS_ASSESSED_SHA: \$\{\{ env\.ASSESSED_SHA \}\}/);
  assert.match(WORKFLOW, /P0_RUNTIME_EVIDENCE_PATH:/);
});

test('authoritative exact-SHA runtime evidence promotes only independently satisfied controls', () => {
  const execution = runReporter(runtimeRegister());
  try {
    assert.equal(execution.result.status, 0, execution.result.stderr || execution.result.stdout);
    const report = JSON.parse(readFileSync(execution.outputPath, 'utf8'));
    assert.equal(report.repoReadiness.completed, 7);
    assert.equal(report.repoReadiness.total, 7);
    assert.equal(report.runtimeEvidence.completed, 2);
    assert.equal(report.runtimeEvidence.total, 5);
    assert.equal(report.combined.completed, 9);
    assert.equal(report.combined.total, 12);
    assert.equal(report.combined.percent, 75);
    assert.equal(report.runtimeEvidence.source.kind, 'authoritative-runtime-register');
    assert.equal(report.runtimeEvidence.source.commitSha, SHA);
    assert.equal(report.runtimeEvidence.source.exactShaBound, true);

    const checks = Object.fromEntries(report.runtimeEvidence.checks.map((check) => [check.id, check.done]));
    assert.equal(checks['branch-protection-applied'], false);
    assert.equal(checks['required-checks-applied'], true);
    assert.equal(checks['production-secrets-configured'], false);
    assert.equal(checks['rls-live-validation-complete'], true);
    assert.equal(checks['external-review-complete'], false);
  } finally {
    rmSync(execution.dir, { recursive: true, force: true });
  }
});

test('stale or cross-SHA runtime evidence fails closed instead of falling back to legacy prose', () => {
  const execution = runReporter(runtimeRegister('b'.repeat(40)));
  try {
    assert.notEqual(execution.result.status, 0);
    assert.match(execution.result.stderr, /not bound to the assessed SHA/);
  } finally {
    rmSync(execution.dir, { recursive: true, force: true });
  }
});
