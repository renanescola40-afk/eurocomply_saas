#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const gitignore = existsSync('.gitignore') ? readFileSync('.gitignore', 'utf8') : '';
const ignoredPatterns = gitignore
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

const lockfile = 'package-lock.json';
const lockfileIgnored = ignoredPatterns.includes(lockfile) || ignoredPatterns.includes('*.lock');

if (lockfileIgnored) {
  console.error('package-lock.json appears to be ignored. It must be committed for Phase 1.');
  process.exit(1);
}

if (!existsSync(lockfile)) {
  console.error('package-lock.json is missing. Run node scripts/dev/run-phase1.mjs first.');
  process.exit(1);
}

console.log('package-lock.json is present and not ignored.');
