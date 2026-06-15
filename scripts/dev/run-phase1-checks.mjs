#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const gateFile = 'docs/PHASE1_EXECUTION_GATE.md';
const evidenceFile = 'docs/evidence/phase1/README.md';
const lockFile = 'package-lock.json';

function requireFile(path) {
  if (!existsSync(path)) {
    console.error(`${path} is missing`);
    process.exit(1);
  }

  return readFileSync(path, 'utf8');
}

const gate = requireFile(gateFile);
const evidence = requireFile(evidenceFile);

const requiredGateItems = [
  'npm install --package-lock-only --ignore-scripts',
  'npm ci',
  'npm run typecheck',
  'npm run test',
  'npm run build',
  'npm run lint',
  'package-lock.json',
];

const requiredEvidenceItems = [
  'package-lock.json',
  'npm ci',
  'npm run typecheck',
  'npm run test',
  'npm run build',
  'npm run lint',
  'local startup smoke',
];

const missingGate = requiredGateItems.filter((item) => !gate.includes(item));
const missingEvidence = requiredEvidenceItems.filter((item) => !evidence.includes(item));

if (missingGate.length > 0) {
  console.error('Phase 1 gate is incomplete.');
  for (const item of missingGate) console.error(`- ${item}`);
  process.exit(1);
}

if (missingEvidence.length > 0) {
  console.error('Phase 1 evidence index is incomplete.');
  for (const item of missingEvidence) console.error(`- ${item}`);
  process.exit(1);
}

if (!existsSync(lockFile)) {
  console.error(`${lockFile} is missing. Run npm install --package-lock-only --ignore-scripts and commit the generated lockfile.`);
  process.exit(1);
}

console.log('Phase 1 checks completed.');
