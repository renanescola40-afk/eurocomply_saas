import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const scriptPath = 'scripts/platform/validate-deployment-provenance.mjs';
const script = readFileSync(scriptPath, 'utf8');

test('deployment provenance validator is fail closed in strict mode', () => {
  assert.match(script, /--strict/);
  assert.match(script, /process\.exitCode = 1/);
  assert.match(script, /full lowercase 40-character SHA/);
});

test('deployment provenance validator does not serialize health token', () => {
  assert.match(script, /HEALTHCHECK_TOKEN/);
  assert.match(script, /headers\.authorization = `Bearer \$\{healthToken\}`/);

  const directory = mkdtempSync(join(tmpdir(), 'deployment-provenance-'));
  const outputPath = join(directory, 'evidence.json');
  const secret = 'health-token-must-never-be-serialized';

  try {
    execFileSync(process.execPath, [scriptPath, `--output=${outputPath}`], {
      env: {
        ...process.env,
        HEALTHCHECK_TOKEN: secret,
        RELEASE_SHA: 'a'.repeat(40),
        PRODUCTION_DEPLOYMENT_URL: '',
        NEXT_PUBLIC_APP_URL: '',
        LAST_KNOWN_GOOD_DEPLOYMENT_URL: '',
      },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const evidence = readFileSync(outputPath, 'utf8');
    assert.doesNotMatch(evidence, new RegExp(secret));
    assert.doesNotMatch(evidence, /healthToken|HEALTHCHECK_TOKEN/);
    assert.doesNotMatch(evidence, /authorization/i);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('deployment provenance validates HTTPS and distinct rollback target', () => {
  assert.match(script, /protocol !== 'https:'/);
  assert.match(script, /Production and last-known-good origins must be distinct immutable deployments/);
});

test('deployment provenance requires deployment-reported exact SHA', () => {
  assert.match(script, /x-vercel-git-commit-sha/);
  assert.match(script, /Observed SHA does not match expected/);
  assert.match(script, /Deployment did not expose a verifiable build SHA/);
});

test('report preserves explicit limitations', () => {
  assert.match(script, /does not mutate Vercel/);
  assert.match(script, /does not.*prove provider dashboard ownership/i);
});
