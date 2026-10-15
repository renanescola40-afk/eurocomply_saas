import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const workflow = name => readFileSync(new URL('../../.github/workflows/' + name, import.meta.url), 'utf8');
function has(source, key) {
  assert.ok(source.includes(key), 'Missing required contract: ' + key);
}
function schedule(source, cron) {
  assert.ok(source.includes("cron: '" + cron + "'"), 'Expected schedule ' + cron);
}
test('DataGuard PR and manual coverage survive runner coalescing', () => {
  const s = workflow('dataguard-buyer-room-offline-audit.yml');
  for (const marker of [
    '  pull_request:', '  workflow_dispatch:', "      - 'DATAGUARD_DATA_ROOM/**'",
    'node --test scripts/ma/audit-buyer-room.test.mjs scripts/ma/check-buyer-coverage.test.mjs',
    'node scripts/ma/audit-buyer-room.mjs', 'node scripts/ma/check-buyer-coverage.mjs',
    'group: dataguard-room-' + '$' + '{{ github.event.pull_request.number || github.ref }}',
    'cancel-in-progress: true', '  contents: read'
  ]) has(s, marker);
});
test('CodeQL push, PR, schedule, all security analysis steps survive', () => {
  const s = workflow('codeql.yml');
  for (const marker of [
    '  push:', '  pull_request:', '  schedule:', 'Initialize CodeQL', 'Autobuild',
    'Perform CodeQL Analysis', 'github/codeql-action/analyze@', 'github/codeql-action/init@',
    'group: codeql-' + '$' + '{{ github.event_name }}-' + '$' + '{{ github.event.pull_request.number || github.ref }}',
    'cancel-in-progress: true', '  security-events: write'
  ]) has(s, marker);
  schedule(s, '23 3 * * 1');
});
test('PR classifier keeps immediate pull_request_target and manual dispatch', () => {
  const s = workflow('pr-autopilot.yml');
  for (const marker of [
    'pull_request_target:', 'opened, reopened, synchronize, ready_for_review, labeled, unlabeled',
    '  workflow_dispatch:', 'automaticMerge !== false', 'administratorBypass !== false'
  ]) has(s, marker);
  schedule(s, '17 */6 * * *');
  assert.ok(!s.includes("cron: '17 * * * *'"));
});
test('enterprise closeout keeps event-driven and manual coverage', () => {
  const s = workflow('enterprise-closeout-watchdog.yml');
  for (const marker of [
    '  workflow_run:', 'types: [completed]', '  workflow_dispatch:',
    'Enterprise Runtime Closeout', 'Enterprise Safe Runtime Bootstrap', 'CLOSEOUT_WATCHDOG_STRICT'
  ]) has(s, marker);
  schedule(s, '17 */6 * * *');
});
test('full senior-agent regression remains available manually and daily', () => {
  const s = workflow('senior-agent-watchdog.yml');
  for (const marker of [
    '  workflow_dispatch:', '  schedule:', 'Audit main quality and security gates',
    'run_gate install npm ci'
  ]) has(s, marker);
  schedule(s, '17 6 * * *');
});
test('mandatory security workflows remain event-driven and enabled', () => {
  for (const name of ['gitleaks.yml', 'secret-scanning.yml', 'semgrep.yml', 'security-ci.yml']) {
    const s = workflow(name);
    has(s, '  pull_request:');
    has(s, '  push:');
    has(s, '  workflow_dispatch:');
  }
});
