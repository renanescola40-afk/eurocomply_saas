import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const yaml = readFileSync('.circleci/config.yml', 'utf8');
const start = yaml.indexOf('          name: Next.js CI build using non-production placeholders');
const end = yaml.indexOf('\n  # Opt-in small executor;', start);
const job = start < 0 || end < 0 ? '' : yaml.slice(start, end);
test('memory proof stays inside bounded, existing source-quality job', () => {
  assert.ok(job);
  assert.match(job, /NODE_OPTIONS: --max-old-space-size=2560/);
  assert.match(job, /NEXT_PUBLIC_SUPABASE_URL: https:\/\/ci-placeholder\.supabase\.co/);
});
test('numeric-only cgroup diagnostics capture both OOM counters and build exit', () => {
  for (const fragment of [
    'CI_CGROUP_MEMORY_LIMIT=', 'CI_OOM_KILL_BEFORE=', 'CI_OOM_KILL_AFTER=',
    'CI_BUILD_EXIT=', 'CI_BUILD_CLASS=CGROUP_OOM_KILL_OBSERVED',
    'CI_BUILD_CLASS=EXIT_137_OOM_UNCONFIRMED',
  ]) assert.ok(job.includes(fragment), 'missing memory marker: ' + fragment);
});
test('failed build cannot be turned into PASS by diagnostic wrapper', () => {
  assert.match(job, /set \+e\n\s+npm run build\n\s+status=\$\?\n\s+set -e/);
  assert.match(job, /exit "\$status"/);
  assert.doesNotMatch(job, /npm run build \|\| true|exit 0|continue-on-error|printenv|set -x/);
});
test('existing manual quality pipeline is disabled by default and candidate never auto-runs', () => {
  assert.match(yaml, /run_actions_recovery_quality:\n    type: boolean\n    default: false/);
  const oneShot = yaml.split('\n  github-actions-quality-one-shot-20261102:\n', 2)[1]
    ?.split('\n  enterprise-source-proof-manual:\n', 1)[0] ?? '';
  assert.doesNotMatch(oneShot, /integration\/enterprise-unified-candidate-20261102/);
});
