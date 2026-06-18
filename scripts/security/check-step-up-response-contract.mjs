import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const helperPath = join(root, 'src', 'server', 'security', 'step-up.ts');
const interactiveRoutes = [
  'src/app/api/billing/checkout/route.ts',
  'src/app/api/billing/portal/route.ts',
  'src/app/api/gdpr/delete-request/route.ts',
];

const failures = [];

if (!existsSync(helperPath)) {
  failures.push('src/server/security/step-up.ts is missing.');
} else {
  const helper = readFileSync(helperPath, 'utf8');
  if (!helper.includes('publicStepUpSummary')) {
    failures.push('step-up helper must expose a centralized public response summary.');
  }
  if (!helper.includes('verified: true')) {
    failures.push('public step-up summary must be minimal and boolean-only.');
  }
}

for (const relativePath of interactiveRoutes) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`${relativePath} is missing.`);
    continue;
  }

  const source = readFileSync(fullPath, 'utf8');

  if (!source.includes('publicStepUpSummary(stepUp.assessment)')) {
    failures.push(`${relativePath}: success response must use publicStepUpSummary(stepUp.assessment).`);
  }

  const responseTail = source.slice(source.lastIndexOf('return noStoreJson'));
  for (const forbidden of ['tokenType', 'expiresAt', 'verifiedAt: stepUp.assessment']) {
    if (responseTail.includes(forbidden)) {
      failures.push(`${relativePath}: success response exposes internal step-up metadata (${forbidden}).`);
    }
  }
}

console.log('Step-up public response contract check');
console.log('--------------------------------------');
console.log(`Checked ${interactiveRoutes.length} interactive high-risk routes.`);

if (failures.length > 0) {
  console.error('Step-up response contract failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Step-up public response contract: ok');
}
