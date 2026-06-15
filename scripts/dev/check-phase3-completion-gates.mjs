#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const reportPath = 'phase3-completion-gates-report.json';

const requiredDocs = [
  'docs/PHASE3_PRODUCTION_READINESS.md',
  'docs/PHASE3_DEPLOYMENT_RUNBOOK.md',
  'docs/PHASE3_DATABASE_MIGRATION_SAFETY.md',
  'docs/PHASE3_RUNTIME_SECURITY_OBSERVABILITY.md',
  'docs/PHASE3_AUTH_SESSION_READINESS.md',
  'docs/PHASE3_COMPLETION_GATES.md',
];

const requiredScripts = [
  'scripts/dev/check-phase3-script-files.mjs',
  'scripts/dev/check-phase3-production-readiness.mjs',
  'scripts/dev/check-phase3-runtime-readiness.mjs',
  'scripts/dev/check-phase3-auth-session-readiness.mjs',
  'scripts/dev/check-phase3-completion-gates.mjs',
  'scripts/dev/run-phase3-strict.mjs',
];

const requiredRunnerCalls = [
  'scripts/dev/check-phase3-script-files.mjs',
  'scripts/dev/check-phase3-runtime-readiness.mjs',
  'scripts/dev/check-phase3-auth-session-readiness.mjs',
  'scripts/dev/check-phase3-production-readiness.mjs',
  'scripts/dev/check-phase3-completion-gates.mjs',
];

const requiredGitignoreEntries = [
  'phase3-production-readiness-report.json',
  'phase3-runtime-readiness-report.json',
  'phase3-auth-session-readiness-report.json',
  'phase3-completion-gates-report.json',
];

const requiredCompletionPhrases = [
  'This document does not authorize product, email, document, or UI template changes.',
  'Required documentation gates',
  'Required automation gates',
  'Required strict runner gates',
  'Required generated report hygiene',
  'Required external gates',
  'implementation-complete but not production-complete',
];

const blockers = [];

for (const path of [...requiredDocs, ...requiredScripts]) {
  if (!existsSync(path)) {
    blockers.push(`${path} is missing`);
  }
}

if (existsSync('scripts/dev/run-phase3-strict.mjs')) {
  const strictRunner = readFileSync('scripts/dev/run-phase3-strict.mjs', 'utf8');
  for (const call of requiredRunnerCalls) {
    if (!strictRunner.includes(call)) {
      blockers.push(`run-phase3-strict.mjs does not execute ${call}`);
    }
  }
}

if (existsSync('.gitignore')) {
  const gitignore = readFileSync('.gitignore', 'utf8');
  for (const entry of requiredGitignoreEntries) {
    if (!gitignore.includes(entry)) {
      blockers.push(`.gitignore is missing ${entry}`);
    }
  }
} else {
  blockers.push('.gitignore is missing');
}

if (existsSync('docs/PHASE3_COMPLETION_GATES.md')) {
  const completionDoc = readFileSync('docs/PHASE3_COMPLETION_GATES.md', 'utf8');
  for (const phrase of requiredCompletionPhrases) {
    if (!completionDoc.includes(phrase)) {
      blockers.push(`docs/PHASE3_COMPLETION_GATES.md is missing required phrase: ${phrase}`);
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  success: blockers.length === 0,
  requiredDocs,
  requiredScripts,
  requiredRunnerCalls,
  requiredGitignoreEntries,
  requiredCompletionPhrases,
  externalGates: [
    'Production secrets configured outside the repository',
    'Deployment target configured with production environment variables',
    'Supabase production migrations reviewed and applied in order',
    'Stripe live products, prices, and webhook endpoint configured',
    'Sentry production project configured when observability is enabled',
    'npm run phase3:strict passes locally or in CI',
  ],
  blockers,
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (blockers.length > 0) {
  console.error('Phase 3 completion gates check failed.');
  for (const blocker of blockers) {
    console.error(`- ${blocker}`);
  }
  console.error(`\nReport written to ${reportPath}`);
  process.exit(1);
}

console.log(`Phase 3 completion gates check passed. Report written to ${reportPath}`);
