import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const script = path.resolve('scripts/release/build-enterprise-owner-execution-packets.mjs');
const sha = 'a'.repeat(40);

function writeQueue(dir, overrides = {}) {
  const queue = {
    sha,
    items: [
      {
        domain: 'repository_gates',
        state: 'COMPLETE',
        owner: 'Release Engineering',
      },
      {
        domain: 'runtime_closeout',
        state: 'EXECUTION_REQUIRED',
        owner: 'SRE',
        requiredAction: 'Run the protected runtime closeout workflow.',
        requiredEvidence: ['Accepted runtime closeout artifact'],
      },
      {
        domain: 'qualified_legal_reviews',
        state: 'OWNER_ACTION_REQUIRED',
        owner: 'Legal',
        requiredAction: 'Obtain qualified independent reviews.',
        requiredEvidence: ['Accepted qualified-review bundle'],
      },
    ],
    ...overrides,
  };
  const input = path.join(dir, 'queue.json');
  fs.writeFileSync(input, `${JSON.stringify(queue, null, 2)}\n`);
  return input;
}

test('builds packets without granting Enterprise GO', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'owner-packets-'));
  const input = writeQueue(dir);
  const output = path.join(dir, 'out');
  execFileSync(process.execPath, [script, `--input=${input}`, `--output=${output}`, `--sha=${sha}`]);

  const summary = JSON.parse(fs.readFileSync(path.join(output, 'summary.json'), 'utf8'));
  assert.equal(summary.totalPackets, 3);
  assert.equal(summary.completePackets, 1);
  assert.equal(summary.percentComplete, 33);
  assert.equal(summary.enterpriseGoGrantedByThisArtifact, false);

  const legal = JSON.parse(fs.readFileSync(path.join(output, 'qualified_legal_reviews.json'), 'utf8'));
  assert.equal(legal.independentReviewerRequired, true);
  assert.equal(legal.completion.completed, false);
  assert.match(legal.packetId, /qualified_legal_reviews$/);
});

test('fails closed for stale SHA', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'owner-packets-stale-'));
  const input = writeQueue(dir, { sha: 'b'.repeat(40) });
  const result = spawnSync(process.execPath, [script, `--input=${input}`, `--output=${path.join(dir, 'out')}`, `--sha=${sha}`], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not match expected SHA/);
});

test('fails closed when pending control has no evidence requirement', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'owner-packets-evidence-'));
  const input = writeQueue(dir, {
    items: [{
      domain: 'runtime_closeout',
      state: 'EXECUTION_REQUIRED',
      owner: 'SRE',
      requiredAction: 'Run workflow',
      requiredEvidence: [],
    }],
  });
  const result = spawnSync(process.execPath, [script, `--input=${input}`, `--output=${path.join(dir, 'out')}`, `--sha=${sha}`], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires explicit evidence/);
});
