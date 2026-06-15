#!/usr/bin/env node

const minimumMajor = 20;
const current = process.versions.node;
const currentMajor = Number(current.split('.')[0]);

if (!Number.isFinite(currentMajor)) {
  console.error(`Unable to parse Node.js version: ${current}`);
  process.exit(1);
}

if (currentMajor < minimumMajor) {
  console.error(`Node.js ${minimumMajor}+ is required for Phase 1. Found ${current}.`);
  console.error('Install or activate a compatible Node.js runtime before running the local foundation checks.');
  process.exit(1);
}

console.log(`Node.js runtime check passed: ${current}`);
