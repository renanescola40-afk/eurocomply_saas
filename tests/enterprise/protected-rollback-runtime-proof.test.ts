import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const runner = readFileSync('scripts/release/run-protected-rollback-validation.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/protected-rollback-runtime-proof.yml', 'utf8');

describe('protected rollback runtime proof', () => {
  it('requires an explicit exact-SHA production approval boundary', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).toContain('test "$MAIN_SHA" = "$TARGET_SHA"');
    expect(workflow).toContain('ROLLBACK ${TARGET_SHA,,} TO ${ROLLBACK_TARGET_SHA,,}');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('push:');
    expect(workflow).not.toContain('contents: write');
  });

  it('rolls back to a distinct deployment and always attempts restoration', () => {
    expect(runner).toContain("runVercel(['rollback', targetDeployment.href]");
    expect(runner).toContain("runVercel(['promote', currentDeployment.href]");
    expect(runner).toContain('targetSha !== currentSha');
    expect(runner).toContain('targetDeployment?.hostname !== currentDeployment?.hostname');
    expect(runner).toContain('finally {');
    expect(runner).toContain('current_deployment_restore_failed');
  });

  it('requires health, no-store and exact build SHA after rollback and restore', () => {
    expect(runner).toContain("new URL('/api/health', baseUrl)");
    expect(runner).toContain("body?.status === 'ok'");
    expect(runner).toContain('/\\bno-store\\b/i');
    expect(runner).toContain('observedSha === expectedSha');
    expect(runner).toContain('postRollbackHealth');
    expect(runner).toContain('postRestoreHealth');
  });

  it('stores only redacted result metadata and fails closed', () => {
    for (const token of [
      'containsSensitiveValues: false',
      'rawTokenStored: false',
      'rawDeploymentUrlStored: false',
      'rawProviderResponseStored: false',
      "process.exitCode = 1",
      "console.error('Rollback runtime validation failed closed.')",
    ]) expect(runner).toContain(token);

    expect(runner).not.toContain('stdout: result.stdout');
    expect(runner).not.toContain('stderr: result.stderr');
    expect(runner).not.toContain('Authorization: `Bearer ${token}`');
  });
});
