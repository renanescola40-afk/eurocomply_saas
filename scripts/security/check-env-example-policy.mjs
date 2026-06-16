import { existsSync, readFileSync } from 'node:fs';

const envExamplePath = '.env.example';
const failures = [];

const requiredVariables = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'HEALTHCHECK_TOKEN',
  'EVIDENCE_PACK_SIGNING_SECRET',
  'CRON_SECRET',
  'INTERNAL_CRON_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
];

const secretLikeNames = /(?:SECRET|TOKEN|PRIVATE|PASSWORD|SERVICE_ROLE|WEBHOOK|AUTH|API_KEY)/i;
const forbiddenValuePatterns = [
  { name: 'Stripe live key', pattern: /sk_live_[A-Za-z0-9]{12,}/ },
  { name: 'Stripe webhook signing value', pattern: /whsec_[A-Za-z0-9]{12,}/ },
  { name: 'Supabase token value', pattern: /sbp_[A-Za-z0-9_.-]{12,}/ },
  { name: 'JWT-like value', pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'Google OAuth client secret', pattern: /GOCSPX-[A-Za-z0-9_-]{12,}/ },
  { name: 'Resend key', pattern: /re_[A-Za-z0-9_]{12,}/ },
];

function parseEnv(source) {
  const values = new Map();
  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const name = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['\"]|['\"]$/g, '');
    values.set(name, value);
  }
  return values;
}

function isAllowedPlaceholder(value) {
  return (
    value === '' ||
    value.startsWith('http://localhost') ||
    value === 'development' ||
    value.includes('example') ||
    value.includes('localhost') ||
    value.includes('support@') ||
    value.includes('no-reply@')
  );
}

if (!existsSync(envExamplePath)) {
  failures.push('.env.example is missing');
} else {
  const source = readFileSync(envExamplePath, 'utf8');
  const values = parseEnv(source);

  for (const variable of requiredVariables) {
    if (!values.has(variable)) {
      failures.push(`.env.example missing required variable: ${variable}`);
    }
  }

  for (const [name, value] of values) {
    for (const forbidden of forbiddenValuePatterns) {
      if (forbidden.pattern.test(value)) {
        failures.push(`.env.example ${name} looks like a real secret: ${forbidden.name}`);
      }
    }

    if (secretLikeNames.test(name) && !isAllowedPlaceholder(value)) {
      failures.push(`.env.example ${name} must be empty or a placeholder, not a concrete value`);
    }
  }
}

console.log('EuroComply .env.example policy check');
console.log('-------------------------------------');

if (failures.length > 0) {
  console.error('.env.example policy failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('.env.example policy: ok');
}
