#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const reportPath = 'phase3-runtime-readiness-report.json';

const requiredFiles = [
  'docs/PHASE3_RUNTIME_SECURITY_OBSERVABILITY.md',
  'next.config.ts',
  'package.json',
];

const requiredNextConfigPhrases = [
  'withSentryConfig',
  'Content-Security-Policy',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  "frame-ancestors 'none'",
  "object-src 'none'",
  'https://js.stripe.com',
  'https://*.supabase.co',
  'https://*.sentry.io',
  'tunnelRoute',
];

const requiredRuntimeDependencies = [
  '@sentry/nextjs',
  '@supabase/ssr',
  '@supabase/supabase-js',
  'stripe',
  'zod',
];

const requiredDocPhrases = [
  'Runtime security headers',
  'Production CSP caution',
  'Observability contract',
  'Operational diagnostics',
  'Safe error handling',
  'It does not authorize template',
];

const blockers = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    blockers.push(`${file} is missing`);
  }
}

if (existsSync('next.config.ts')) {
  const nextConfig = readFileSync('next.config.ts', 'utf8');
  for (const phrase of requiredNextConfigPhrases) {
    if (!nextConfig.includes(phrase)) {
      blockers.push(`next.config.ts is missing runtime readiness phrase: ${phrase}`);
    }
  }
}

if (existsSync('package.json')) {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const dependencies = packageJson.dependencies ?? {};
  const devDependencies = packageJson.devDependencies ?? {};
  const allDependencies = { ...dependencies, ...devDependencies };

  for (const dependencyName of requiredRuntimeDependencies) {
    if (typeof allDependencies[dependencyName] !== 'string') {
      blockers.push(`package.json is missing runtime dependency: ${dependencyName}`);
    }
  }

  if (packageJson.scripts?.['phase3:runtime'] !== 'node scripts/dev/check-phase3-runtime-readiness.mjs') {
    blockers.push('package.json is missing npm script phase3:runtime');
  }
}

if (existsSync('docs/PHASE3_RUNTIME_SECURITY_OBSERVABILITY.md')) {
  const runtimeDoc = readFileSync('docs/PHASE3_RUNTIME_SECURITY_OBSERVABILITY.md', 'utf8');
  for (const phrase of requiredDocPhrases) {
    if (!runtimeDoc.includes(phrase)) {
      blockers.push(`docs/PHASE3_RUNTIME_SECURITY_OBSERVABILITY.md is missing required phrase: ${phrase}`);
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  success: blockers.length === 0,
  requiredFiles,
  requiredNextConfigPhrases,
  requiredRuntimeDependencies,
  requiredDocPhrases,
  blockers,
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (blockers.length > 0) {
  console.error('Phase 3 runtime readiness check failed.');
  for (const blocker of blockers) {
    console.error(`- ${blocker}`);
  }
  console.error(`\nReport written to ${reportPath}`);
  process.exit(1);
}

console.log(`Phase 3 runtime readiness check passed. Report written to ${reportPath}`);
