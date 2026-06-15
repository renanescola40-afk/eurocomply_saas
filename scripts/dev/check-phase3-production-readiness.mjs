#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const reportPath = 'phase3-production-readiness-report.json';
const requiredFiles = [
  'docs/PHASE3_PRODUCTION_READINESS.md',
  '.env.example',
  'package.json',
];

const requiredEnvHints = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
];

const blockers = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    blockers.push(`${file} is missing`);
  }
}

if (existsSync('.env.example')) {
  const envExample = readFileSync('.env.example', 'utf8');
  for (const key of requiredEnvHints) {
    if (!envExample.includes(key)) {
      blockers.push(`.env.example is missing ${key}`);
    }
  }
}

if (existsSync('.env')) {
  blockers.push('.env exists locally; confirm it is not committed and contains no production secrets');
}

const report = {
  generatedAt: new Date().toISOString(),
  success: blockers.length === 0,
  requiredFiles,
  requiredEnvHints,
  blockers,
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (blockers.length > 0) {
  console.error('Phase 3 production readiness check failed.');
  for (const blocker of blockers) {
    console.error(`- ${blocker}`);
  }
  console.error(`\nReport written to ${reportPath}`);
  process.exit(1);
}

console.log(`Phase 3 production readiness check passed. Report written to ${reportPath}`);
