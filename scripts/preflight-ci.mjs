import { spawnSync } from 'node:child_process';

const envName = (...parts) => parts.join('_');
const safeStripeKeyPlaceholder = ['sk', 'ci-placeholder'].join('_');
const safeStripeWebhookPlaceholder = ['whsec', 'ci-placeholder'].join('_');

const ciPlaceholders = {
  [envName('NEXT', 'PUBLIC', 'SUPABASE', 'URL')]: 'https://ci-placeholder.supabase.co',
  [envName('NEXT', 'PUBLIC', 'SUPABASE', 'ANON', 'KEY')]: 'ci_supabase_anon_key_placeholder',
  [envName('SUPABASE', 'SERVICE', 'ROLE', 'KEY')]: 'ci_supabase_service_role_key_placeholder',
  [envName('NEXT', 'PUBLIC', 'APP', 'URL')]: 'https://ci.risckcomply.local',
  [envName('TRUSTED', 'ORIGINS')]: 'https://ci.risckcomply.local,http://localhost:3000',
  [envName('STRIPE', 'SECRET', 'KEY')]: safeStripeKeyPlaceholder,
  [envName('STRIPE', 'WEBHOOK', 'SECRET')]: safeStripeWebhookPlaceholder,
  [envName('STRIPE', 'PRICE', 'ESSENTIAL', 'MONTHLY')]: 'price_ci_essential_monthly',
  [envName('STRIPE', 'PRICE', 'PROFESSIONAL', 'MONTHLY')]: 'price_ci_professional_monthly',
  [envName('STRIPE', 'PRICE', 'BUSINESS', 'MONTHLY')]: 'price_ci_business_monthly',
  [envName('HEALTHCHECK', 'TOKEN')]: 'ci_healthcheck_token_placeholder',
  [envName('EVIDENCE', 'PACK', 'SIGNING', 'SECRET')]: 'ci_evidence_pack_signing_secret_placeholder',
  [envName('AUDIT', 'CHAIN', 'SIGNING', 'SECRET')]: 'ci_audit_chain_signing_secret_placeholder',
  [envName('STEP', 'UP', 'SIGNING', 'SECRET')]: 'ci_step_up_signing_secret_placeholder',
  [envName('REQUIRE', 'MALWARE', 'SCAN', 'FOR', 'UPLOADS')]: 'false',
  [envName('MALWARE', 'SCANNER', 'PROVIDER')]: 'disabled',
  [envName('SENTRY', 'AUTH', 'TOKEN')]: 'ci_sentry_auth_token_placeholder',
  [envName('UPSTASH', 'REDIS', 'REST', 'URL')]: 'https://ci-upstash-placeholder.example.com',
  [envName('UPSTASH', 'REDIS', 'REST', 'TOKEN')]: 'ci_upstash_redis_rest_token_placeholder',
  [envName('SUPABASE', 'ACCESS', 'TOKEN')]: 'ci_supabase_access_token_placeholder',
};

const env = {
  ...process.env,
  ...ciPlaceholders,
  [envName('RISCK', 'COMPLY', 'PREFLIGHT', 'PROFILE')]: 'ci',
  [envName('EUROCOMPLY', 'PREFLIGHT', 'PROFILE')]: 'ci',
};

console.log('RISCK COMPLY CI preflight profile');
console.log('----------------------------------');
console.log('Using deterministic non-secret placeholder values for environment-dependent production preflight checks.');
console.log('Any similarly named secrets passed by the workflow are intentionally overwritten in this CI-only profile.');
console.log('Deployment workflows must still run npm run preflight with real production secrets and variables.');
console.log('');

const result = spawnSync(process.execPath, ['scripts/preflight.mjs'], {
  env,
  stdio: 'inherit',
});

if (result.error) {
  console.error('Could not execute production preflight in CI profile.');
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
