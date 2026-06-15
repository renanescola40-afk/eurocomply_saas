#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const checks = [
  {
    file: 'docs/PHASE11_KICKOFF.md',
    required: [
      'Phase 11 Kickoff',
      'Phase 11 starts after the Phase 10 repository-side audit package review surface',
      'npm run phase9:verify',
      'npm run phase10:review',
      'npm run phase10:verify',
      'evidence handoff review',
      'organization readiness reporting',
      'audit review surface',
    ],
  },
  {
    file: 'docs/PHASE11_SCOPE.md',
    required: [
      'Phase 11 Scope',
      'Evidence handoff review',
      'npm run phase10:verify',
      'node scripts/dev/run-phase11-checks.mjs',
      'read-only handoff review touchpoints',
    ],
  },
  {
    file: 'docs/PHASE11_INVENTORY.md',
    required: [
      'Phase 11 Inventory',
      'Evidence handoff review',
      'src/components/dashboard/audit-package-review.tsx',
      'src/components/dashboard/readiness-export-preparation.tsx',
      'src/components/dashboard/executive-reporting-package.tsx',
      'src/components/dashboard/workflow-readiness-summary.tsx',
      'src/components/dashboard/readiness-follow-up-plan.tsx',
      'src/components/dashboard/dashboard-home-overview.tsx',
      'src/server/queries/organization-dashboard.ts',
      'Audit package review surface',
      'Readiness export preparation surface',
      'Executive reporting package snapshot',
      'Read-only readiness summary',
      'Read-only follow-up plan',
      'Reports navigation entrypoint',
      'workflowReadiness',
      'npm run phase10:verify',
      'node scripts/dev/run-phase11-checks.mjs',
    ],
  },
  {
    file: 'docs/PHASE11_VALIDATION_PLAN.md',
    required: [
      'Phase 11 Validation Plan',
      'Evidence handoff review',
      'src/components/dashboard/audit-package-review.tsx',
      'src/components/dashboard/readiness-export-preparation.tsx',
      'src/components/dashboard/executive-reporting-package.tsx',
      'src/components/dashboard/workflow-readiness-summary.tsx',
      'src/components/dashboard/readiness-follow-up-plan.tsx',
      'src/components/dashboard/dashboard-home-overview.tsx',
      'src/server/queries/organization-dashboard.ts',
      'Evidence handoff review remains based on the existing organization readiness signal',
      'Evidence handoff review remains read-only',
      'Audit package review remains available as the handoff review entry surface',
      'Reports navigation remains the safe handoff entrypoint',
      'No product, email, document, or UI template changes are required',
      'npm run phase10:verify',
      'node scripts/dev/run-phase11-checks.mjs',
      'npm run test',
    ],
  },
];

for (const { file, required } of checks) {
  if (!existsSync(file)) {
    console.error(`${file} is missing`);
    process.exit(1);
  }

  const content = readFileSync(file, 'utf8');
  const missing = required.filter((item) => !content.includes(item));

  if (missing.length > 0) {
    console.error(`Phase 11 checks failed for ${file}.`);
    for (const item of missing) console.error(`- ${item}`);
    process.exit(1);
  }
}

console.log('Phase 11 checks completed.');
