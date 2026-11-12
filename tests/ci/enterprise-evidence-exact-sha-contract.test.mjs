import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/enterprise-evidence-tests.yml', 'utf8');
const validator = readFileSync('scripts/enterprise-evidence/validate-evidence.mjs', 'utf8');
const run = workflow.split('      - name: Validate G1 evidence factory contracts\n', 2)[1]
  ?.split('      - name: Generate exact-SHA SHA-256 evidence manifest\n', 1)[0] ?? '';

test('G1 evidence validator receives actual PR head SHA, not a frozen baseline',()=>{
 assert.match(run, /EVIDENCE_EXACT_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
 assert.match(run, /test "\$\(git rev-parse HEAD\)" = "\$EVIDENCE_EXACT_SHA"/);
 assert.match(run, /node scripts\/enterprise-evidence\/validate-evidence\.mjs --report/);
 assert.match(validator, /expectedSha=process\.env\.EVIDENCE_EXACT_SHA\|\|index\.source\.commit_sha/);
});

test('G1 acceptance CI fetches Git ancestry for immutable reviewed source SHA verification',()=>{
 assert.match(workflow, /fetch-depth: 0/);
 assert.match(workflow, /ref: \${\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
 assert.match(validator, /merge-base/);
 assert.match(validator, /--no-ext-diff/);
});

test('source-only contract test cannot waive existing evidence validation and digest checks',()=>{
 assert.match(run, /node --test tests\/enterprise-evidence\/validate-evidence\.test\.mjs/);
 assert.match(run, /node --test tests\/ci\/enterprise-evidence-exact-sha-contract\.test\.mjs/);
 assert.match(workflow, /EVIDENCE_SHA256_OUTPUT: artifacts\/enterprise-readiness\/EVIDENCE_SHA256_MANIFEST\.json/);
 assert.match(workflow, /- name: Enforce enterprise evidence tests passed/);
});


test('A-18 exact-head provider attestation requires read-only GitHub API scope',()=>{
 assert.match(workflow,/pull-requests: read/);
 assert.match(run,/EVIDENCE_PR_NUMBER: \$\{\{ github\.event\.pull_request\.number \|\| '' \}\}/);
 assert.match(run,/GITHUB_TOKEN: \$\{\{ github\.token \}\}/);
 assert.match(validator,/verifyGitHubA18CurrentHead/);
 assert.match(validator,/authenticated_current_head_review_required/);
});


test('A-18 provider request SHA is sourced solely from trusted workflow input, never committed evidence JSON',()=>{
 assert.match(validator, /providerExpectedSha=process\.env\.EVIDENCE_EXACT_SHA/);
 assert.match(validator, /SHA40\.test\(providerExpectedSha\|\|''\)/);
 assert.match(validator, /verifyGitHubA18CurrentHead\(a18,\{expectedSha:providerExpectedSha,/);
 assert.doesNotMatch(validator, /verifyGitHubA18CurrentHead\(a18,\{expectedSha,prNumber/);
 // Historical source SHA remains usable for offline reconciliation, not provider requests.
 assert.match(validator, /expectedSha=process\.env\.EVIDENCE_EXACT_SHA\|\|index\.source\.commit_sha/);
});

test('the required enterprise merge check verifies acceptance changes on the exact PR head', () => {
 const suite = readFileSync('.github/workflows/full-security-suite.yml', 'utf8');
 const gate = suite.split('  enterprise-gate:\n', 2)[1] ?? '';
 const guard = gate.split('      - name: Enforce formal evidence before merge\n', 2)[1] ?? '';
 assert.match(gate, /name: Enterprise merge\/deploy gate/);
 assert.match(gate, /name: Enforce all security jobs passed/);
 assert.match(gate, /contents: read\n      pull-requests: read/);
 assert.match(gate, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
 assert.match(gate, /fetch-depth: 0/);
 assert.match(guard, /if: github\.event_name == 'pull_request'/);
 assert.match(guard, /EVIDENCE_BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
 assert.match(guard, /EVIDENCE_EXACT_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
 assert.match(guard, /EVIDENCE_PR_NUMBER: \$\{\{ github\.event\.pull_request\.number \}\}/);
 assert.match(guard, /GITHUB_TOKEN: \$\{\{ github\.token \}\}/);
 assert.match(guard, /test "\$\(git rev-parse HEAD\)" = "\$EVIDENCE_EXACT_SHA"/);
 assert.match(guard, /git diff --name-only "\$EVIDENCE_BASE_SHA\.\.\.\$EVIDENCE_EXACT_SHA"/);
 assert.match(guard, /ENTERPRISE_EVIDENCE_MASTER_INDEX\.json/);
 assert.match(guard, /gate-closure-v\*\/A18\*\.json/);
 assert.match(guard, /node scripts\/enterprise-evidence\/validate-evidence\.mjs --report/);
});
