#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const reportPath = 'phase3-production-readiness-report.json';
const requiredFiles = [
  'docs/PHASE3_PRODUCTION_READINESS.md',
  'docs/PHASE3_DEPLOYMENT_RUNBOOK.md',
  'docs/PHASE3_DATABASE_MIGRATION_SAFETY.md',
  '.env.example',
  'package.json',
];

const requiredEnvHints = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'HEALTHCHECK_TOKEN',
  'CRON_SECRET',
  'NEXT_PUBLIC_SENTRY_DSN',
];

const requiredPackageScripts = [
  'phase3:files',
  'phase3:check',
  'phase3:strict',
];

const requiredDocChecks = [
  {
    path: 'docs/PHASE3_PRODUCTION_READINESS.md',
    phrases: [
      'Authorized scope',
      'Prohibited scope',
      'Implementation method',
      'Do not modify product, email, document, or UI templates',
    ],
  },
  {
    path: 'docs/PHASE3_DEPLOYMENT_RUNBOOK.md',
    phrases: [
      'Required production secrets',
      'Pre-deployment checks',
      'Post-deployment smoke checks',
      'Rollback triggers',
      'Rollback method',
    ],
  },
  {
    path: 'docs/PHASE3_DATABASE_MIGRATION_SAFETY.md',
    phrases: [
      'Migration source of truth',
      'Pre-migration checklist',
      'Prohibited migration patterns',
      'Post-migration verification',
      'Rollback caution',
    ],
  },
];

const forbiddenTemplatePaths = [
  'templates/',
  'app/templates/',
  'components/templates/',
  'emails/templates/',
];

const blockers = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    blockers.push(`${file} is missing`);
  }
}

if (existsSync('.env.example')) {
  const envExample = readFileSync('.env.example', 'utf8');
  for (const key of requiredEnvHints) {
    if (!envExample.includes(key)) {
      blockers.push(`.env.example is missing ${key}`);
    }
  }
}

if (existsSync('package.json')) {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const scripts = packageJson.scripts ?? {};
  for (const scriptName of requiredPackageScripts) {
    if (typeof scripts[scriptName] !== 'string') {
      blockers.push(`package.json is missing npm script ${scriptName}`);
    }
  }
}

for (const docCheck of requiredDocChecks) {
  if (!existsSync(docCheck.path)) continue;

  const content = readFileSync(docCheck.path, 'utf8');
  for (const phrase of docCheck.phrases) {
    if (!content.includes(phrase)) {
      blockers.push(`${docCheck.path} is missing required section or phrase: ${phrase}`);
    }
  }
}

if (existsSync('.env')) {
  blockers.push('.env exists locally; confirm it is not committed and contains no production secrets');
}

const report = {
  generatedAt: new Date().toISOString(),
  success: blockers.length === 0,
  requiredFiles,
  requiredEnvHints,
  requiredPackageScripts,
  requiredDocChecks,
  forbiddenTemplatePaths,
  blockers,
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (blockers.length > 0) {
  console.error('Phase 3 production readiness check failed.');
  for (const blocker of blockers) {
    console.error(`- ${blocker}`);
  }
  console.error(`\nReport written to ${reportPath}`);
  process.exit(1);
}

console.log(`Phase 3 production readiness check passed. Report written to ${reportPath}`);
