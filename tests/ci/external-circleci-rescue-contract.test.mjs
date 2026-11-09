import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const source = readFileSync('.circleci/config.yml','utf8');
const job = source.split('\n  external-pr-quality:\n')[1]?.split('\n  [a-zA-Z]',1)[0] ?? '';
test('staged CI rescue stays manual-only and exact SHA',()=>{
  assert.match(source,/run_external_pr_quality:\n    type: boolean\n    default: false/);
  assert.match(source,/external-pr-quality-manual:\n    when: << pipeline.parameters.run_external_pr_quality >>/);
  assert.match(source,/only:\n\s+- ci\/rescue-external-pr-quality-20261109/);
  for(const s of ['test "$(git rev-parse HEAD)" = "$CIRCLE_SHA1"','CI isolation refused a provider credential','formalGateAcceptance']) assert.ok(source.includes(s),s);
});
test('source-only job runs real quality and security checks',()=>{
  for(const cmd of ['npm ci --ignore-scripts --no-audit --no-fund','npm run security:package-lock','npm run lint','npm run typecheck','npm run test','node scripts/security/run-security-ci-without-audit.mjs','npm run build','npm run quality:routes','tests/enterprise-evidence/validate-evidence.test.mjs','npm run security:npm-audit:all','/tmp/gitleaks dir --redact']) assert.ok(source.includes(cmd),cmd);
  assert.ok(!source.includes('external-pr-quality:\n    machine:'));
});
