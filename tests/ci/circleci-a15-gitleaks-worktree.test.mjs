import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const c = readFileSync('.circleci/config.yml', 'utf8');
const job = c.split('\n  a15-gitleaks-exact-sha:\n', 2)[1]?.split('\n  # Second-stage opt-in;', 1)[0] || '';
const wf = c.split('\n  a15-gitleaks-worktree-manual:\n', 2)[1]?.split('\n  onboarding-source-review-manual:', 1)[0] || '';
test('A-15 Gitleaks is opt-in and never auto-runs', () => {
  assert.match(c, /run_a15_gitleaks_worktree:\n    type: boolean\n    default: false/);
  assert.match(wf, /when: << pipeline.parameters.run_a15_gitleaks_worktree >>/);
  assert.match(wf, /- a15-gitleaks-exact-sha:/);
});
test('A-15 Gitleaks only accepts the dedicated review branch and exact SHA', () => {
  assert.match(job, /fix\/onboarding-explicit-plan-boundary-test-20261105/);
  assert.match(wf, /only:\n\s+- fix\/onboarding-explicit-plan-boundary-test-20261105/);
  assert.match(job, /git rev-parse HEAD/);
  assert.match(job, /CIRCLE_SHA1/);
  assert.doesNotMatch(job, /git checkout --detach 2242d06b/);
});
test('A-15 Gitleaks uses digest-verified binary, redacted output and fail closed', () => {
  assert.match(job, /version=8\.30\.1/);
  assert.match(job, /551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb/);
  assert.match(job, /sha256sum --check/);
  assert.match(job, /gitleaks dir --redact --no-banner/);
  assert.match(job, /store_artifacts:/);
  assert.match(job, /formalAcceptance.*NOT_GRANTED/);
});
test('A-15 source scanner refuses privileged environments and does not deploy', () => {
  for (const key of ['SUPABASE_SERVICE_ROLE_KEY','STRIPE_SECRET_KEY','VERCEL_TOKEN','DATABASE_URL','RESEND_API_KEY']) assert.ok(job.includes(key));
  assert.doesNotMatch(job, /npm run deploy|stripe checkout|setup_remote_docker:/);
  assert.match(job, /resource_class: small/);
});

test('one-shot A-15 scan is limited to dedicated isolated branch', () => {
  const scan = c.split('\n  a15-gitleaks-one-shot-20261106:\n', 2)[1]?.split('\n  onboarding-source-review-manual:', 1)[0] || '';
  assert.match(scan, /- a15-gitleaks-exact-sha:/);
  assert.match(scan, /only:\n\s+- ci\/a15-gitleaks-one-shot-20261106/);
  assert.doesNotMatch(scan, /- main\b|- fix\/onboarding-explicit-plan-boundary-test-20261105\b/);
  assert.match(job, /ci\/a15-gitleaks-one-shot-20261106/);
  assert.match(job, /Refusing A-15 scanner on unauthorized branch/);
});
