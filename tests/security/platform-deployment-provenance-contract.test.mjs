import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script = readFileSync('scripts/platform/validate-deployment-provenance.mjs', 'utf8');

test('deployment provenance validator is fail closed in strict mode', () => {
  assert.match(script, /--strict/);
  assert.match(script, /process\.exitCode = 1/);
  assert.match(script, /full lowercase 40-character SHA/);
});

test('deployment provenance validator does not serialize health token', () => {
  assert.match(script, /HEALTHCHECK_TOKEN/);
  assert.doesNotMatch(script, /healthToken\s*[,}]/);
  assert.doesNotMatch(script, /token:\s*healthToken/);
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
