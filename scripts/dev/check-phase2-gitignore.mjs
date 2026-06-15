#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const gitignorePath = '.gitignore';
const requiredEntries = [
  'phase2-cicd-report.json',
  'phase2-final-report.txt',
];

if (!existsSync(gitignorePath)) {
  console.error(`Missing ${gitignorePath}`);
  process.exit(1);
}

const entries = readFileSync(gitignorePath, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const missing = requiredEntries.filter((entry) => !entries.includes(entry));

if (missing.length > 0) {
  console.error('Phase 2 local report files are not ignored by Git:');
  for (const entry of missing) {
    console.error(`- ${entry}`);
  }
  console.error('\nAdd the missing entries to .gitignore before completing Phase 2.');
  process.exit(1);
}

console.log('Phase 2 .gitignore hygiene passed.');
