import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const scanRoots = ['src', 'scripts', 'docs', '.github', 'supabase'].filter((path) => existsSync(join(root, path)));
const scanFiles = ['package.json', 'next.config.ts', 'proxy.ts', 'instrumentation.ts', 'instrumentation-client.ts', '.env.example']
  .filter((path) => existsSync(join(root, path)));

const ignoredDirectories = new Set(['node_modules', '.next', '.git', 'dist', 'coverage', 'playwright-report', 'test-results']);
const allowedPublicNames = new Set([
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SENTRY_DSN',
]);

const dangerousPublicName = /NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|SERVICE|SERVICE_ROLE|PRIVATE|PASSWORD|WEBHOOK|STRIPE_SECRET|AUTH_TOKEN|ACCESS_TOKEN|SIGNING|KEY)[A-Z0-9_]*/g;
const secretValuePatterns = [
  { name: 'Supabase service role JWT-like value', pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'Stripe live secret key', pattern: /sk_live_[A-Za-z0-9]{16,}/g },
  { name: 'Stripe restricted key', pattern: /rk_live_[A-Za-z0-9]{16,}/g },
  { name: 'Stripe webhook secret value', pattern: /whsec_[A-Za-z0-9]{16,}/g },
  { name: 'GitHub token', pattern: /gh[pousr]_[A-Za-z0-9_]{20,}/g },
  { name: 'Supabase access token style value', pattern: /sbp_[A-Za-z0-9_\-.]{20,}/g },
];

const publicClientFiles = [
  /src\/app\/.*\/.*client\.(tsx|ts)$/,
  /src\/components\/.*\.(tsx|ts)$/,
  /src\/lib\/.*client.*\.(tsx|ts)$/,
];
const serverOnlyEnvNames = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SENTRY_AUTH_TOKEN',
  'SUPABASE_ACCESS_TOKEN',
  'EVIDENCE_PACK_SIGNING_SECRET',
  'HEALTHCHECK_TOKEN',
  'UPSTASH_REDIS_REST_TOKEN',
];

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) return [];
      return walk(fullPath);
    }
    if (!entry.isFile()) return [];
    if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|md|yml|yaml|sql|example)$/.test(entry.name) && entry.name !== '.env.example') return [];
    return [fullPath];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

function isPlaceholderLine(line) {
  return /(placeholder|example|changeme|your-|ci-|test_|sk_test_|price_ci_|whsec_ci_|dummy|not configured|redacted)/i.test(line);
}

function isPublicClientFile(path) {
  return publicClientFiles.some((pattern) => pattern.test(path));
}

const files = [
  ...scanRoots.flatMap((scanRoot) => walk(join(root, scanRoot))),
  ...scanFiles.map((file) => join(root, file)),
];
const failures = [];

for (const file of new Set(files)) {
  const normalized = normalizePath(file);
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');

  for (const match of source.matchAll(dangerousPublicName)) {
    const name = match[0];
    const line = lines[lineNumberFor(source, match.index ?? 0) - 1] ?? '';
    if (!allowedPublicNames.has(name) && !isPlaceholderLine(line)) {
      failures.push(`${normalized}:${lineNumberFor(source, match.index ?? 0)} dangerous public env name: ${name}`);
    }
  }

  for (const secret of secretValuePatterns) {
    for (const match of source.matchAll(secret.pattern)) {
      const line = lines[lineNumberFor(source, match.index ?? 0) - 1] ?? '';
      if (!isPlaceholderLine(line)) {
        failures.push(`${normalized}:${lineNumberFor(source, match.index ?? 0)} possible committed secret: ${secret.name}`);
      }
    }
  }

  if (isPublicClientFile(normalized)) {
    for (const envName of serverOnlyEnvNames) {
      if (source.includes(envName)) {
        failures.push(`${normalized}: server-only env referenced from public/client-side code: ${envName}`);
      }
    }
  }
}

console.log('EuroComply public secret exposure check');
console.log('--------------------------------------');
console.log(`Scanned ${new Set(files).size} files.`);

if (failures.length > 0) {
  console.error('Public secret exposure failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Public secret exposure check: ok');
}
