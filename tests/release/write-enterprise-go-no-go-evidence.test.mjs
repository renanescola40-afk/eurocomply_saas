import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);
const writer = resolve('scripts/release/write-enterprise-runtime-evidence.mjs');
const validator = resolve('scripts/release/validate-release-go-no-go-evidence.mjs');
const definitions = [
  ['enterprise-release-env-readiness.json', true, {}],
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
  ['production-secrets-provider-stores.json', false, {}],
  ['stripe-billing-validation.json', true, {}],
  ['upload-malware-scan-validation.json', true, {}],
  ['branch-protection-required-checks.json', false, {}],
  ['auth-rbac-final-validation.json', true, {
    releaseDecision: 'Go',
    goNoGo: { status: 'GO' },
    runtimeEvidenceStatus: 'executed_against_target_environment',
    evidenceIntegrity: {
      placeholderOnly: false,
      realRuntimeEvidenceAttached: true,
      customerFacingProof: true,
    },
  }],
  ['step-up-mfa-validation.json', true, {}],
  ['audit-chain-live-validation.json', true, {}],
  ['external-security-review-or-pentest.json', false, {
    reportReference: 'private-report-reference',
    evidenceIntegrity: {
      realExternalReportAttached: true,
      placeholderOnly: false,
    },
  }],
];

function workspace(staleFile = null) {
  const root = mkdtempSync(join(tmpdir(), 'risck-go-no-go-'));
  const evidenceDir = join(root, 'docs/security/evidence/runtime');
  mkdirSync(evidenceDir, { recursive: true });

  for (const [file, commitBound, extra] of definitions) {
    writeFileSync(join(evidenceDir, file), `${JSON.stringify({
      status: 'Complete',
      outcome: 'passed',
      generatedAt: '2026-07-29T18:00:00.000Z',
      releaseTarget: 'enterprise',
      ...(commitBound ? { commitSha: file === staleFile ? OTHER_SHA : SHA } : {}),
      ...extra,
    })}\n`);
  }

  return root;
}

function environment() {
  return {
    ...process.env,
    RELEASE_TARGET: 'enterprise',
    RELEASE_COMMIT_SHA: SHA,
    RELEASE_BUILD_SHA: SHA,
    FINAL_VALIDATION_IN_PROGRESS: 'true',
  };
}

function rewriteEvidence(root, file, value) {
  writeFileSync(
    join(root, 'docs/security/evidence/runtime', file),
    `${JSON.stringify(value)}\n`,
  );
}

test('writer and validator retain Go only for exact-SHA prerequisite evidence', () => {
  const root = workspace();
  try {
    execFileSync(process.execPath, [writer], { cwd: root, env: environment(), stdio: 'pipe' });
    execFileSync(process.execPath, [validator], { cwd: root, env: environment(), stdio: 'pipe' });
    const decision = JSON.parse(readFileSync(join(root, 'docs/security/evidence/runtime/release-go-no-go.json'), 'utf8'));

    assert.equal(decision.finalDecision, 'Go');
    assert.equal(decision.p0Blockers.length, 0);
    assert.equal(decision.evidenceFiles.deploymentSmoke.shaMatches, true);
    assert.equal(decision.evidenceFiles.deploymentSmoke.shaSource, 'commitSha');
    assert.equal(decision.evidenceFiles.deploymentSmoke.shaConflict, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('writer accepts canonical nested runtimeContext.commitSha binding', () => {
  const root = workspace();
  try {
    rewriteEvidence(root, 'upload-malware-scan-validation.json', {
      status: 'Complete',
      outcome: 'passed',
      generatedAt: '2026-07-29T18:00:00.000Z',
      releaseTarget: 'enterprise',
      runtimeContext: {
        commitSha: SHA,
        repository: 'renanescola40-afk/eurocomply_saas',
        branch: 'main',
      },
      evidenceIntegrity: {
        containsSensitiveValues: false,
        exactShaBound: true,
      },
    });

    execFileSync(process.execPath, [writer], { cwd: root, env: environment(), stdio: 'pipe' });
    const decision = JSON.parse(readFileSync(join(root, 'docs/security/evidence/runtime/release-go-no-go.json'), 'utf8'));

    assert.equal(decision.finalDecision, 'Go');
    assert.equal(decision.evidenceFiles.uploadScannerValidation.shaMatches, true);
    assert.equal(decision.evidenceFiles.uploadScannerValidation.shaSource, 'runtimeContext.commitSha');
    assert.equal(decision.evidenceFiles.uploadScannerValidation.shaConflict, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('writer emits No-Go when one commit-bound prerequisite is stale', () => {
  const root = workspace('deployment-smoke-validation.json');
  try {
    const result = spawnSync(process.execPath, [writer], {
      cwd: root,
      env: environment(),
      encoding: 'utf8',
    });
    const decision = JSON.parse(readFileSync(join(root, 'docs/security/evidence/runtime/release-go-no-go.json'), 'utf8'));

    assert.notEqual(result.status, 0);
    assert.equal(decision.finalDecision, 'No-Go');
    assert.equal(decision.evidenceFiles.deploymentSmoke.shaMatches, false);
    assert.ok(decision.p0Blockers.some(({ blocker }) => blocker.includes('deployment-smoke-validation.json must be bound')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('writer fails closed when canonical SHA bindings conflict', () => {
  const root = workspace();
  try {
    rewriteEvidence(root, 'upload-malware-scan-validation.json', {
      status: 'Complete',
      outcome: 'passed',
      generatedAt: '2026-07-29T18:00:00.000Z',
      releaseTarget: 'enterprise',
      commitSha: SHA,
      runtimeContext: { commitSha: OTHER_SHA },
      evidenceIntegrity: {
        containsSensitiveValues: false,
        exactShaBound: true,
      },
    });

    const result = spawnSync(process.execPath, [writer], {
      cwd: root,
      env: environment(),
      encoding: 'utf8',
    });
    const decision = JSON.parse(readFileSync(join(root, 'docs/security/evidence/runtime/release-go-no-go.json'), 'utf8'));

    assert.notEqual(result.status, 0);
    assert.equal(decision.finalDecision, 'No-Go');
    assert.equal(decision.evidenceFiles.uploadScannerValidation.shaMatches, false);
    assert.equal(decision.evidenceFiles.uploadScannerValidation.shaConflict, true);
    assert.ok(decision.p0Blockers.some(({ blocker }) => blocker.includes('conflicting exact-SHA provenance bindings')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});