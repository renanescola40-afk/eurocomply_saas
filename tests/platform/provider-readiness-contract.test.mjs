import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const script = 'scripts/platform/check-provider-readiness.mjs';

test('contract mode validates declared provider variables without exposing values', () => {
  const dir = mkdtempSync(join(tmpdir(), 'provider-readiness-'));
  const output = join(dir, 'report.json');
  const result = spawnSync(process.execPath, [script, '--contract', `--output=${output}`], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  try {
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(readFileSync(output, 'utf8'));
    assert.equal(report.status, 'PASS');
    assert.equal(report.mode, 'contract');
    assert.equal(report.external_dashboard_proof.status, 'NOT_PROVEN_BY_REPOSITORY');
    assert.match(report.redaction, /No environment values/);
    assert.ok(report.checks.length >= 15);
    assert.ok(report.checks.every((item) => !Object.hasOwn(item, 'value')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
