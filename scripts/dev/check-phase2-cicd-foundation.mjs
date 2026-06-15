#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const workflowPath = '.github/workflows/ci.yml';
const reportPath = 'phase2-cicd-report.json';
const startedAt = new Date().toISOString();

const report = {
  startedAt,
  finishedAt: null,
  workflowPath,
  workflowExists: false,
  requiredSnippets: [],
  forbiddenSnippets: [],
  missing: [],
  forbidden: [],
  success: false,
};

function finish(success) {
  report.finishedAt = new Date().toISOString();
  report.success = success;
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (!existsSync(workflowPath)) {
  report.missing.push(workflowPath);
  finish(false);
  console.error(`Missing CI workflow: ${workflowPath}`);
  process.exit(1);
}

report.workflowExists = true;
const content = readFileSync(workflowPath, 'utf8');

const requiredSnippets = [
  'pull_request:',
  'push:',
  'main',
  'node-version: 20',
  'npm ci',
  'npm run typecheck',
  'npm run test',
  'npm run build',
];

const forbiddenSnippets = [
  'npm install',
];

report.requiredSnippets = requiredSnippets;
report.forbiddenSnippets = forbiddenSnippets;
report.missing = requiredSnippets.filter((snippet) => !content.includes(snippet));
report.forbidden = forbiddenSnippets.filter((snippet) => content.includes(snippet));

if (report.missing.length > 0 || report.forbidden.length > 0) {
  finish(false);
  console.error('CI workflow does not satisfy Phase 2 requirements.');

  if (report.missing.length > 0) {
    console.error('\nMissing required snippets:');
    for (const snippet of report.missing) {
      console.error(`- ${snippet}`);
    }
  }

  if (report.forbidden.length > 0) {
    console.error('\nForbidden snippets found:');
    for (const snippet of report.forbidden) {
      console.error(`- ${snippet}`);
    }
  }

  console.error(`\nReport written to ${reportPath}`);
  process.exit(1);
}

finish(true);
console.log(`Phase 2 CI/CD foundation check passed. Report written to ${reportPath}`);
