#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const sha = 'a'.repeat(40);
const files = [
  'enterprise-final-closeout.json',
  'enterprise-runtime-closeout.json',
  'supabase-production-migration-attestation.json',
  'supabase-live-rls-validation.json',
  'backup-restore-tested.json',
  'stripe-production-validation.json',
  'observability-production-validation.json',
  'external-security-review.json',
  'qualified-legal-review.json',
  'enterprise-final-approvals.json',
];

async function fixture(mutator) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'final-closeout-'));
  const evidence = path.join(root, 'evidence');
  const output = path.join(root, 'output');
  await mkdir(evidence, { recursive: true });
  for (const [index, file] of files.entries()) {
    const value = { status: 'Complete', outcome: 'passed', commitSha: sha, owner: `owner-${index}`, reviewer: `reviewer-${index}`, proof: `proof-${index}` };
    await writeFile(path.join(evidence, file), JSON.stringify(value));
  }
  await mutator?.(evidence);
  const run = spawnSync(process.execPath, ['scripts/release/compile-conversation-final-closeout.mjs', sha, evidence, output], { encoding: 'utf8' });
  const result = JSON.parse(await readFile(path.join(output, 'conversation-final-closeout.json'), 'utf8'));
  return { run, result };
}

let test = await fixture();
assert.equal(test.run.status, 0);
assert.equal(test.result.status, 'CLOSED');
assert.equal(test.result.enterpriseGo, true);

test = await fixture(async (dir) => { await writeFile(path.join(dir, files[0]), JSON.stringify({ status: 'Complete', outcome: 'passed', commitSha: 'b'.repeat(40), owner: 'a', reviewer: 'b' })); });
assert.notEqual(test.run.status, 0);
assert.equal(test.result.status, 'BLOCKED');
assert(test.result.blockers.some((item) => item.code === 'SHA_MISMATCH'));

test = await fixture(async (dir) => { await writeFile(path.join(dir, files[1]), JSON.stringify({ status: 'Complete', outcome: 'passed', commitSha: sha, owner: 'same', reviewer: 'same' })); });
assert(test.result.blockers.some((item) => item.code === 'SELF_REVIEWED'));

test = await fixture(async (dir) => { await writeFile(path.join(dir, files[2]), JSON.stringify({ status: 'Complete', outcome: 'passed', commitSha: sha, synthetic: true, owner: 'a', reviewer: 'b' })); });
assert(test.result.blockers.some((item) => item.code === 'NON_REAL_EVIDENCE'));

process.stdout.write('conversation final closeout tests passed\n');
