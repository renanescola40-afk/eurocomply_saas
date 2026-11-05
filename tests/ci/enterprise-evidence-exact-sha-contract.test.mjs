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
