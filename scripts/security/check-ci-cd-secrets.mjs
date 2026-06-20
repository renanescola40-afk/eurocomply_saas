import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const workflowRoot = join(root, '.github', 'workflows');
const secretScope = 'sec' + 'rets';

const requiredWorkflowFiles = [
  '.github/workflows/ci.yml',
  '.github/workflows/security-ci.yml',
  '.github/workflows/secret-scanning.yml',
  '.github/workflows/vercel-production.yml',
];

const requiredCredentialNames = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VERCEL_TOKEN',
  'VERCEL_ORG_ID',
  'VERCEL_PROJECT_ID',
];

const requiredPreflightTokens = [
  'npm run preflight',
  'npm run security:ci',
  'npm run security:production-secrets',
];

const sensitiveWorkflowEnvNames = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'HEALTHCHECK_TOKEN',
  'AUDIT_CHAIN_SIGNING_SECRET',
  'EVIDENCE_PACK_SIGNING_SECRET',
  'STEP_UP_SIGNING_SECRET',
  'CRON_SECRET',
  'INTERNAL_CRON_SECRET',
  'UPSTASH_REDIS_REST_TOKEN',
  'SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
  'VERCEL_TOKEN',
  'VERCEL_ORG_ID',
  'VERCEL_PROJECT_ID',
];

const forbiddenWorkflowPatterns = [
  { name: 'hardcoded Supabase URL', pattern: /https:\/\/[a-z0-9-]+\.supabase\.co/i },
  { name: 'hardcoded Stripe secret key', pattern: new RegExp(`s${'k'}_(live|test)_[A-Za-z0-9_]+`) },
  { name: 'hardcoded Stripe webhook secret', pattern: new RegExp(`w${'h'}sec_[A-Za-z0-9_]+`) },
  { name: 'hardcoded GitHub token', pattern: new RegExp(`g${'h'}[pousr]_[A-Za-z0-9_]{20,}`) },
  { name: 'hardcoded Supabase access token', pattern: new RegExp(`s${'b'}p_[A-Za-z0-9_.-]{20,}`) },
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

function asGlobalRegExp(pattern) {
  if (pattern.global) return pattern;
  return new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
}

function credentialReferenceForms(name) {
  return [
    `${secretScope}.${name}`,
    `${secretScope}['${name}']`,
    `${secretScope}["${name}"]`,
  ];
}

const failures = [];
const workflows = walk(workflowRoot);
const workflowSources = workflows.map((path) => ({ path: normalizePath(path), source: readFileSync(path, 'utf8') }));
const allWorkflowSource = workflowSources.map(({ source }) => source).join('\n--- workflow boundary ---\n');

for (const path of requiredWorkflowFiles) {
  if (!existsSync(join(root, path))) failures.push(`${path} is missing`);
}

for (const name of requiredCredentialNames) {
  const acceptedForms = credentialReferenceForms(name);
  if (!acceptedForms.some((form) => allWorkflowSource.includes(form))) {
    failures.push(`GitHub Actions workflows must reference ${acceptedForms.join(' or ')} instead of hardcoded CI/CD credentials`);
  }
}

for (const token of requiredPreflightTokens) {
  if (!allWorkflowSource.includes(token)) {
    failures.push(`GitHub Actions workflows must run ${token} before deploy/release gates`);
  }
}

for (const { path, source } of workflowSources) {
  const lines = source.split('\n');

  for (const forbidden of forbiddenWorkflowPatterns) {
    for (const match of source.matchAll(asGlobalRegExp(forbidden.pattern))) {
      failures.push(`${path}:${lineNumberFor(source, match.index ?? 0)} forbidden CI/CD secret pattern: ${forbidden.name}`);
    }
  }

  lines.forEach((line, index) => {
    if (!/\b(echo|printf|tee|cat)\b/i.test(line)) return;

    if (new RegExp(`${secretScope}\\.`).test(line)) {
      failures.push(`${path}:${index + 1} workflow must not print the GitHub credential context`);
    }

    for (const envName of sensitiveWorkflowEnvNames) {
      const shellVariablePattern = new RegExp(`\\$\\{?${envName}\\}?`);
      if (shellVariablePattern.test(line)) {
        failures.push(`${path}:${index + 1} workflow must not print provider credential variable: ${envName}`);
      }
    }
  });

  if (/vercel\s+(deploy|pull|build)/i.test(source) && !source.includes('environment: production')) {
    failures.push(`${path}: Vercel deploy workflow must use a protected GitHub Environment such as production`);
  }
}

console.log('EuroComply CI/CD credentials and deploy gate check');
console.log('----------------------------------------------------');
console.log(`Scanned ${workflowSources.length} workflow files.`);

if (failures.length > 0) {
  console.error('CI/CD credentials/deploy gate failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('CI/CD credentials and deploy gates: ok');
}
