import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const script = path.resolve('scripts/release/compile-enterprise-final-closeout.mjs');
const sha = 'a'.repeat(40);
const domains = [
  'repository_gates',
  'runtime_closeout',
  'migration_post_execution',
  'branch_protection',
  'backup_restore',
  'external_security_review',
  'qualified_legal_review',
  'release_approval',
  'security_approval',
  'operations_approval',
];

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'enterprise-closeout-'));
  const input = path.join(root, 'input');
  const output = path.join(root, 'output');
  mkdirSync(input);
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const records = domains.map((domain, index) => ({
    domain,
    status: 'COMPLETE',
    outcome: 'passed',
    owner: `owner-${index}`,
    reviewer: `reviewer-${index}`,
    workflowRunUrl: `https://github.com/acme/repo/actions/runs/${index + 1}`,
    evidenceDigest: `${String(index + 1).padStart(64, '0')}`,
    expiresAt: future,
    sha,
    synthetic: false,
    template: false,
  }));
  writeFileSync(path.join(input, 'enterprise-evidence-intake.json'), JSON.stringify({
    sha,
    accepted: true,
    enterpriseGoGrantedByThisArtifact: false,
    repositoryChecksAreRuntimeProof: false,
    domains: records,
  }));
  writeFileSync(path.join(input, 'enterprise-final-decision.json'), JSON.stringify({
    sha,
    decision: 'ENTERPRISE_GO',
    enterpriseGoGrantedByThisArtifact: true,
    unresolvedRiskAcceptance: false,
  }));
  writeFileSync(path.join(input, 'enterprise-closeout-queue.json'), JSON.stringify({
    sha,
    items: domains.map((domain) => ({ domain, state: 'COMPLETE' })),
  }));
  return { input, output };
}

function run(input, output) {
  return spawnSync(process.execPath, [script, '--input', input, '--output', output, '--sha', sha], { encoding: 'utf8' });
}

test('closes only when all exact-SHA controls are complete and independently reviewed', () => {
  const { input, output } = fixture();
  const result = run(input, output);
  assert.equal(result.status, 0, result.stderr);
  const packet = JSON.parse(readFileSync(path.join(output, 'enterprise-final-closeout.json'), 'utf8'));
  assert.equal(packet.status, 'CLOSED');
  assert.equal(packet.enterpriseGo, true);
  assert.equal(packet.totalDomains, 10);
});

test('fails closed when one evidence record is self-reviewed', () => {
  const { input, output } = fixture();
  const file = path.join(input, 'enterprise-evidence-intake.json');
  const data = JSON.parse(readFileSync(file, 'utf8'));
  data.domains[0].reviewer = data.domains[0].owner;
  writeFileSync(file, JSON.stringify(data));
  const result = run(input, output);
  assert.notEqual(result.status, 0);
});

test('fails closed when authoritative decision is NO_GO', () => {
  const { input, output } = fixture();
  const file = path.join(input, 'enterprise-final-decision.json');
  const data = JSON.parse(readFileSync(file, 'utf8'));
  data.decision = 'ENTERPRISE_NO_GO';
  data.enterpriseGoGrantedByThisArtifact = false;
  writeFileSync(file, JSON.stringify(data));
  const result = run(input, output);
  assert.notEqual(result.status, 0);
});

test('fails closed on duplicate evidence digests', () => {
  const { input, output } = fixture();
  const file = path.join(input, 'enterprise-evidence-intake.json');
  const data = JSON.parse(readFileSync(file, 'utf8'));
  data.domains[1].evidenceDigest = data.domains[0].evidenceDigest;
  writeFileSync(file, JSON.stringify(data));
  const result = run(input, output);
  assert.notEqual(result.status, 0);
});
