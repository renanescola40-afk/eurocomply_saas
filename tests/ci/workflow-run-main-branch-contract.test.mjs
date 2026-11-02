import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const requiredMainOnlyConsumers = [
  '.github/workflows/p0-progress.yml',
  '.github/workflows/p0-runtime-evidence.yml',
  '.github/workflows/enterprise-closeout-watchdog.yml',
  '.github/workflows/legal-rules-runtime-promotion.yml',
  '.github/workflows/supabase-migration-review-context.yml',
  '.github/workflows/stripe-runtime-evidence-promotion.yml',
  '.github/workflows/isolated-enterprise-fria-db-proof.yml',
  '.github/workflows/enterprise-safe-promotion-scorecard.yml',
  '.github/workflows/enterprise-safe-runtime-bootstrap.yml',
];

function workflowRunTrigger(path) {
  const source = readFileSync(path, 'utf8');
  const header = source.split('\npermissions:', 1)[0];
  const lines = header.split('\n');
  const start = lines.findIndex((line) => line === '  workflow_run:');
  assert.notEqual(start, -1, 'workflow must declare a workflow_run trigger');
  const end = lines.findIndex((line, index) => index > start && /^  [a-z_][\w-]*:/.test(line));
  return { header, block: lines.slice(start, end < 0 ? lines.length : end).join('\n') };
}

for (const path of requiredMainOnlyConsumers) {
  test(path + ' creates workflow_run executions only for main producers', () => {
    const { block } = workflowRunTrigger(path);
    assert.match(block, /^    branches: \[main\]$/m);
    assert.match(block, /^    types: \[completed\]$/m);
  });
}

test('manual recovery remains available for the evidence consumers', () => {
  for (const path of requiredMainOnlyConsumers.filter((p) => !p.endsWith('supabase-migration-review-context.yml'))) {
    const { header } = workflowRunTrigger(path);
    assert.match(header, /^  workflow_dispatch:/m);
  }
});

test('Codex Auto-Fix continues to observe CI completions on feature branches', () => {
  const { block } = workflowRunTrigger('.github/workflows/codex-autofix.yml');
  assert.match(block, /workflows: \[CI\]/);
  assert.doesNotMatch(block, /^    branches: \[main\]$/m);
});

test('scorecard stabilizer rejects skipped producer completion before runner allocation', () => {
  const source = readFileSync('.github/workflows/enterprise-readiness-scorecard-stabilizer.yml', 'utf8');
  const jobHeader = source.split('jobs:\n', 2)[1]?.split('    runs-on:', 1)[0] ?? '';
  assert.match(jobHeader, /github\.event\.workflow_run\.conclusion != 'skipped'/);
  assert.match(jobHeader, /github\.event\.workflow_run\.head_branch == 'main'/);
  assert.match(jobHeader, /github\.event\.workflow_run\.name != 'Enterprise Production Gate'/);
  assert.match(jobHeader, /github\.event\.workflow_run\.event != 'workflow_dispatch'/);
  assert.doesNotMatch(jobHeader, /conclusion == 'success'/, 'actual failures must still reach the existing fail-closed reconciliation');
  const { header, block } = workflowRunTrigger('.github/workflows/enterprise-readiness-scorecard-stabilizer.yml');
  assert.match(block, /^    branches: \[main\]$/m);
  assert.match(header, /^  workflow_dispatch:/m);
  assert.match(source, /group: enterprise-readiness-scorecard-stabilizer-/);
  assert.match(source, /cancel-in-progress: true/);
});

test('Codex automatic repair starts only for failed CI PR checks, not main push failures', () => {
  const source = readFileSync('.github/workflows/codex-autofix.yml', 'utf8');
  const header = source.split('\njobs:', 2)[0];
  const job = source.split('\n  autofix:', 2)[1]?.split('    runs-on:', 1)[0] ?? '';
  assert.match(header, /workflow_run:\s*\n\s*workflows: \[CI\]\s*\n\s*types: \[completed\]/);
  assert.match(header, /workflow_dispatch:/);
  assert.match(job, /github\.event_name == 'workflow_dispatch'/);
  assert.match(job, /github\.event_name == 'workflow_run'/);
  assert.match(job, /github\.event\.workflow_run\.event == 'pull_request'/);
  assert.match(job, /github\.event\.workflow_run\.conclusion == 'failure'/);
  assert.doesNotMatch(job, /github\.event\.workflow_run\.event == 'push'/);
  assert.match(source, /const sameRepository = pull\.head\.repo\?\.full_name === repositoryFullName/);
  assert.match(source, /pull\.state === 'open'/);
  assert.match(source, /attempts < policy\.limits\.maxAutofixAttempts/);
});

// The following completion filters are job-level safeguards. GitHub still
// records workflow_run events; no check outcome is promoted to PASS here.
test('Enterprise 100 closure skips only no-op or superseded producer completions', () => {
  const source = readFileSync('.github/workflows/enterprise-100-closure.yml', 'utf8');
  const job = source.split('\n  contract:', 2)[1]?.split('    runs-on:', 1)[0] ?? '';
  assert.match(job, /github\.event_name != 'workflow_run'/);
  assert.match(job, /github\.event\.workflow_run\.head_sha == github\.sha/);
  assert.match(job, /github\.event\.workflow_run\.head_branch == 'main'/);
  assert.match(job, /github\.event\.workflow_run\.conclusion != 'skipped'/);
  assert.match(job, /github\.event\.workflow_run\.conclusion != 'cancelled'/);
  assert.doesNotMatch(job, /conclusion == 'success'/, 'failed producers must remain eligible for NO_GO assessment');
  assert.match(source, /^  pull_request:/m);
  assert.match(source, /^  push:/m);
  assert.match(source, /^  workflow_dispatch:/m);
});

test('Enterprise closeout watchdog ignores no-op producer completion without weakening schedule or manual audit', () => {
  const source = readFileSync('.github/workflows/enterprise-closeout-watchdog.yml', 'utf8');
  const job = source.split('\n  watchdog:', 2)[1]?.split('    runs-on:', 1)[0] ?? '';
  assert.match(job, /github\.event_name != 'workflow_run'/);
  assert.match(job, /github\.event\.workflow_run\.head_branch == 'main'/);
  assert.match(job, /github\.event\.workflow_run\.conclusion != 'skipped'/);
  assert.match(job, /github\.event\.workflow_run\.conclusion != 'cancelled'/);
  assert.doesNotMatch(job, /conclusion == 'success'/, 'upstream failures must remain visible');
  assert.match(source, /^  workflow_dispatch:/m);
  assert.match(source, /^  schedule:/m);
  assert.match(source, /cron: '17 \*\/6 \* \* \*'/);
  assert.match(source, /Enterprise Safe Runtime Bootstrap/);
  assert.match(source, /Enterprise Runtime Closeout/);
});
