#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const checks = new Map([
  ['docs/PHASE6_SCOPE.md', ['Read-only organization workflow readiness reporting']],
  ['docs/PHASE6_INVENTORY.md', ['Read-only organization workflow readiness reporting', 'src/server/queries/organization-dashboard.ts']],
  ['docs/PHASE6_VALIDATION_PLAN.md', ['reporting surface remains read-only', 'Existing dashboard consumers continue to receive the readiness signal']],
  ['src/server/queries/organization-dashboard.ts', ['OrganizationWorkflowReadiness', 'workflowReadiness', 'getOrganizationWorkflowReadiness']],
  ['src/app/[locale]/dashboard/organizations/page.tsx', ['workflowReadiness={data.workflowReadiness}']],
  ['src/components/dashboard/dashboard-home-overview.tsx', ['WorkflowReadinessSummary', 'workflowReadiness?: OrganizationWorkflowReadiness', 'workflowReadiness={workflowReadiness}']],
  ['src/components/dashboard/workflow-readiness-summary.tsx', ['WorkflowReadinessSummary', 'Read-only reporting snapshot', 'workflowReadiness?.reasons', 'Readiness healthy']],
  ['src/components/dashboard/next-best-actions.tsx', ['buildWorkflowReadinessAction', 'current workflow readiness']],
  ['tests/phase5/dashboard-invariants.test.ts', ['workflowReadiness={data.workflowReadiness}', 'buildWorkflowReadinessAction']],
]);

const failures = [];

for (const [file, phrases] of checks) {
  if (!existsSync(file)) {
    failures.push(`${file} is missing`);
    continue;
  }

  const content = readFileSync(file, 'utf8');
  for (const phrase of phrases) {
    if (!content.includes(phrase)) failures.push(`${file} is missing: ${phrase}`);
  }
}

if (failures.length > 0) {
  console.error('Phase 6 readiness surface check failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Phase 6 readiness surface check passed.');
