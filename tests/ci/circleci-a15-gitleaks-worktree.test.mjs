import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const c = readFileSync('.circleci/config.yml', 'utf8');
const between=(a,b)=>c.split('\n  '+a+':\n',2)[1]?.split('\n  '+b+':',1)[0] || '';
const pre=between('a15-gitleaks-tool-preflight','a15-gitleaks-report-collection');
const collect=between('a15-gitleaks-report-collection','a15-gitleaks-findings-gate');
const gate=c.split('\n  a15-gitleaks-findings-gate:\n',2)[1]?.split('\n  # Second-stage opt-in;',1)[0] || '';
const manual=c.split('\n  a15-gitleaks-worktree-manual:\n',2)[1]?.split('\n  # ONE-SHOT:',1)[0] || '';
const once=between('a15-gitleaks-one-shot-20261106','onboarding-source-review-manual');

test('Gitleaks acquisition is pinned and does not scan production',()=>{
  assert.match(pre,/version=8\.30\.1/);
  assert.match(pre,/551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb/);
  assert.match(pre,/sha256sum --check/);
  assert.match(pre,/persist_to_workspace:/);
});
test('collection does not claim PASS and has a mandatory fail-closed gate',()=>{
  assert.match(collect,/gitleaks dir --exit-code 0 --redact --no-banner/);
  assert.match(collect,/formalAcceptance.*NOT_GRANTED/);
  assert.match(collect,/persist_to_workspace:/);
  assert.match(gate,/json\.load/);
  assert.match(gate,/A15_GITLEAKS_FINDINGS_PRESENT_SECURITY_GATE_BLOCKED/);
  assert.match(gate,/sys\.exit\(3\)/);
});
test('both workflows route preflight -> collection -> findings gate',()=>{
  for(const wf of [manual,once]){
    assert.match(wf,/- a15-gitleaks-tool-preflight:/);
    assert.match(wf,/- a15-gitleaks-report-collection:/);
    assert.match(wf,/- a15-gitleaks-findings-gate:/);
    assert.match(wf,/requires:\n\s+- a15-gitleaks-tool-preflight/);
    assert.match(wf,/requires:\n\s+- a15-gitleaks-report-collection/);
  }
  assert.match(c,/run_a15_gitleaks_worktree:\n    type: boolean\n    default: false/);
  assert.doesNotMatch(once,/- main\b/);
});
test('every stage is exact-SHA and source-only without provider secrets',()=>{
  for(const job of [pre,collect,gate]){
    assert.match(job,/git rev-parse HEAD/);
    assert.match(job,/CIRCLE_SHA1/);
    assert.match(job,/SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(job,/STRIPE_SECRET_KEY/);
    assert.doesNotMatch(job,/stripe checkout|npm run deploy/);
  }
});

test('finding gate branch filters are literal approved names, never template placeholders',()=>{
  const man=c.split('\n  a15-gitleaks-worktree-manual:\n',2)[1]?.split('\n  # ONE-SHOT:',1)[0]||'';
  const shot=c.split('\n  a15-gitleaks-one-shot-20261106:\n',2)[1]?.split('\n  onboarding-source-review-manual:',1)[0]||'';
  assert.doesNotMatch(man,/targetBranch/);
  assert.doesNotMatch(shot,/targetBranch/);
  assert.match(man,/- fix\/onboarding-explicit-plan-boundary-test-20261105/);
  assert.match(shot,/- ci\/a15-gitleaks-one-shot-20261106/);
});
