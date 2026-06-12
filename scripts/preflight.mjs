import { existsSync } from 'node:fs';

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const recommended = [
  'NEXT_PUBLIC_APP_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ESSENTIAL_MONTHLY',
  'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  'STRIPE_PRICE_BUSINESS_MONTHLY',
  'HEALTHCHECK_TOKEN',
  'EVIDENCE_PACK_SIGNING_SECRET',
  'SENTRY_AUTH_TOKEN',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SUPABASE_ACCESS_TOKEN',
];

const requiredFiles = [
  'supabase/migrations/20260610_public_launch_readiness.sql',
  'supabase/migrations/20260610_billing_stripe_sync.sql',
  'supabase/migrations/20260610_ai_governance_inventory.sql',
  'supabase/migrations/20260610_ai_incident_register.sql',
  'src/app/api/ops/enterprise-readiness/route.ts',
  'src/server/governance/enterprise-readiness.ts',
  'src/app/[locale]/enterprise-readiness/page.tsx',
  'src/app/api/enterprise-readiness/export/route.ts',
  'src/server/governance/retention-policy.ts',
  'src/app/[locale]/retention-center/page.tsx',
  'src/app/api/retention-center/export/route.ts',
  'src/server/governance/continuity-policy.ts',
  'src/app/[locale]/continuity-center/page.tsx',
  'src/server/governance/vendor-assurance-policy.ts',
  'src/app/[locale]/vendor-assurance/page.tsx',
  'src/app/api/vendor-assurance/export/route.ts',
  'src/server/governance/security-questionnaire.ts',
  'src/app/[locale]/security-questionnaire/page.tsx',
  'src/app/api/security-questionnaire/export/route.ts',
  'scripts/security/check-rls.mjs',
  'scripts/security/check-api-guards.mjs',
  'scripts/security/check-protected-routes.mjs',
  'docs/security/ASVS_MATRIX.md',
  'docs/PRODUCTION_LAUNCH_CHECKLIST.md',
  'docs/SECURITY_OVERVIEW.md',
  'docs/LEGAL_READINESS.md',
  'docs/INCIDENT_RESPONSE.md',
  'docs/BACKUP_AND_CONTINUITY.md',
];

const missingRequired = required.filter((key) => !process.env[key]);
const missingRecommended = recommended.filter((key) => !process.env[key]);
const missingFiles = requiredFiles.filter((path) => !existsSync(path));

console.log('EuroComply production preflight');
console.log('--------------------------------');

if (missingRequired.length > 0) {
  console.error('Missing required environment variables:');
  for (const key of missingRequired) console.error(`- ${key}`);
  process.exitCode = 1;
} else {
  console.log('Required environment variables: ok');
}

if (missingRecommended.length > 0) {
  console.warn('Missing recommended production variables:');
  for (const key of missingRecommended) console.warn(`- ${key}`);
} else {
  console.log('Recommended production variables: ok');
}

if (missingFiles.length > 0) {
  console.error('Missing launch-critical files:');
  for (const path of missingFiles) console.error(`- ${path}`);
  process.exitCode = 1;
} else {
  console.log('Launch-critical files: ok');
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (appUrl && !/^https?:\/\//.test(appUrl)) {
  console.error('NEXT_PUBLIC_APP_URL must start with http:// or https://');
  process.exitCode = 1;
}

const stripePrices = [
  process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY,
  process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
  process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
].filter(Boolean);

for (const price of stripePrices) {
  if (!price.startsWith('price_')) {
    console.error(`Stripe price id looks invalid: ${price}`);
    process.exitCode = 1;
  }
}

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.warn('SUPABASE_ACCESS_TOKEN is not configured; live RLS CI checks will run in advisory mode only.');
}

if (process.exitCode === 1) {
  console.error('Preflight failed. Fix the issues above before production deploy.');
} else {
  console.log('Preflight completed. Review warnings before launch.');
}
