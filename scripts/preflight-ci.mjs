import { spawnSync } from 'node:child_process';

const ciPlaceholders = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://ci-placeholder.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'ci_supabase_anon_key_placeholder',
  SUPABASE_SERVICE_ROLE_KEY: 'ci_supabase_service_role_key_placeholder',
  NEXT_PUBLIC_APP_URL: 'https://ci.risckcomply.local',
  TRUSTED_ORIGINS: 'https://ci.risckcomply.local,http://localhost:3000',
  STRIPE_SECRET_KEY: 'ci_stripe_backend_key_placeholder',
  STRIPE_WEBHOOK_SECRET: 'ci_stripe_webhook_key_placeholder',
  STRIPE_PRICE_STARTER_MONTHLY: 'price_ci_starter_monthly',
  STRIPE_PRICE_GROWTH_MONTHLY: 'price_ci_growth_monthly',
  STRIPE_PRICE_ENTERPRISE_MONTHLY: 'price_ci_enterprise_monthly',
  STRIPE_PRICE_ESSENTIAL_MONTHLY: 'price_ci_essential_monthly',
  STRIPE_PRICE_PROFESSIONAL_MONTHLY: 'price_ci_professional_monthly',
  STRIPE_PRICE_BUSINESS_MONTHLY: 'price_ci_business_monthly',
  HEALTHCHECK_TOKEN: 'ci_healthcheck_token_placeholder',
  EVIDENCE_PACK_SIGNING_SECRET: 'ci_evidence_pack_signing_secret_placeholder',
  AUDIT_CHAIN_SIGNING_SECRET: 'ci_audit_chain_signing_secret_placeholder',
  STEP_UP_SIGNING_SECRET: 'ci_step_up_signing_secret_placeholder',
  REQUIRE_MALWARE_SCAN_FOR_UPLOADS: 'false',
  MALWARE_SCANNER_PROVIDER: 'disabled',
  SENTRY_AUTH_TOKEN: 'ci_sentry_auth_token_placeholder',
  UPSTASH_REDIS_REST_URL: 'https://ci-upstash-placeholder.example.com',
  UPSTASH_REDIS_REST_TOKEN: 'ci_upstash_redis_rest_token_placeholder',
  SUPABASE_ACCESS_TOKEN: 'ci_supabase_access_token_placeholder',
};

const env = {
  ...process.env,
  ...ciPlaceholders,
  RISCK_COMPLY_PREFLIGHT_PROFILE: 'ci',
  // Compatibility marker required by the existing workflow governance gate during the rebrand window.
  EUROCOMPLY_PREFLIGHT_PROFILE: 'ci',
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
