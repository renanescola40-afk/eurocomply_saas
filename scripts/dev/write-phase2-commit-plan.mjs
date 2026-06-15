#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const reportPath = 'phase2-cicd-report.json';
const planPath = 'phase2-commit-plan.json';

const filesToCommit = [
  '.github/workflows/ci.yml',
  'docs/PHASE2_CICD_FOUNDATION.md',
  'scripts/dev/check-phase2-cicd-foundation.mjs',
  'scripts/dev/check-phase2-commit-plan.mjs',
  'scripts/dev/check-phase2-docs.mjs',
  'scripts/dev/check-phase2-gitignore.mjs',
  'scripts/dev/check-phase2-package-scripts.mjs',
  'scripts/dev/check-phase2-script-files.mjs',
  'scripts/dev/ensure-phase2-ci-workflow.mjs',
  'scripts/dev/ensure-phase2-gitignore.mjs',
  'scripts/dev/run-phase2-complete.mjs',
  'scripts/dev/run-phase2-finalize.mjs',
  'scripts/dev/run-phase2-strict.mjs',
  'scripts/dev/write-phase2-commit-plan.mjs',
  'scripts/dev/write-phase2-final-report.mjs',
];

const blockers = [];
let cicdReport = null;

if (!existsSync(reportPath)) {
  blockers.push(`${reportPath} is missing`);
} else {
  cicdReport = JSON.parse(readFileSync(reportPath, 'utf8'));
  if (!cicdReport.success) {
    blockers.push(`${reportPath} does not report success`);
  }
}

const missingFiles = filesToCommit.filter((file) => !existsSync(file));
for (const file of missingFiles) {
  blockers.push(`${file} is missing`);
}

const readyToCommit = blockers.length === 0;

const plan = {
  generatedAt: new Date().toISOString(),
  readyToCommit,
  blockers,
  filesToCommit,
  cicdReportSummary: cicdReport
    ? {
        workflowPath: cicdReport.workflowPath,
        workflowExists: cicdReport.workflowExists,
        success: cicdReport.success,
        missing: cicdReport.missing ?? [],
        forbidden: cicdReport.forbidden ?? [],
      }
    : null,
  suggestedCommands: readyToCommit
    ? [
        `git add ${filesToCommit.join(' ')}`,
        'git commit -m "Complete phase 2 CI/CD foundation"',
      ]
    : [
        'node scripts/dev/run-phase2-finalize.mjs',
        `cat ${reportPath}`,
      ],
};

writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);

if (!readyToCommit) {
  console.error(`Phase 2 commit plan is not ready. See ${planPath}`);
  for (const blocker of blockers) {
    console.error(`- ${blocker}`);
  }
  process.exit(1);
}

console.log(`Phase 2 commit plan ready. See ${planPath}`);
