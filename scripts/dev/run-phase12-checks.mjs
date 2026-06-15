#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const checks = [
  {
    file: 'docs/PHASE12_KICKOFF.md',
    required: ['Phase 12 Kickoff', 'evidence handoff readiness review', 'handoff review surface'],
  },
  {
    file: 'docs/PHASE12_SCOPE.md',
    required: ['Phase 12 Scope', 'Evidence handoff readiness review', 'node scripts/dev/run-phase12-checks.mjs'],
  },
  {
    file: 'docs/PHASE12_INVENTORY.md',
    required: [
      'Phase 12 Inventory',
      'Evidence handoff readiness review',
      'src/components/dashboard/evidence-handoff-review.tsx',
      'src/components/dashboard/audit-package-review.tsx',
      'src/components/dashboard/readiness-export-preparation.tsx',
      'src/components/dashboard/executive-reporting-package.tsx',
      'src/components/dashboard/workflow-readiness-summary.tsx',
      'src/components/dashboard/readiness-follow-up-plan.tsx',
      'src/components/dashboard/dashboard-home-overview.tsx',
      'src/server/queries/organization-dashboard.ts',
      'Evidence handoff review surface',
      'Readiness export preparation surface',
      'Reports navigation entrypoint',
      'workflowReadiness',
      'node scripts/dev/run-phase11-verify.mjs',
      'node scripts/dev/run-phase12-checks.mjs',
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
    console.error(`Phase 12 checks failed for ${file}.`);
    for (const item of missing) console.error(`- ${item}`);
    process.exit(1);
  }
}

console.log('Phase 12 checks completed.');
