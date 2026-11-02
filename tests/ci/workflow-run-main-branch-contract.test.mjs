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
