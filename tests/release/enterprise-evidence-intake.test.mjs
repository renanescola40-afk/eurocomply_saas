import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const script = path.resolve('scripts/release/validate-enterprise-evidence-intake.mjs');
const sha = 'a'.repeat(40);
const domains = [
  'repository-gates','runtime-closeout','migration-post-execution','branch-protection','backup-restore',
  'external-security-review','qualified-legal-reviews','release-approval','security-approval','operations-approval',
];

function packet(domain, index) {
  return {
    domain,
    releaseSha: sha,
    status: 'COMPLETE',
    outcome: 'passed',
    owner: { id: `owner-${index}` },
    reviewer: { id: `reviewer-${index}` },
    reviewedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 86400000).toISOString(),
    evidence: { domain, nonce: index },
    provenance: { workflowRunId: 1000 + index, workflowUrl: `https://github.com/example/repo/actions/runs/${1000 + index}` },
  };
}

async function run(intake) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'enterprise-intake-'));
  const input = path.join(dir, 'input.json');
  const output = path.join(dir, 'output.json');
  await writeFile(input, JSON.stringify(intake));
  const result = spawnSync(process.execPath, [script, input, output], {
    env: { ...process.env, EXPECTED_RELEASE_SHA: sha },
    encoding: 'utf8',
  });
  return { result, output: JSON.parse(await readFile(output, 'utf8')) };
}

test('accepts complete exact-SHA independently reviewed evidence', async () => {
  const { result, output } = await run({ releaseSha: sha, packets: domains.map(packet) });
  assert.equal(result.status, 0);
  assert.equal(output.accepted, true);
  assert.equal(output.enterpriseGoGrantedByThisArtifact, false);
});

test('rejects stale SHA', async () => {
  const packets = domains.map(packet);
  packets[0].releaseSha = 'b'.repeat(40);
  const { result, output } = await run({ releaseSha: sha, packets });
  assert.notEqual(result.status, 0);
  assert.equal(output.accepted, false);
  assert.match(output.errors.join('\n'), /stale or mismatched/);
});

test('rejects owner self-review', async () => {
  const packets = domains.map(packet);
  packets[5].reviewer.id = packets[5].owner.id;
  const { result, output } = await run({ releaseSha: sha, packets });
  assert.notEqual(result.status, 0);
  assert.match(output.errors.join('\n'), /independent reviewer/);
});

test('rejects copied evidence', async () => {
  const packets = domains.map(packet);
  packets[1].evidence = packets[0].evidence;
  const { result, output } = await run({ releaseSha: sha, packets });
  assert.notEqual(result.status, 0);
  assert.match(output.errors.join('\n'), /duplicate evidence digest/);
});
