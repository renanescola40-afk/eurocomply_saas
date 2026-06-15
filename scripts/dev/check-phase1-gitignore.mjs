#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const gitignore = readFileSync('.gitignore', 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const requiredIgnoredFiles = [
  'local-build-report.json',
  'local-quality-report.json',
  'phase1-status.json',
  'phase1-run-report.json',
  'phase1-summary.json',
  'phase1-commit-plan.json',
  'phase1-final-report.txt',
  'dependency-pin-report.json',
  'dependency-pin-change-report.json',
];

const missing = requiredIgnoredFiles.filter((file) => !gitignore.includes(file));

if (missing.length > 0) {
  console.error('Missing Phase 1 local reports in .gitignore:');
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log('Phase 1 .gitignore hygiene passed.');
