#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'docs/PHASE1_EXECUTION_GATE.md',
  'docs/PHASE1_LOCAL_VALIDATION_RUNBOOK.md',
  'docs/PHASE1_EXECUTION_HANDOFF.md',
  'docs/PHASE1_REPO_SIDE_READINESS.md',
  'docs/PHASE1_DEPENDENCY_REMEDIATION.md',
  'docs/PHASE1_WARNING_TRIAGE.md',
  'docs/PHASE1_CLOSEOUT_CHECKLIST.md',
  'docs/PHASE1_CLOSEOUT_COMMAND.md',
  'docs/evidence/phase1/README.md',
  'docs/evidence/phase1/WARNING_EXCEPTIONS_TEMPLATE.md',
  'scripts/dev/capture-phase1-evidence.mjs',
  'scripts/dev/capture-phase1-smoke.mjs',
  'scripts/dev/check-phase1-evidence-status.mjs',
  'scripts/dev/check-phase1-repo-side-readiness.mjs',
  'scripts/dev/run-phase1-checks.mjs',
  'tests/phase1/local-base-validation.test.ts',
  'tests/phase1/evidence-status.test.ts',
  'tests/phase1/warning-triage.test.ts',
  'tests/phase1/warning-exceptions-template.test.ts',
  'tests/phase1/closeout-checklist.test.ts',
  'tests/phase1/closeout-command.test.ts',
  'tests/phase1/execution-handoff.test.ts',
  'tests/phase1/repo-side-readiness.test.ts',
  'tests/phase1/repo-ready-command.test.ts',
];

const requiredPackageScripts = [
  'phase1:check',
  'phase1:capture',
  'phase1:smoke',
  'phase1:evidence',
  'phase1:repo-ready',
  'phase1:closeout',
  'supply-chain:lockfile',
  'supply-chain:floating-deps',
];

const requiredDocs = [
  ['docs/PHASE1_REPO_SIDE_READINESS.md', 'repository-side ready, but not complete'],
  ['docs/PHASE1_EXECUTION_HANDOFF.md', 'real command output'],
  ['docs/PHASE1_CLOSEOUT_CHECKLIST.md', 'real committed evidence'],
  ['docs/PHASE1_WARNING_TRIAGE.md', 'Phase 1 cannot be marked complete'],
  ['docs/PHASE1_DEPENDENCY_REMEDIATION.md', 'Do not pin versions manually'],
];

const missingFiles = requiredFiles.filter((path) => !existsSync(path));
if (missingFiles.length > 0) {
  console.error('Missing Phase 1 repository-side files:');
  for (const path of missingFiles) console.error(`- ${path}`);
  process.exit(1);
}

const pkg = readFileSync('package.json', 'utf8');
const missingScripts = requiredPackageScripts.filter((script) => !pkg.includes(`"${script}"`));
if (missingScripts.length > 0) {
  console.error('Missing Phase 1 package scripts:');
  for (const script of missingScripts) console.error(`- ${script}`);
  process.exit(1);
}

const missingDocContent = requiredDocs.filter(([path, text]) => !readFileSync(path, 'utf8').includes(text));
if (missingDocContent.length > 0) {
  console.error('Missing required Phase 1 documentation text:');
  for (const [path, text] of missingDocContent) console.error(`- ${path}: ${text}`);
  process.exit(1);
}

console.log('Phase 1 repository-side readiness files are present.');
console.log('Runtime validation is still pending until package-lock.json and real evidence logs are generated.');
