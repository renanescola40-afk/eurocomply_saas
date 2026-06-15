#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const reportPath = 'phase3-auth-session-readiness-report.json';

const requiredFiles = [
  'docs/PHASE3_AUTH_SESSION_READINESS.md',
  'package.json',
  'scripts/dev/run-phase3-strict.mjs',
];

const requiredDependencies = [
  '@supabase/ssr',
  '@supabase/supabase-js',
  'stripe',
  'zod',
];

const requiredDocPhrases = [
  'Required auth readiness checks',
  'Required protected route posture',
  'Tenant isolation posture',
  'Privileged method controls',
  'Prohibited auth patterns',
  'It does not authorize template',
];

const requiredStrictRunnerPhrases = [
  'scripts/dev/check-phase3-auth-session-readiness.mjs',
];

const blockers = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    blockers.push(`${file} is missing`);
  }
}

if (existsSync('package.json')) {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const dependencies = packageJson.dependencies ?? {};
  const devDependencies = packageJson.devDependencies ?? {};
  const allDependencies = { ...dependencies, ...devDependencies };

  for (const dependencyName of requiredDependencies) {
    if (typeof allDependencies[dependencyName] !== 'string') {
      blockers.push(`package.json is missing auth/session dependency: ${dependencyName}`);
    }
  }
}

if (existsSync('docs/PHASE3_AUTH_SESSION_READINESS.md')) {
  const authDoc = readFileSync('docs/PHASE3_AUTH_SESSION_READINESS.md', 'utf8');
  for (const phrase of requiredDocPhrases) {
    if (!authDoc.includes(phrase)) {
      blockers.push(`docs/PHASE3_AUTH_SESSION_READINESS.md is missing required phrase: ${phrase}`);
    }
  }
}

if (existsSync('scripts/dev/run-phase3-strict.mjs')) {
  const strictRunner = readFileSync('scripts/dev/run-phase3-strict.mjs', 'utf8');
  for (const phrase of requiredStrictRunnerPhrases) {
    if (!strictRunner.includes(phrase)) {
      blockers.push(`run-phase3-strict.mjs is missing required phrase: ${phrase}`);
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  success: blockers.length === 0,
  requiredFiles,
  requiredDependencies,
  requiredDocPhrases,
  requiredStrictRunnerPhrases,
  blockers,
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (blockers.length > 0) {
  console.error('Phase 3 auth/session readiness check failed.');
  for (const blocker of blockers) {
    console.error(`- ${blocker}`);
  }
  console.error(`\nReport written to ${reportPath}`);
  process.exit(1);
}

console.log(`Phase 3 auth/session readiness check passed. Report written to ${reportPath}`);
