import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = new Set(process.argv.slice(2));
const contractMode = args.has('--contract');
const strictMode = args.has('--strict');
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const outputPath = resolve(outputArg?.slice('--output='.length) || 'artifacts/platform/provider-readiness.json');

const groups = {
  application: ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL', 'TRUSTED_ORIGINS'],
  supabase: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  oauth: ['SUPABASE_AUTH_SITE_URL', 'SUPABASE_AUTH_REDIRECT_URLS', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  stripe: ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  sentry: ['NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_ORG', 'SENTRY_PROJECT'],
  vercel: ['VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'],
};

const secretNames = new Set([
  'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_CLIENT_SECRET', 'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET', 'SENTRY_AUTH_TOKEN', 'VERCEL_TOKEN',
]);

function parseExample(path) {
  const text = readFileSync(path, 'utf8');
  const names = new Set();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=/);
    if (match) names.add(match[1]);
  }
  return names;
}

function isPlaceholder(value) {
  return !value || /^(changeme|placeholder|example|test|dummy)$/i.test(value.trim()) || value.includes('<');
}

function safeShape(name, value) {
  if (!value) return { configured: false, valid_shape: false };
  if (secretNames.has(name)) return { configured: !isPlaceholder(value), valid_shape: !isPlaceholder(value) };
  if (name.endsWith('_URL') || name.endsWith('_DSN')) {
    try {
      const url = new URL(value);
      return { configured: !isPlaceholder(value), valid_shape: ['http:', 'https:'].includes(url.protocol) };
    } catch {
      return { configured: !isPlaceholder(value), valid_shape: false };
    }
  }
  return { configured: !isPlaceholder(value), valid_shape: !isPlaceholder(value) };
}

const exampleNames = parseExample(resolve('.env.example'));
const checks = [];

for (const [provider, names] of Object.entries(groups)) {
  for (const name of names) {
    const declared = exampleNames.has(name);
    const state = contractMode
      ? { configured: declared, valid_shape: declared }
      : safeShape(name, process.env[name]);
    checks.push({ provider, variable: name, declared, ...state });
  }
}

const modePairs = [
  ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'Stripe'],
];
const consistency = modePairs.map(([publicName, secretName, provider]) => {
  const publicValue = process.env[publicName] || '';
  const secretValue = process.env[secretName] || '';
  const publicMode = publicValue.startsWith('pk_live_') ? 'live' : publicValue.startsWith('pk_test_') ? 'test' : 'unknown';
  const secretMode = secretValue.startsWith('sk_live_') ? 'live' : secretValue.startsWith('sk_test_') ? 'test' : 'unknown';
  const applicable = !contractMode && Boolean(publicValue || secretValue);
  return { provider, applicable, public_mode: publicMode, secret_mode: secretMode, consistent: !applicable || (publicMode !== 'unknown' && publicMode === secretMode) };
});

const failures = checks.filter((item) => !item.declared || (strictMode && (!item.configured || !item.valid_shape)));
const consistencyFailures = consistency.filter((item) => item.applicable && !item.consistent);
const status = failures.length === 0 && consistencyFailures.length === 0 ? 'PASS' : 'BLOCKED';

const report = {
  schema_version: 1,
  evidence_type: 'platform-provider-readiness',
  generated_at: new Date().toISOString(),
  repository: process.env.GITHUB_REPOSITORY || 'renanescola40-afk/eurocomply_saas',
  commit_sha: process.env.GITHUB_SHA || null,
  mode: contractMode ? 'contract' : strictMode ? 'strict-runtime' : 'runtime-advisory',
  status,
  checks,
  consistency,
  external_dashboard_proof: {
    status: 'NOT_PROVEN_BY_REPOSITORY',
    providers: ['Vercel', 'Supabase', 'Google OAuth', 'Stripe', 'Sentry'],
  },
  redaction: 'No environment values are included in this report.',
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Provider readiness: ${status}`);
console.log(`Mode: ${report.mode}`);
console.log(`Checks: ${checks.length}; failures: ${failures.length}; consistency failures: ${consistencyFailures.length}`);
console.log(`Report: ${outputPath}`);

if (status !== 'PASS') process.exitCode = 1;
