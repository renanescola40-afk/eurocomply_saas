#!/usr/bin/env node

import { existsSync } from 'node:fs';

const requiredRepositoryFiles = [
  'docs/PHASE3_PRODUCTION_READINESS.md',
  'docs/PHASE3_DEPLOYMENT_RUNBOOK.md',
  'docs/PHASE3_DATABASE_MIGRATION_SAFETY.md',
  'docs/PHASE3_RUNTIME_SECURITY_OBSERVABILITY.md',
  'docs/PHASE3_AUTH_SESSION_READINESS.md',
  'docs/PHASE3_COMPLETION_GATES.md',
  'docs/PHASE3_PROGRESS_STATUS.md',
  'scripts/dev/check-phase3-script-files.mjs',
  'scripts/dev/check-phase3-production-readiness.mjs',
  'scripts/dev/check-phase3-runtime-readiness.mjs',
  'scripts/dev/check-phase3-auth-session-readiness.mjs',
  'scripts/dev/check-phase3-completion-gates.mjs',
  'scripts/dev/check-phase3-progress-status.mjs',
  'scripts/dev/run-phase3-strict.mjs',
];

const missing = requiredRepositoryFiles.filter((path) => !existsSync(path));
const completed = requiredRepositoryFiles.length - missing.length;
const percent = Math.round((completed / requiredRepositoryFiles.length) * 100);

console.log(`Phase 3 repository progress: ${percent}% (${completed}/${requiredRepositoryFiles.length}).`);

if (missing.length > 0) {
  console.error('Missing Phase 3 progress files:');
  for (const path of missing) console.error(`- ${path}`);
  process.exit(1);
}

console.log('Phase 3 progress status check passed. External production gates still require manual confirmation.');
