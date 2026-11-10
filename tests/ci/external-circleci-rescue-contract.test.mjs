import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const source = readFileSync('.circleci/config.yml', 'utf8');

function circleJob(name) {
  const marker = '\n  ' + name + ':\n';
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, 'Missing CircleCI job: ' + name);
  const after = source.slice(start + marker.length);
  const boundary = after.search(/\n  [A-Za-z][A-Za-z0-9_-]*:\n|\nworkflows:\n/);
  return boundary === -1 ? after : after.slice(0, boundary);
}

function circleWorkflow(name) {
  const marker = '\n  ' + name + ':\n';
  const all = source.split('\nworkflows:\n')[1];
  assert.ok(all, 'CircleCI workflow section missing');
  const start = all.indexOf(marker);
  assert.notEqual(start, -1, 'Missing CircleCI workflow: ' + name);
  const after = all.slice(start + marker.length);
  const boundary = after.search(/\n  [A-Za-z][A-Za-z0-9_-]*:\n/);
  return boundary === -1 ? after : after.slice(0, boundary);
}

const job = circleJob('external-pr-quality');
const workflow = circleWorkflow('external-pr-quality-manual');

test('deep source quality is opt-in and scoped to two explicit CI branches', () => {
  assert.match(source, /run_external_pr_quality:\n    type: boolean\n    default: false/);
  assert.match(workflow, /when: << pipeline\.parameters\.run_external_pr_quality >>/);
  const allowedBranches = ['ci/rescue-external-pr-quality-20261109', 'ci/phase1-deep-release-20261110'];
  const branchFilter = workflow.match(/filters:\n[ \t]+branches:\n[ \t]+only:\n((?:[ \t]+- [^\n]+\n?)+)/);
  assert.ok(branchFilter, 'No explicit branch allowlist on deep manual workflow');
  assert.deepEqual(branchFilter[1].trim().split('\n').map((line) => line.trim().slice(2)), allowedBranches);
  assert.doesNotMatch(workflow, /- main\b|- qa\/|- prod\/|schedule:|context:/);
});

test('source executor uses exact SHA and fails closed if provider credentials exist', () => {
  for (const invariant of [
    'image: cimg/node:22.16.0',
    'resource_class: large',
    'test -n "$CIRCLE_SHA1"',
    'test "$(git rev-parse HEAD)" = "$CIRCLE_SHA1"',
    'test -n "$CIRCLE_BRANCH"',
    'CI isolation refused a provider credential',
    'DATABASE_URL|DIRECT_URL|SUPABASE_*|STRIPE_*|VERCEL_*',
    'formalGateAcceptance":false',
  ]) assert.ok(job.includes(invariant), 'Missing source safeguard: ' + invariant);
  assert.doesNotMatch(job, /machine:|setup_remote_docker:|persist_to_workspace:|npm run deploy|release:production/);
});

test('every required quality and supply-chain check is inside the actual job', () => {
  for (const command of [
    'npm ci --ignore-scripts --no-audit --no-fund',
    'npm run security:package-lock',
    'npm run lint',
    'npm run typecheck',
    'npm run test',
    'node scripts/security/run-security-ci-without-audit.mjs',
    'npm run build',
    'npm run quality:routes',
    'tests/enterprise-evidence/validate-evidence.test.mjs',
    'tests/ci/enterprise-evidence-exact-sha-contract.test.mjs',
    'npm run security:npm-audit:all',
    'sha256sum --check -',
    '/tmp/gitleaks dir --redact',
    'process.exit(rows.length?3:0)',
  ]) assert.ok(job.includes(command), 'Missing required quality guard: ' + command);
  assert.match(job, /NEXT_PUBLIC_SUPABASE_URL: https:\/\/ci-placeholder\.supabase\.co/);
  assert.match(job, /store_artifacts:\n\s+path: artifacts\/external-pr-ci/);
});

test('Gitleaks findings never return a fabricated success', () => {
  assert.ok(job.includes('process.exit(rows.length?3:0)'));
  assert.ok(job.includes('findingCount:rows.length'));
  assert.ok(job.includes('sourceSha:process.env.CIRCLE_SHA1'));
  assert.ok(job.includes('ruleId:String(x.RuleID||"")'));
  assert.doesNotMatch(job, /continue-on-error: true|allow_failure: true/);
});

test('Gitleaks scans checked-out sources before npm install and Next build, with strict failure', () => {
  const scan = job.indexOf('name: CI-00 Pinned Gitleaks source scan');
  const install = job.indexOf('name: CI-01 Deterministic dependency install');
  const build = job.indexOf('name: CI-07 Next.js build');
  assert.ok(scan !== -1 && install !== -1 && build !== -1 && scan < install && install < build);
  assert.match(job, /\/tmp\/gitleaks dir --redact --no-banner --exit-code 0/);
  assert.match(job, /process\.exit\(rows\.length\?3:0\)/);
  assert.doesNotMatch(job, /--no-git|--exclude-path|allow_failure:\s*true|continue-on-error:\s*true/);
});

test('source Actionlint job uses a pinned real binary and fails closed', () => {
  const actionJob = circleJob('source-actionlint');
  const actionWorkflow = circleWorkflow('source-actionlint-pr');
  for (const required of [
    'test "$(git rev-parse HEAD)" = "$CIRCLE_SHA1"',
    'test -n "$CIRCLE_BRANCH"',
    'Privileged variable forbidden in source Actionlint job',
    '8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8',
    'sha256sum --check -',
    '/tmp/actionlint -color=false',
    'set -euo pipefail',
  ]) assert.ok(actionJob.includes(required), 'Missing fail-closed Actionlint invariant: ' + required);
  assert.match(actionWorkflow, /when: pipeline\.event\.name == "pull_request"/);
  assert.doesNotMatch(actionWorkflow, /filters:|branches:|context:|schedule:/);
  assert.doesNotMatch(actionJob, /context:|npm run deploy|curl.*supabase|continue-on-error:\s*true|allow_failure:\s*true/);
});


test('approved CI branches pass real bash guard; all other branches fail closed', () => {
  const guard = job.match(/case "\$CIRCLE_BRANCH" in[\s\S]*?esac/);
  assert.ok(guard, 'Missing branch restriction in actual source executor');
  const check = (branch) => spawnSync('bash', ['-c', 'set -euo pipefail\n' + guard[0]], {
    env: { ...process.env, CIRCLE_BRANCH: branch },
    encoding: 'utf8',
  });
  for (const branch of ['ci/rescue-external-pr-quality-20261109', 'ci/phase1-deep-release-20261110']) {
    assert.equal(check(branch).status, 0, 'Approved branch was refused: ' + branch);
  }
  for (const branch of ['main', 'qa/isolated', 'production', 'ci/unapproved', 'ci/phase1-deep-release-20261110-extra', '']) {
    assert.equal(check(branch).status, 1, 'Forbidden branch passed: ' + branch);
  }
});


test('automatic FAST_PR actually runs this deep-branch safety contract without a new job', () => {
  assert.match(source, /name: Verify automatic CI and manual deep safety contracts\n\s+command: node --test tests\/ci\/circleci-pr-autopilot-contract\.test\.mjs tests\/ci\/external-circleci-rescue-contract\.test\.mjs/);
});
