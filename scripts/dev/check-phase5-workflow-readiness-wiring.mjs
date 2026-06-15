#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const checks = new Map([
  ['src/server/queries/organization-dashboard.ts', ['OrganizationWorkflowReadiness', 'workflowReadiness', 'getOrganizationWorkflowReadiness']],
  ['src/app/[locale]/dashboard/organizations/page.tsx', ['workflowReadiness={data.workflowReadiness}']],
  ['src/components/dashboard/dashboard-home-overview.tsx', ['workflowReadiness?: OrganizationWorkflowReadiness', 'workflowReadiness={workflowReadiness}']],
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
  console.error('Phase 5 workflow readiness wiring check failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Phase 5 workflow readiness wiring check passed.');
