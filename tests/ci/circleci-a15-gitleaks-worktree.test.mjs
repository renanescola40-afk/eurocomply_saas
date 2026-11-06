import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const config = readFileSync('.circleci/config.yml', 'utf8');
const span=(start,end)=>config.split('\n  '+start+':\n',2)[1]?.split('\n  '+end+':',1)[0] || '';
const pre=span('a15-gitleaks-tool-preflight','a15-gitleaks-exact-sha');
const scan=config.split('\n  a15-gitleaks-exact-sha:\n',2)[1]?.split('\n  # Second-stage opt-in;',1)[0] || '';
const manual=span('a15-gitleaks-worktree-manual','# ONE-SHOT');
const once=span('a15-gitleaks-one-shot-20261106','onboarding-source-review-manual');

test('two distinct provider checks isolate setup failures from actual findings',()=>{
  assert.match(pre,/sha256sum --check/);
  assert.match(pre,/version=8\.30\.1/);
  assert.match(pre,/551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb/);
  assert.match(pre,/persist_to_workspace:/);
  assert.match(scan,/attach_workspace:/);
  assert.match(scan,/gitleaks dir --redact --no-banner/);
  assert.doesNotMatch(scan,/curl --fail|sha256sum --check/);
});
test('both scan workflows require a successful preflight job',()=>{
  for (const wf of [manual,once]){
    assert.match(wf,/- a15-gitleaks-tool-preflight:/);
    assert.match(wf,/- a15-gitleaks-exact-sha:/);
    assert.match(wf,/requires:\n\s+- a15-gitleaks-tool-preflight/);
  }
});
test('no automatic scan on main, source SHA verified and provider credentials denied',()=>{
  assert.match(config,/run_a15_gitleaks_worktree:\n    type: boolean\n    default: false/);
  assert.match(manual,/when: << pipeline.parameters.run_a15_gitleaks_worktree >>/);
  assert.match(once,/ci\/a15-gitleaks-one-shot-20261106/);
  assert.doesNotMatch(once,/- main\b/);
  for(const job of [pre,scan]){
    assert.match(job,/CIRCLE_SHA1/);
    assert.match(job,/git rev-parse HEAD/);
    assert.match(job,/SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(job,/STRIPE_SECRET_KEY/);
  }
  assert.match(scan,/formalAcceptance.*NOT_GRANTED/);
  assert.doesNotMatch(scan,/npm run deploy|stripe checkout/);
});
