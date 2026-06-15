#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const planPath = process.argv[2] ?? 'phase1-commit-plan.json';

if (!existsSync(planPath)) {
  console.error(`Commit plan not found: ${planPath}`);
  console.error('Run node scripts/dev/write-phase1-commit-plan.mjs first.');
  process.exit(1);
}

const plan = JSON.parse(readFileSync(planPath, 'utf8'));

if (!plan.readyToCommit) {
  console.error('Phase 1 is not ready to commit.');
  for (const blocker of plan.blockers ?? []) {
    console.error(`- ${blocker}`);
  }
  process.exit(1);
}

const files = Array.isArray(plan.filesToCommit) ? plan.filesToCommit : [];

if (!files.includes('package.json')) {
  console.error('package.json is missing from filesToCommit.');
  process.exit(1);
}

if (!files.includes('package-lock.json')) {
  console.error('package-lock.json is missing from filesToCommit.');
  process.exit(1);
}

console.log('Phase 1 commit plan is ready.');
console.log(`Files to commit: ${files.join(', ')}`);
