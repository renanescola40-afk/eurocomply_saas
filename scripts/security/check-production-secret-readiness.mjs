import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join, relative, sep } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

const envExamplePath = '.env.example';
const productionWorkflowPath = '.github/workflows/vercel-production.yml';
const runtimeEvidencePath = 'docs/security/evidence/runtime/production-secrets-provider-stores.json';
const ignoredDirectories = new Set(['.git', '.next', '.turbo', '.vercel', 'coverage', 'dist', 'node_modules', 'playwright-report', 'test-results']);
const n = (...parts) => parts.join('_');
const pub = (...parts) => n('NEXT', 'PUBLIC', ...parts);

const allowedPublicEnvNames = new Set([
  pub('APP', 'URL'),
  pub('SITE', 'URL'),
  pub('SUPABASE', 'URL'),
  pub('SUPABASE', 'ANON', 'KEY'),
  pub('STRIPE', 'PUBLISHABLE', 'KEY'),
  pub('SENTRY', 'DSN'),
]);

const providerSecretVariables = [
  n('SUPABASE', 'SERVICE', 'ROLE', 'KEY'),
  n('SUPABASE', 'ACCESS', 'TOKEN'),
  n('STRIPE', 'SECRET', 'KEY'),
  n('STRIPE', 'WEBHOOK', 'SECRET'),
  n('RESEND', 'API', 'KEY'),
  n('HEALTHCHECK', 'TOKEN'),
  n('AUDIT', 'CHAIN', 'SIGNING', 'SECRET'),
  n('EVIDENCE', 'PACK', 'SIGNING', 'SECRET'),
  n('STEP', 'UP', 'SIGNING', 'SECRET'),
  n('CRON', 'SECRET'),
  n('INTERNAL', 'CRON', 'SECRET'),
  n('UPSTASH', 'REDIS', 'REST', 'URL'),
  n('UPSTASH', 'REDIS', 'REST', 'TOKEN'),
  n('SENTRY', 'DSN'),
  n('SENTRY', 'AUTH', 'TOKEN'),
  n('VERCEL', 'TOKEN'),
  n('VERCEL', 'ORG', 'ID'),
  n('VERCEL', 'PROJECT', 'ID'),
];

const providerPublicVariables = [
  pub('APP', 'URL'),
  pub('SITE', 'URL'),
  pub('SUPABASE', 'URL'),
  pub('SUPABASE', 'ANON', 'KEY'),
  pub('STRIPE', 'PUBLISHABLE', 'KEY'),
  pub('SENTRY', 'DSN'),
  n('TRUSTED', 'ORIGINS'),
  n('STRIPE', 'PRICE', 'ESSENTIAL', 'MONTHLY'),
  n('STRIPE', 'PRICE', 'PROFESSIONAL', 'MONTHLY'),
  n('STRIPE', 'PRICE', 'BUSINESS', 'MONTHLY'),
];

const requiredByEnvironment = {
  development: [pub('APP', 'URL'), pub('SITE', 'URL'), pub('SUPABASE', 'URL'), pub('SUPABASE', 'ANON', 'KEY')],
  preview: [pub('APP', 'URL'), pub('SITE', 'URL'), pub('SUPABASE', 'URL'), pub('SUPABASE', 'ANON', 'KEY'), pub('STRIPE', 'PUBLISHABLE', 'KEY'), n('STRIPE', 'WEBHOOK', 'SECRET')],
  production: [
    pub('APP', 'URL'),
    pub('SITE', 'URL'),
    pub('SUPABASE', 'URL'),
    pub('SUPABASE', 'ANON', 'KEY'),
    n('SUPABASE', 'SERVICE', 'ROLE', 'KEY'),
    n('SUPABASE', 'ACCESS', 'TOKEN'),
    pub('STRIPE', 'PUBLISHABLE', 'KEY'),
    n('STRIPE', 'SECRET', 'KEY'),
    n('STRIPE', 'WEBHOOK', 'SECRET'),
    n('HEALTHCHECK', 'TOKEN'),
    n('AUDIT', 'CHAIN', 'SIGNING', 'SECRET'),
    n('EVIDENCE', 'PACK', 'SIGNING', 'SECRET'),
    n('STEP', 'UP', 'SIGNING', 'SECRET'),
    n('CRON', 'SECRET'),
    n('INTERNAL', 'CRON', 'SECRET'),
    n('UPSTASH', 'REDIS', 'REST', 'URL'),
    n('UPSTASH', 'REDIS', 'REST', 'TOKEN'),
    pub('SENTRY', 'DSN'),
    n('SENTRY', 'DSN'),
    n('SENTRY', 'AUTH', 'TOKEN'),
  ],
};

