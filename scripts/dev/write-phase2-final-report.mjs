#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const cicdReportPath = 'phase2-cicd-report.json';
const finalReportPath = 'phase2-final-report.txt';

const lines = [];
lines.push('Phase 2 CI/CD Foundation Final Report');
lines.push('========================================');
lines.push(`Generated at: ${new Date().toISOString()}`);
lines.push('');

if (!existsSync(cicdReportPath)) {
  lines.push(`Missing ${cicdReportPath}.`);
  lines.push('Run: node scripts/dev/check-phase2-cicd-foundation.mjs');
  writeFileSync(finalReportPath, `${lines.join('\n')}\n`);
  console.error(`${finalReportPath} written with missing CI/CD report status.`);
  process.exit(1);
}

const report = JSON.parse(readFileSync(cicdReportPath, 'utf8'));

lines.push(`Workflow path: ${report.workflowPath}`);
lines.push(`Workflow exists: ${report.workflowExists ? 'yes' : 'no'}`);
lines.push(`CI/CD foundation success: ${report.success ? 'yes' : 'no'}`);
lines.push('');

if (report.missing?.length > 0) {
  lines.push('Missing required snippets:');
  for (const item of report.missing) {
    lines.push(`- ${item}`);
  }
  lines.push('');
}

if (report.forbidden?.length > 0) {
  lines.push('Forbidden snippets found:');
  for (const item of report.forbidden) {
    lines.push(`- ${item}`);
  }
  lines.push('');
}

if (report.success) {
  lines.push('Next action: run the GitHub Actions workflow and confirm the first real CI pass.');
} else {
  lines.push('Next action: update .github/workflows/ci.yml until this report shows success.');
}

writeFileSync(finalReportPath, `${lines.join('\n')}\n`);
console.log(`${finalReportPath} written.`);
