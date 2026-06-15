#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const checks = [
  {
    file: 'docs/PHASE9_KICKOFF.md',
    required: [
      'Phase 9 Kickoff',
      'Phase 9 starts after the Phase 8 repository-side executive reporting package surface',
      'npm run phase7:verify',
      'npm run phase8:review',
      'npm run phase8:verify',
      'board-ready export preparation',
      'organization readiness reporting',
      'executive reporting package',
    ],
  },
  {
    file: 'docs/PHASE9_SCOPE.md',
    required: [
      'Phase 9 Scope',
      'export preparation workflow around organization readiness reporting',
      'npm run phase8:verify',
      'npm run phase9:check',
      'Readiness export preparation',
      'executive reporting package to export preparation needs',
      'read-only export touchpoints',
      'Add validation artifacts before additional runtime changes',
      'Add tests or static checks for export wiring',
    ],
  },
  {
    file: 'docs/PHASE9_INVENTORY.md',
    required: [
      'Phase 9 Inventory',
      'Readiness export preparation',
      'src/components/dashboard/executive-reporting-package.tsx',
      'src/components/dashboard/executive-dashboard-hero.tsx',
      'src/components/dashboard/workflow-readiness-summary.tsx',
      'src/components/dashboard/readiness-follow-up-plan.tsx',
      'src/components/dashboard/dashboard-home-overview.tsx',
      'src/server/queries/organization-dashboard.ts',
      'Executive reporting package snapshot',
      'Read-only readiness summary',
      'Read-only follow-up plan',
      'Reports navigation entrypoint',
      'workflowReadiness',
      'docs/PHASE9_INVENTORY.md',
      'docs/PHASE9_VALIDATION_PLAN.md',
      'tests/phase9/readiness-export-preparation.test.ts',
      'npm run phase8:verify',
      'npm run phase9:check',
      'npm run test',
    ],
  },
  {
    file: 'docs/PHASE9_VALIDATION_PLAN.md',
    required: [
      'Phase 9 Validation Plan',
      'Readiness export preparation',
      'src/components/dashboard/executive-reporting-package.tsx',
      'src/components/dashboard/executive-dashboard-hero.tsx',
      'src/components/dashboard/workflow-readiness-summary.tsx',
      'src/components/dashboard/readiness-follow-up-plan.tsx',
      'src/components/dashboard/dashboard-home-overview.tsx',
      'src/server/queries/organization-dashboard.ts',
      'Export preparation remains based on the existing organization readiness signal',
      'Export preparation remains read-only',
      'Executive reporting package remains available as the export preparation entry surface',
      'Readiness summary and follow-up plan remain available as supporting surfaces',
      'Reports navigation remains the safe export preparation entrypoint',
      'No product, email, document, or UI template changes are required',
      'npm run phase8:verify',
      'npm run phase9:check',
      'npm run test',
    ],
  },
  {
    file: 'tests/phase9/readiness-export-preparation.test.ts',
    required: [
      "describe('Phase 9 readiness export preparation'",
      'docs/PHASE9_SCOPE.md',
      'docs/PHASE9_INVENTORY.md',
      'docs/PHASE9_VALIDATION_PLAN.md',
      'Readiness export preparation',
      'src/components/dashboard/executive-reporting-package.tsx',
      'src/components/dashboard/workflow-readiness-summary.tsx',
      'src/components/dashboard/readiness-follow-up-plan.tsx',
      'src/components/dashboard/dashboard-home-overview.tsx',
      'src/components/dashboard/readiness-export-preparation.tsx',
      'Executive reporting package',
      'Open reports',
      'Read-only reporting snapshot',
      'Follow-up planning',
      'ReadinessExportPreparation',
      'Prepare from reports',
      'readiness-export-preparation',
      'Export preparation remains read-only',
      'Reports navigation remains the safe export preparation entrypoint',
    ],
  },
  {
    file: 'src/components/dashboard/readiness-export-preparation.tsx',
    required: [
      'ReadinessExportPreparation',
      'Readiness export preparation',
      'Prepare from reports',
      'workflowReadiness?.reasons.length',
      'summary.complianceScore',
      'summary.openTasks',
    ],
  },
  {
    file: 'src/components/dashboard/dashboard-home-overview.tsx',
    required: [
      'ReadinessExportPreparation',
      'readiness-export-preparation',
      'workflowReadiness={workflowReadiness}',
      'basePath={basePath}',
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
    console.error(`Phase 9 checks failed for ${file}.`);
    for (const item of missing) console.error(`- ${item}`);
    process.exit(1);
  }
}

console.log('Phase 9 checks completed.');
