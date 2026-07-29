import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const SHA = 'a'.repeat(40);
const writer = resolve('scripts/release/write-public-production-go-no-go-evidence.mjs');
const validator = resolve('scripts/release/validate-public-production-go-no-go-evidence.mjs');
const definitions = [
  ['public-production-release-env-readiness.json', true, {}],
  ['deployment-smoke-validation.json', true, {
    smokeTargets: { passed: ['https://redacted.invalid'], failed: [] },
    targets: [{ passed: true }],
  }],
  ['observability-smoke-validation.json', false, {}],
  ['rollback-dry-run-validation.json', true, {
    dryRun: { mutatesProduction: false },
    targetValidation: { passed: true },
  }],
  ['supabase-live-rls-validation.json', true, {}],
  ['branch-protection-required-checks.json', false, {}],
  ['production-final-validation.json', true, {}],
];

function workspace(staleFile = null) {
  const root = mkdtempSync(join(tmpdir(), 'risck-public-go-no-go-'));
  const evidenceDir = join(root, 'docs/security/evidence/runtime');
  mkdirSync(evidenceDir, { recursive: true });

  for (const [file, commitBound, extra] of definitions) {
    writeFileSync(join(evidenceDir, file), `${JSON.stringify({
      status: 'Complete',
      ...(file !== 'branch-protection-required-checks.json' ? { outcome: 'passed' } : {}),
      generatedAt: '2026-07-29T18:00:00.000Z',
      releaseTarget: 'public-production',
      ...(commitBound ? { commitSha: file === staleFile ? 'b'.repeat(40) : SHA } : {}),
      ...extra,
    })}\n`);
  }

  return root;
}

function environment() {
  return {
    ...process.env,
    RELEASE_TARGET: 'public-production',
    RELEASE_COMMIT_SHA: SHA,
    RELEASE_BUILD_SHA: SHA,
  };
}

test('writer and validator retain Go only for exact-SHA public prerequisites', () => {
  const root = workspace();
  try {
    execFileSync(process.execPath, [writer], { cwd: root, env: environment(), stdio: 'pipe' });
    execFileSync(process.execPath, [validator], { cwd: root, env: environment(), stdio: 'pipe' });
    const result = JSON.parse(readFileSync(join(root, 'docs/security/evidence/runtime/release-go-no-go.json'), 'utf8'));

    assert.equal(result.finalDecision, 'Go');
    assert.equal(result.p0Blockers.length, 0);
    assert.equal(result.evidenceFiles.productionFinalValidation.shaMatches, true);
    assert.equal(result.profile, 'public-production');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('writer emits No-Go when one commit-bound prerequisite is stale', () => {
  const root = workspace('production-final-validation.json');
  try {
    const result = spawnSync(process.execPath, [writer], {
      cwd: root,
      env: environment(),
      encoding: 'utf8',
    });
    const decision = JSON.parse(readFileSync(join(root, 'docs/security/evidence/runtime/release-go-no-go.json'), 'utf8'));

    assert.notEqual(result.status, 0);
    assert.equal(decision.finalDecision, 'No-Go');
    assert.equal(decision.evidenceFiles.productionFinalValidation.shaMatches, false);
    assert.ok(decision.p0Blockers.some(({ blocker }) => blocker.includes('production-final-validation.json must be bound')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('writer emits No-Go when rollback proof could mutate production', () => {
  const root = workspace();
  try {
    const path = join(root, 'docs/security/evidence/runtime/rollback-dry-run-validation.json');
    const rollback = JSON.parse(readFileSync(path, 'utf8'));
    rollback.dryRun.mutatesProduction = true;
    writeFileSync(path, `${JSON.stringify(rollback)}\n`);

    const result = spawnSync(process.execPath, [writer], {
      cwd: root,
      env: environment(),
      encoding: 'utf8',
    });
    const decision = JSON.parse(readFileSync(join(root, 'docs/security/evidence/runtime/release-go-no-go.json'), 'utf8'));

    assert.notEqual(result.status, 0);
    assert.equal(decision.finalDecision, 'No-Go');
    assert.ok(decision.p0Blockers.some(({ blocker }) => blocker.includes('mutatesProduction=false')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
