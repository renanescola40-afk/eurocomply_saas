import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

const root = process.cwd();
const strictPublicSecretScan = process.env.STRICT_PUBLIC_SECRET_SCAN === '1';
const ignoredDirectories = new Set(['node_modules', '.next', '.git', '.vercel', 'dist', 'coverage', 'playwright-report', 'test-results']);
const scanRoots = ['src', 'scripts', 'docs', '.github', 'supabase'].filter((path) => existsSync(join(root, path)));
const scanFiles = [
  'package.json',
  'next.config.ts',
  'proxy.ts',
  'instrumentation.ts',
  'instrumentation-client.ts',
  '.env',
  '.env.local',
  '.env.development',
  '.env.test',
  '.env.production',
  '.env.preview',
  '.env.example',
].filter((path) => existsSync(join(root, path)));

const allowedCommittedEnvFiles = new Set(['.env.example']);
const allowedPublicNames = new Set([
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_KEY',
  'NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SENTRY_DSN',
]);

const dangerousPublicName = /NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|SERVICE|SERVICE_ROLE|PRIVATE|PASSWORD|WEBHOOK|AUTH_TOKEN|ACCESS_TOKEN|SIGNING)[A-Z0-9_]*/g;
const concreteSecretPatterns = [
  { name: 'JWT-like service credential', pattern: /(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'Stripe live secret key', pattern: new RegExp('(?<![A-Za-z0-9_-])' + 'sk_' + 'live_' + '[A-Za-z0-9]{16,}', 'g') },
  { name: 'Stripe restricted live key', pattern: new RegExp('(?<![A-Za-z0-9_-])' + 'rk_' + 'live_' + '[A-Za-z0-9]{16,}', 'g') },
  { name: 'Stripe webhook signing secret', pattern: new RegExp('(?<![A-Za-z0-9_-])' + 'whsec_' + '[A-Za-z0-9]{16,}', 'g') },
  { name: 'Supabase access token style value', pattern: new RegExp('(?<![A-Za-z0-9_-])' + 'sbp_' + '[A-Za-z0-9_.-]{20,}', 'g') },
  { name: 'Google OAuth client secret value', pattern: new RegExp('(?<![A-Za-z0-9_-])' + 'GOCSPX-' + '[A-Za-z0-9_-]{20,}', 'g') },
  { name: 'Google API key value', pattern: new RegExp('(?<![A-Za-z0-9_-])' + 'AIza' + '[0-9A-Za-z_-]{30,}', 'g') },
  { name: 'Resend API key value', pattern: new RegExp('(?<![A-Za-z0-9_-])' + 're_' + '[A-Za-z0-9_]{20,}', 'g') },
];

const publicClientFiles = [
  /src\/app\/.*\/.*client\.(tsx|ts)$/,
  /src\/components\/.*\.(tsx|ts)$/,
  /src\/lib\/.*client.*\.(tsx|ts)$/,
];
const serverSideEnvReferenceFiles = new Set(['src/lib/email/client.ts']);
const serverOnlyEnvNames = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SENTRY_AUTH_TOKEN',
  'RESEND_API_KEY',
  'EVIDENCE_PACK_SIGNING_SECRET',
  'HEALTHCHECK_TOKEN',
  'CRON_SECRET',
  'INTERNAL_CRON_SECRET',
  'UPSTASH_REDIS_REST_TOKEN',
  'GOOGLE_CLIENT_SECRET',
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
    if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|md|yml|yaml|sql|example)$/.test(entry.name) && !entry.name.startsWith('.env')) return [];
    return [fullPath];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

function lineFor(source, index) {
  return source.split('\n')[lineNumberFor(source, index) - 1] ?? '';
}

function containsConcreteSecretValue(line) {
  return concreteSecretPatterns.some((secret) => {
    const flags = secret.pattern.flags.replace('g', '');
    return new RegExp(secret.pattern.source, flags).test(line);
  });
}

function isReferenceOnlyContext(normalized, line) {
  if (containsConcreteSecretValue(line)) return false;
  if (normalized === '.gitleaks.toml') return true;
  if (normalized.startsWith('docs/')) return true;
  if (normalized.startsWith('scripts/security/')) return true;
  if (normalized.startsWith('.github/workflows/')) return true;
  return false;
}

function isPublicClientFile(path) {
  if (serverSideEnvReferenceFiles.has(path)) return false;
  return publicClientFiles.some((pattern) => pattern.test(path));
}

const files = [
  ...scanRoots.flatMap((scanRoot) => walk(join(root, scanRoot))),
  ...scanFiles.map((file) => join(root, file)),
];
const failures = [];

if (!strictPublicSecretScan) {
  failures.push('STRICT_PUBLIC_SECRET_SCAN=1 is required; report-only public secret scanning is not allowed');
}

for (const file of new Set(files)) {
  const normalized = normalizePath(file);
  const source = readFileSync(file, 'utf8');

  if (/^\.env(\..*)?$/.test(basename(normalized)) && !allowedCommittedEnvFiles.has(basename(normalized))) {
    failures.push(`${normalized}: committed environment file detected; keep real secrets in provider secret stores only`);
  }

  for (const match of source.matchAll(dangerousPublicName)) {
    const name = match[0];
    const line = lineFor(source, match.index ?? 0);
    if (!allowedPublicNames.has(name) && !isReferenceOnlyContext(normalized, line)) {
      failures.push(`${normalized}:${lineNumberFor(source, match.index ?? 0)} dangerous public env name: ${name}`);
    }
  }

  for (const secret of concreteSecretPatterns) {
    for (const match of source.matchAll(secret.pattern)) {
      const line = lineFor(source, match.index ?? 0);
      if (!isReferenceOnlyContext(normalized, line)) {
        failures.push(`${normalized}:${lineNumberFor(source, match.index ?? 0)} possible committed secret value: ${secret.name}`);
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
  console.error('Public secret exposure findings:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Public secret exposure check: ok');
}
