import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const workflowRoot = join(root, '.github', 'workflows');

const requiredWorkflowFiles = [
  '.github/workflows/ci.yml',
  '.github/workflows/security-ci.yml',
  '.github/workflows/vercel-production.yml',
];

const requiredSecretReferences = [
  'secrets.NEXT_PUBLIC_SUPABASE_URL',
  'secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'secrets.SUPABASE_SERVICE_ROLE_KEY',
  'secrets.VERCEL_TOKEN',
  'secrets.VERCEL_ORG_ID',
  'secrets.VERCEL_PROJECT_ID',
];

const requiredPreflightTokens = [
  'npm run preflight',
  'npm run security:ci',
];

const forbiddenWorkflowPatterns = [
  { name: 'hardcoded Supabase URL', pattern: /https:\/\/[a-z0-9-]+\.supabase\.co/i },
  { name: 'hardcoded Stripe secret key', pattern: /sk_(live|test)_[A-Za-z0-9_]+/ },
  { name: 'hardcoded Stripe webhook secret', pattern: /whsec_[A-Za-z0-9_]+/ },
  { name: 'hardcoded GitHub token', pattern: /gh[pousr]_[A-Za-z0-9_]{20,}/ },
  { name: 'hardcoded Vercel token-like value', pattern: /vercel[_-]?token\s*[:=]\s*['"]?[A-Za-z0-9_\-]{20,}/i },
  { name: 'test service role placeholder', pattern: /(test|ci)-service-role-key/i },
  { name: 'test anon key placeholder', pattern: /(test|ci)-anon-key/i },
  { name: 'test healthcheck token placeholder', pattern: /(test|ci)-healthcheck-token/i },
];

function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile() && /\.(ya?ml)$/.test(entry.name)) return [fullPath];
    return [];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

const failures = [];
const workflows = walk(workflowRoot);
const workflowSources = workflows.map((path) => ({ path: normalizePath(path), source: readFileSync(path, 'utf8') }));
const allWorkflowSource = workflowSources.map(({ source }) => source).join('\n--- workflow boundary ---\n');

for (const path of requiredWorkflowFiles) {
  if (!existsSync(join(root, path))) failures.push(`${path} is missing`);
}

for (const token of requiredSecretReferences) {
  if (!allWorkflowSource.includes(token)) {
    failures.push(`GitHub Actions workflows must reference ${token} instead of hardcoded CI/CD credentials`);
  }
}

for (const token of requiredPreflightTokens) {
  if (!allWorkflowSource.includes(token)) {
    failures.push(`GitHub Actions workflows must run ${token} before deploy/release gates`);
  }
}

for (const { path, source } of workflowSources) {
  for (const forbidden of forbiddenWorkflowPatterns) {
    for (const match of source.matchAll(forbidden.pattern)) {
      failures.push(`${path}:${lineNumberFor(source, match.index ?? 0)} forbidden CI/CD secret pattern: ${forbidden.name}`);
    }
  }

  if (/vercel\s+(deploy|pull|build)/i.test(source) && !source.includes('environment: production')) {
    failures.push(`${path}: Vercel deploy workflow must use a protected GitHub Environment such as production`);
  }
}

console.log('EuroComply CI/CD secrets and deploy gate check');
console.log('------------------------------------------------');
console.log(`Scanned ${workflowSources.length} workflow files.`);

if (failures.length > 0) {
  console.error('CI/CD secrets/deploy gate failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('CI/CD secrets and deploy gates: ok');
}
