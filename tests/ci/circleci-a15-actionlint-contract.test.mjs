import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const c=readFileSync('.circleci/config.yml','utf8');
const job=c.split('\n  a15-actionlint-exact-sha:\n',2)[1]?.split('\nworkflows:',1)[0]||'';
const workflow=c.split('\n  a15-unified-evidence-once-20261107:\n',2)[1]?.split('\n  github-actions-recovery-manual:',1)[0]||'';

test('A-15 Actionlint only runs in a strictly isolated branch on exact SHA',()=>{
  assert.match(job,/test "\$\{CIRCLE_BRANCH:-\}" = "ci\/a15-unified-evidence-20261107"/);
  assert.match(job,/git rev-parse HEAD/);
  assert.match(job,/CIRCLE_SHA1/);
  assert.match(workflow,/only:\n\s+- ci\/a15-unified-evidence-20261107/);
  assert.doesNotMatch(workflow,/- main\b/);
});
test('A-15 Actionlint uses pinned, checksum-verified official release',()=>{
  assert.match(job,/version=1\.7\.12/);
  assert.match(job,/8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8/);
  assert.match(job,/sha256sum --check/);
  assert.match(job,/\/tmp\/actionlint/);
});
test('A-15 Actionlint is fail closed, with independent source-only identity',()=>{
  assert.match(job,/set -euo pipefail/);
  assert.match(job,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(job,/STRIPE_SECRET_KEY/);
  assert.match(job,/VERCEL_TOKEN/);
  assert.match(job,/formalAcceptance.*NOT_GRANTED/);
  assert.match(job,/store_artifacts:/);
  assert.doesNotMatch(job,/npm run deploy|stripe checkout|git push/);
});
