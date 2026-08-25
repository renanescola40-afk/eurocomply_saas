import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile('.github/workflows/isolated-enterprise-fria-db-proof.yml', 'utf8');

test('workflow executes only for successful main or explicit manual confirmation', () => {
  assert.match(workflow, /workflows: \[Full Security Suite\]/);
  assert.match(workflow, /head_branch == 'main'/);
  assert.match(workflow, /RUN_ISOLATED_ENTERPRISE_FRIA_DB_PROOF/);
  assert.match(workflow, /commits\/main/);
  assert.match(workflow, /git rev-parse origin\/main/);
});

test('workflow is read-only and uses the reviewed disposable schema boundary', () => {
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.doesNotMatch(workflow, /contents: write|actions: write|pull_request_target/);
  assert.match(workflow, /supabase\/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520/);
  assert.match(workflow, /version: 2\.101\.0/);
  assert.match(workflow, /run-reviewed-ephemeral-schema-boundary-v4\.mjs/);
  assert.match(workflow, /manage-ephemeral-recovery-database\.mjs stop/);
  assert.doesNotMatch(workflow, /supabase@2\.39\.2|db reset --local --no-seed|run-ephemeral-project-schema-replay\.mjs/);
  assert.match(workflow, /persist-credentials: false/);
});

test('workflow binds the proof to the reviewed loopback database without retaining credentials', () => {
  assert.match(workflow, /DATABASE_URL: \$\{\{ env\.RECOVERY_ISOLATED_DATABASE_URL \}\}/);
  assert.match(workflow, /isolated-enterprise-fria-db-proof-\$\{\{ env\.TARGET_SHA \}\}/);
  assert.match(workflow, /retention-days: 90/);
  assert.doesNotMatch(workflow, /DATABASE_URL.*upload-artifact/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});