const serverOnlyEnvNames = [...providerSecretVariables, n('GOOGLE', 'CLIENT', 'SECRET')];
const sensitivePublicNamePattern = /^NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|SERVICE_ROLE|PRIVATE|PASSWORD|WEBHOOK|AUTH_TOKEN|ACCESS_TOKEN|CLIENT_SECRET|DATABASE_URL|STRIPE_SECRET|SUPABASE_SERVICE_ROLE|VERCEL|SENTRY_AUTH)[A-Z0-9_]*$/;
const secretValuePatterns = [
  { name: 'JWT-like token', pattern: /(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'Stripe restricted value', pattern: /(?<![A-Za-z0-9_-])(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { name: 'Stripe webhook signing value', pattern: /(?<![A-Za-z0-9_-])whsec_[A-Za-z0-9]{16,}/g },
  { name: 'GitHub token', pattern: /(?<![A-Za-z0-9_-])(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{20,}/g },
  { name: 'Supabase access token', pattern: /(?<![A-Za-z0-9_-])sbp_[A-Za-z0-9_.-]{20,}/g },
  { name: 'Google OAuth client secret', pattern: /(?<![A-Za-z0-9_-])GOCSPX-[A-Za-z0-9_-]{20,}/g },
  { name: 'Google API key', pattern: /(?<![A-Za-z0-9_-])AIza[0-9A-Za-z_-]{30,}/g },
  { name: 'Resend API key', pattern: /(?<![A-Za-z0-9_-])re_[A-Za-z0-9_]{20,}/g },
];

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return ignoredDirectories.has(entry.name) ? [] : walk(fullPath);
    return entry.isFile() ? [fullPath] : [];
  });
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

function parseEnv(source) {
  const values = new Map();
  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    values.set(trimmed.slice(0, separator).trim(), trimmed.slice(separator + 1).trim().replace(/^[\'"]|[\'"]$/g, ''));
  }
  return values;
}

function isPlaceholderValue(value) {
  return value === ''
    || /^https?:\/\/localhost(?::\d+)?/i.test(value)
    || /^(development|test|preview)$/i.test(value)
    || /^(changeme|change-me|placeholder|example|sample|dummy|redacted|your-|sua-|ci_|ci-|test_|dev-secret)/i.test(value)
    || /^(price_|whsec_|sk_|rk_|sbp_|ghp_|github_pat_|re_)?\.\.\.$/i.test(value)
    || value.includes('example')
    || value.includes('localhost')
    || value.includes('support@')
    || value.includes('no-reply@');
}

function isSensitiveName(name) {
  return /(?:SECRET|TOKEN|PRIVATE|PASSWORD|SERVICE_ROLE|WEBHOOK|AUTH|API_KEY|CLIENT_SECRET)/i.test(name);
}

function scanSecretValues(path, source) {
  for (const secret of secretValuePatterns) {
    for (const match of source.matchAll(secret.pattern)) {
      if (!isPlaceholderValue(match[0])) failures.push(`${path}:${lineNumberFor(source, match.index ?? 0)} possible committed secret value: ${secret.name}`);
    }
  }
}

function checkEnvExample() {
  if (!existsSync(join(root, envExamplePath))) {
    failures.push(`${envExamplePath} is missing`);
    return new Map();
  }
  const source = read(envExamplePath);
  const values = parseEnv(source);
  scanSecretValues(envExamplePath, source);
  for (const names of Object.values(requiredByEnvironment)) {
    for (const name of names) if (!values.has(name)) failures.push(`${envExamplePath} missing required variable name: ${name}`);
  }
  for (const [name, value] of values) {
    if (sensitivePublicNamePattern.test(name) && !allowedPublicEnvNames.has(name)) failures.push(`${envExamplePath} exposes sensitive name with NEXT_PUBLIC prefix: ${name}`);
    if (isSensitiveName(name) && !isPlaceholderValue(value)) failures.push(`${envExamplePath} ${name} must be empty or an obvious placeholder`);
  }
  return values;
}

function checkClientBoundary() {
  for (const file of walk(join(root, 'src')).filter((entry) => /\.(ts|tsx|js|jsx)$/.test(entry))) {
    const path = normalizePath(file);
    const source = readFileSync(file, 'utf8');
    const isClient = /^\s*['"]use client['"];?/m.test(source) || /\.client\.(?:ts|tsx|js|jsx)$/.test(path);
    for (const match of source.matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) {
      const name = match[0];
      if (sensitivePublicNamePattern.test(name) && !allowedPublicEnvNames.has(name)) failures.push(`${path}:${lineNumberFor(source, match.index ?? 0)} sensitive env name uses NEXT_PUBLIC prefix: ${name}`);
    }
    if (!isClient) continue;
    for (const envName of serverOnlyEnvNames) {
      if (source.includes(envName)) failures.push(`${path} is client-side and references server-only env: ${envName}`);
    }
  }
}

function checkDocs() {
  for (const file of walk(join(root, 'docs'))) {
    const path = normalizePath(file);
    if (['.md', '.mdx', '.txt', '.json', '.yml', '.yaml'].includes(extname(path))) scanSecretValues(path, readFileSync(file, 'utf8'));
  }
}

function checkWorkflows() {
  for (const file of walk(join(root, '.github', 'workflows')).filter((entry) => /\.(ya?ml)$/.test(entry))) {
    const path = normalizePath(file);
    const source = readFileSync(file, 'utf8');
    scanSecretValues(path, source);
    source.split('\n').forEach((line, index) => {
      if (!/\b(echo|printf|tee|cat)\b/i.test(line)) return;
      if (/\$\{\{\s*secrets(?:\.|\[['"])/i.test(line)) failures.push(`${path}:${index + 1} workflow must not print GitHub secrets context`);
      for (const envName of serverOnlyEnvNames) {
        if (new RegExp(`\\$\\{?${envName}\\}?`).test(line)) failures.push(`${path}:${index + 1} workflow must not print server/provider secret variable: ${envName}`);
      }
    });
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function providerReferencePattern(context, name) {
  return `${escapeRegex(context)}\\.${escapeRegex(name)}|${escapeRegex(context)}\\[['"]${escapeRegex(name)}['"]\\]`;
}

function requireWorkflowProviderMapping(source, name, contexts) {
  const acceptedReferences = contexts.map((context) => providerReferencePattern(context, name)).join('|');
  const pattern = new RegExp(`^\\s*${escapeRegex(name)}:\\s*\\$\\{\\{\\s*(?:${acceptedReferences})\\s*\\}\\}\\s*$`, 'm');
  if (!pattern.test(source)) failures.push(`${productionWorkflowPath} must map ${name} from provider ${contexts.join('/')} context, never from repo literals`);
}

function checkProviderStoreWiring() {
  if (!existsSync(join(root, productionWorkflowPath))) {
    failures.push(`${productionWorkflowPath} is missing`);
    return;
  }
  const source = read(productionWorkflowPath);
  providerSecretVariables.forEach((name) => requireWorkflowProviderMapping(source, name, ['secrets']));
  providerPublicVariables.forEach((name) => requireWorkflowProviderMapping(source, name, ['vars', 'secrets']));
}

function checkHistoryReferences() {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, stdio: 'ignore' });
    const output = execFileSync('git', ['log', '--all', '--name-only', '--pretty=format:%H', '--', '.env', '.env.*'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const files = new Set(output.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('.env') && basename(line) !== '.env.example'));
    for (const file of files) warnings.push(`git history references committed environment file ${file}; Gitleaks remains the failing control for actual secret values`);
  } catch {
    warnings.push('unable to inspect git history for committed .env files; run from a full checkout for historical filename audit');
  }
}

function checkEvidence(envValues) {
  if (!existsSync(join(root, runtimeEvidencePath))) {
    failures.push(`${runtimeEvidencePath} is missing`);
    return;
  }
  let evidence;
  try {
    evidence = JSON.parse(read(runtimeEvidencePath));
  } catch (error) {
    failures.push(`${runtimeEvidencePath} is not valid JSON: ${error instanceof Error ? error.message : error}`);
    return;
  }
  for (const field of ['status', 'provider', 'environmentsChecked', 'variableNamesChecked', 'valuesRedacted', 'reviewer', 'timestamp', 'commitSha', 'note']) {
    if (!(field in evidence)) failures.push(`${runtimeEvidencePath} missing field: ${field}`);
  }
  if (evidence.status !== 'Complete') failures.push(`${runtimeEvidencePath} status must be Complete before the P0 register is marked Complete`);
  if (evidence.valuesRedacted !== true) failures.push(`${runtimeEvidencePath} must set valuesRedacted to true`);
  if (!Array.isArray(evidence.environmentsChecked) || !evidence.environmentsChecked.includes('production')) failures.push(`${runtimeEvidencePath} must include production in environmentsChecked`);
  if (!String(evidence.note ?? '').toLowerCase().includes('privately')) failures.push(`${runtimeEvidencePath} note must state value-bearing screenshots/exports are stored privately, not in repo`);
  if (!Array.isArray(evidence.variableNamesChecked)) {
    failures.push(`${runtimeEvidencePath} variableNamesChecked must be an array`);
    return;
  }
  const checked = new Set(evidence.variableNamesChecked);
  const expected = new Set([...Object.values(requiredByEnvironment).flat(), ...providerSecretVariables, ...providerPublicVariables, ...envValues.keys()]);
  for (const name of expected) if (!checked.has(name)) failures.push(`${runtimeEvidencePath} missing variableNamesChecked entry: ${name}`);
}

const envValues = checkEnvExample();
checkClientBoundary();
checkDocs();
checkWorkflows();
checkProviderStoreWiring();
checkHistoryReferences();
checkEvidence(envValues);

console.log('EuroComply production secret readiness check');
console.log('---------------------------------------------');
if (warnings.length > 0) {
  console.warn('Production secret readiness warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (failures.length > 0) {
  console.error('Production secret readiness failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Production secret readiness: ok');
}
