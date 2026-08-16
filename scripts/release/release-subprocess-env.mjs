const PROTECTED_RELEASE_ENV_KEYS = Object.freeze([
  'HEALTHCHECK_TOKEN',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_URL',
  'SUPABASE_DB_POOLER_URL',
  'SUPABASE_POOLER_URL',
  'SUPABASE_DIRECT_URL',
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SENTRY_AUTH_TOKEN',
  'SENTRY_DSN',
  'STEP_UP_SIGNING_SECRET',
  'STEP_UP_ASSERTION_SIGNING_SECRET',
  'AUDIT_CHAIN_SIGNING_SECRET',
  'PLATFORM_PROOF_TOKEN',
  'SCIM_PROOF_BEARER_TOKEN',
  'SAML_PROOF_CONNECTION_ID',
]);

export function protectedReleaseEnvKeys() {
  return [...PROTECTED_RELEASE_ENV_KEYS];
}

export function stripProtectedReleaseEnv(target = process.env) {
  for (const key of PROTECTED_RELEASE_ENV_KEYS) delete target[key];
  return target;
}

export function buildReleaseSubprocessEnv(source = process.env, allowProtectedKeys = []) {
  const env = { ...source };
  stripProtectedReleaseEnv(env);

  for (const key of allowProtectedKeys) {
    if (!PROTECTED_RELEASE_ENV_KEYS.includes(key)) {
      throw new Error(`release subprocess attempted to allow unknown protected key: ${key}`);
    }
    if (source[key] !== undefined) env[key] = source[key];
  }

  return env;
}
