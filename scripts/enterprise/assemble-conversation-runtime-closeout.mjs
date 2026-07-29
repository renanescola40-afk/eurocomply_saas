#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => { const [key, ...rest] = arg.replace(/^--/, '').split('='); return [key, rest.join('=')]; }));
const sha = args.sha || process.env.RELEASE_SHA;
const root = args.root || process.cwd();
const output = args.output || 'artifacts/enterprise-conversation-closeout.json';
if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('A full 40-character release SHA is required.');

const proofs = {
  stripeRuntime: 'stripe-runtime-evidence.json',
  enterpriseRuntime: 'enterprise-runtime-evidence.json',
  productionFinal: 'production-final-evidence.json',
  releaseGoNoGo: 'release-go-no-go-evidence.json',
};

const blockers = [];
const assessed = {};
for (const [name, filename] of Object.entries(proofs)) {
  const path = join(root, filename);
  if (!existsSync(path)) { blockers.push(`${name}:missing`); continue; }
  const raw = readFileSync(path, 'utf8');
  const evidence = JSON.parse(raw);
  const evidenceSha = evidence.commitSha || evidence.releaseSha || evidence.headSha || evidence.runtimeProof?.headSha;
  const status = evidence.status;
  const outcome = evidence.outcome || evidence.validationStatus || evidence.decision;
  const complete = status === 'Complete' && ['passed', 'Go', 'CONVERSATION_COMPLETE'].includes(outcome);
  if (evidenceSha !== sha) blockers.push(`${name}:sha_mismatch`);
  if (!complete) blockers.push(`${name}:not_complete`);
  assessed[name] = { status, outcome, shaMatches: evidenceSha === sha, digest: createHash('sha256').update(raw).digest('hex') };
}

const complete = blockers.length === 0;
const result = {
  schemaVersion: 1,
  id: 'enterprise-conversation-runtime-closeout',
  generatedAt: new Date().toISOString(),
  releaseSha: sha,
  status: complete ? 'Complete' : 'Open',
  decision: complete ? 'CONVERSATION_COMPLETE' : 'CONVERSATION_REMAINS_OPEN',
  completionPercentage: complete ? 100 : 96,
  blockers,
  assessed,
  truthBoundary: complete
    ? 'All mandatory runtime and human release proofs were observed for the exact release SHA.'
    : 'No completion claim is made while one or more exact-SHA proofs are missing or incomplete.',
};
const target = join(root, output);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (!complete) process.exitCode = 2;
