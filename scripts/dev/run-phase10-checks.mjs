#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const checks = [
  {
    file: 'docs/PHASE10_KICKOFF.md',
    required: [
      'Phase 10 Kickoff',
      'Phase 10 starts after the Phase 9 repository-side readiness export preparation surface',
      'npm run phase8:verify',
      'npm run phase9:review',
      'npm run phase9:verify',
      'review package preparation',
      'organization readiness reporting',
      'export preparation surface',
    ],
  },
  {
    file: 'docs/PHASE10_SCOPE.md',
    required: [
      'Phase 10 Scope',
      'audit package review workflow around organization readiness reporting',
      'npm run phase9:verify',
      'npm run phase10:check',
      'Audit package review',
      'readiness export preparation to audit package review needs',
      'read-only audit review touchpoints',
      'Add validation artifacts before additional runtime changes',
      'Add tests or static checks for audit review wiring',
    ],
  },
  {
    file: 'docs/PHASE10_INVENTORY.md',
    required: [
      'Phase 10 Inventory',
      'Audit package review',
      'src/components/dashboard/readiness-export-preparation.tsx',
      'src/components/dashboard/executive-reporting-package.tsx',
      'src/components/dashboard/workflow-readiness-summary.tsx',
      'src/components/dashboard/readiness-follow-up-plan.tsx',
      'src/components/dashboard/dashboard-home-overview.tsx',
      'src/server/queries/organization-dashboard.ts',
      'Readiness export preparation surface',
      'Executive reporting package snapshot',
      'Read-only readiness summary',
      'Read-only follow-up plan',
      'Reports navigation entrypoint',
      'workflowReadiness',
      'docs/PHASE10_INVENTORY.md',
      'docs/PHASE10_VALIDATION_PLAN.md',
      'tests/phase10/audit-package-review.test.ts',
      'npm run phase9:verify',
      'npm run phase10:check',
      'npm run test',
    ],
  },
  {
    file: 'docs/PHASE10_VALIDATION_PLAN.md',
    required: [
      'Phase 10 Validation Plan',
      'Audit package review',
      'src/components/dashboard/readiness-export-preparation.tsx',
      'src/components/dashboard/executive-reporting-package.tsx',
      'src/components/dashboard/workflow-readiness-summary.tsx',
      'src/components/dashboard/readiness-follow-up-plan.tsx',
      'src/components/dashboard/dashboard-home-overview.tsx',
      'src/server/queries/organization-dashboard.ts',
      'Audit package review remains based on the existing organization readiness signal',
      'Audit package review remains read-only',
      'Readiness export preparation remains available as the audit review entry surface',
      'Executive reporting package remains available as a supporting package surface',
      'Readiness summary and follow-up plan remain available as supporting surfaces',
      'Reports navigation remains the safe review entrypoint',
      'No product, email, document, or UI template changes are required',
      'npm run phase9:verify',
      'npm run phase10:check',
      'npm run test',
    ],
  },
  {
    file: 'tests/phase10/audit-package-review.test.ts',
    required: [
      'Phase 10 audit package review',
      'Audit package review',
      'Readiness export preparation',
      'Prepare from reports',
      'Executive reporting package',
      'Read-only reporting snapshot',
      'Follow-up planning',
      'readiness-export-preparation',
      'Audit package review remains read-only',
      'Reports navigation remains the safe review entrypoint',
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
    console.error(`Phase 10 checks failed for ${file}.`);
    for (const item of missing) console.error(`- ${item}`);
    process.exit(1);
  }
}

console.log('Phase 10 checks completed.');
