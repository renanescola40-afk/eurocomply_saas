import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const config=readFileSync('.circleci/config.yml','utf8');
const job=config.split('\n  a07-evidence-source-proof:\n',2)[1]?.split('\nworkflows:',1)[0] || '';
const flow=config.split('\n  a07-evidence-proof-one-shot:\n',2)[1]?.split('\n  github-actions-recovery-manual:',1)[0] || '';

test('A-07 isolated CircleCI job runs only the exact source branch',()=>{
  assert.match(job,/CIRCLE_SHA1/);
  assert.match(job,/git rev-parse HEAD/);
  assert.match(flow,/only:\n\s+- fix\/e2-a07-evidence-truthful-readback-20261104/);
  assert.doesNotMatch(flow,/- main\b/);
});
test('A-07 CI actually executes Node pagination and Vault source tests',()=>{
  assert.match(job,/node --experimental-strip-types --test tests\/product\/evidence-report-pagination\.test\.mjs/);
  assert.match(job,/node --test tests\/product\/audit-pack-evidence-fail-closed\.test\.mjs/);
  assert.match(job,/node --test tests\/ci\/a07-evidence-circleci-proof\.test\.mjs/);
});
test('A-07 source proof is not a deploy, accepts no privileged credentials, and grants no gate',()=>{
  for (const secret of ['SUPABASE_SERVICE_ROLE_KEY','STRIPE_SECRET_KEY','VERCEL_TOKEN','DATABASE_URL']) assert.ok(job.includes(secret));
  assert.match(job,/formalAcceptance.*NOT_GRANTED/);
  assert.match(job,/resource_class: small/);
  assert.doesNotMatch(job,/npm run deploy|stripe checkout|git push|curl -X POST/);
});

test('A-07 shell guards expand real CircleCI environment rather than literal strings',()=>{
  assert.doesNotMatch(job,/\\\$\{CIRCLE_BRANCH:-\}/);
  assert.doesNotMatch(job,/\\\$\{CIRCLE_SHA1:-\}/);
  assert.doesNotMatch(job,/\\\$\{!key:-\}/);
  assert.match(job,/test "\$\{CIRCLE_BRANCH:-\}" = "fix\/e2-a07-evidence-truthful-readback-20261104"/);
  assert.match(job,/test -n "\$\{CIRCLE_SHA1:-\}"/);
  assert.match(job,/if \[ -n "\$\{!key:-\}" \]; then/);
});
