import { readFileSync, existsSync } from 'node:fs';

const failures = [];
const warnings = [];

const envExamplePath = '.env.example';
const productionWorkflowPath = '.github/workflows/vercel-production.yml';

const requiredGroups = [
  {
    name: 'application origins',
    variables: ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL', 'TRUSTED_ORIGINS'],
    publicSafe: ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL'],
  },
  {
    name: 'supabase',
    variables: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ACCESS_TOKEN'],
    publicSafe: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  },
  {
    name: 'stripe',
    variables: ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_ESSENTIAL_MONTHLY', 'STRIPE_PRICE_PROFESSIONAL_MONTHLY', 'STRIPE_PRICE_BUSINESS_MONTHLY'],
    publicSafe: ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_PRICE_ESSENTIAL_MONTHLY', 'STRIPE_PRICE_PROFESSIONAL_MONTHLY', 'STRIPE_PRICE_BUSINESS_MONTHLY'],
  },
  {
    name: 'google oauth',
    variables: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    publicSafe: ['GOOGLE_CLIENT_ID'],
  },
  {
    name: 'sentry',
    variables: ['NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_DSN', 'SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN'],
    publicSafe: ['NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_ORG', 'SENTRY_PROJECT'],
  },
  {
    name: 'upstash redis',
    variables: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    publicSafe: [],
  },
  {
    name: 'malware scanner',
    variables: ['REQUIRE_MALWARE_SCAN_FOR_UPLOADS', 'MALWARE_SCANNER_PROVIDER', 'MALWARE_SCANNER_ENDPOINT', 'MALWARE_SCANNER_URL', 'MALWARE_SCANNER_API_KEY', 'MALWARE_SCANNER_ALLOWED_HOSTS', 'MALWARE_SCANNER_CLAMAV_HOST', 'MALWARE_SCANNER_CLAMAV_PORT', 'MALWARE_SCANNER_TIMEOUT_MS'],
    publicSafe: ['REQUIRE_MALWARE_SCAN_FOR_UPLOADS', 'MALWARE_SCANNER_PROVIDER', 'MALWARE_SCANNER_ALLOWED_HOSTS', 'MALWARE_SCANNER_CLAMAV_PORT', 'MALWARE_SCANNER_TIMEOUT_MS'],
  },
  {
    name: 'cron secrets',
    variables: ['CRON_SECRET', 'INTERNAL_CRON_SECRET', 'HEALTHCHECK_TOKEN'],
    publicSafe: [],
  },
  {
    name: 'audit-chain secrets',
    variables: ['AUDIT_CHAIN_SIGNING_SECRET', 'EVIDENCE_PACK_SIGNING_SECRET'],
    publicSafe: [],
  },
  {
    name: 'step-up secrets',
    variables: ['STEP_UP_SIGNING_SECRET'],
    publicSafe: [],
  },
  {
    name: 'vercel deploy credentials',
    variables: ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'],
    publicSafe: [],
  },
];

const placeholderPatterns = [
  /^$/,
  /^https?:\/\/localhost(?::\d+)?$/i,
  /example/i,
  /placeholder/i,
  /changeme/i,
  /^your-/i,
  /^redacted$/i,
  /^development$/i,
  /^test$/i,
];

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function parseEnvExample(source) {
  const values = new Map();
  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    values.set(trimmed.slice(0, index).trim(), trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, ''));
  }
  return values;
}

function isPlaceholder(value) {
  return placeholderPatterns.some((pattern) => pattern.test(value));
}

function isSensitiveName(name) {
  return /(?:SECRET|TOKEN|PRIVATE|PASSWORD|SERVICE_ROLE|WEBHOOK|AUTH|API_KEY|CLIENT_SECRET|ACCESS_TOKEN|ORG_ID|PROJECT_ID)/i.test(name);
}

function hasRuntimeValue(name) {
  return Boolean(String(process.env[name] ?? '').trim());
}

function validateRuntime() {
  for (const group of requiredGroups) {
    const missing = group.variables.filter((name) => !hasRuntimeValue(name));
    if (missing.length > 0) failures.push(`${group.name}: missing ${missing.length} required Vercel production variable(s).`);
  }

  for (const originName of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL']) {
    const value = process.env[originName];
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') failures.push(`${originName}: production value must use https.`);
    } catch {
      failures.push(`${originName}: production value must be an absolute URL.`);
    }
  }

  const trustedOrigins = String(process.env.TRUSTED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  if (trustedOrigins.length === 0) failures.push('TRUSTED_ORIGINS: configure at least one trusted production origin.');
  for (const origin of trustedOrigins) {
    try {
      const url = new URL(origin);
      if (url.protocol !== 'https:') failures.push('TRUSTED_ORIGINS: every production origin must use https.');
    } catch {
      failures.push('TRUSTED_ORIGINS: every entry must be an absolute origin URL.');
    }
  }

  if (process.env.RELEASE_TARGET === 'enterprise' && process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS !== 'true') {
    failures.push('enterprise target: REQUIRE_MALWARE_SCAN_FOR_UPLOADS must be true.');
  }
}

function validateDocumentation() {
  const envExample = read(envExamplePath);
  const workflow = read(productionWorkflowPath);
  if (!envExample) failures.push(`${envExamplePath} is missing.`);
  if (!workflow) failures.push(`${productionWorkflowPath} is missing.`);

  const envValues = parseEnvExample(envExample);
  for (const group of requiredGroups) {
    for (const name of group.variables) {
      if (!envValues.has(name)) failures.push(`${envExamplePath}: missing ${name}.`);
      const documentedValue = envValues.get(name) ?? '';
      if (isSensitiveName(name) && !isPlaceholder(documentedValue)) failures.push(`${envExamplePath}: ${name} must be empty or an obvious placeholder.`);
      if (/^NEXT_PUBLIC_/.test(name) && !group.publicSafe.includes(name)) failures.push(`${envExamplePath}: ${name} uses public prefix but is not classified public-safe.`);
    }
  }

  const requiredWorkflowTokens = [
    'npm ci',
    'npm run lint',
    'npm run typecheck',
    'npm run test',
    'npm run build',
    'npm run security:ci',
    'npm run quality:routes',
    'npm run ops:vercel-readiness',
    'npm run release:readiness',
    'npm run release:enterprise-readiness',
    'vercel deploy --prebuilt --prod',
  ];
  for (const token of requiredWorkflowTokens) {
    if (!workflow.includes(token)) failures.push(`${productionWorkflowPath}: missing gate or deploy command ${token}.`);
  }
}

console.log('Vercel production environment readiness');
console.log('---------------------------------------');
validateDocumentation();
validateRuntime();

if (warnings.length > 0) {
  console.warn('Warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length > 0) {
  console.error('Readiness failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Vercel production environment readiness: ok');
}
