import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const apiRoot = join(process.cwd(), 'src', 'app', 'api');

const endpointRules = [
  {
    name: 'billing checkout',
    match: /src\/app\/api\/billing\/checkout\/route\.ts$/,
    required: ['requireOrganizationContext', 'assertOrganizationPermission', 'assertPlanAtLeast'],
  },
  {
    name: 'billing portal',
    match: /src\/app\/api\/billing\/portal\/route\.ts$/,
    required: ['requireOrganizationContext', 'assertOrganizationPermission'],
  },
  {
    name: 'Stripe webhook',
    match: /src\/app\/api\/billing\/webhook\/route\.ts$/,
    required: ['constructEvent', 'STRIPE_WEBHOOK_SECRET'],
  },
  {
    name: 'export endpoint',
    match: /src\/app\/api\/.*\/export\/route\.ts$/,
    required: ['requireOrganizationContext', 'assertOrganizationPermission', 'assertPlanAtLeast', 'checkDistributedRateLimit', 'createAuditEvent', 'buildEvidencePackIntegrity'],
  },
  {
    name: 'audit evidence pack export',
    match: /src\/app\/api\/audit\/evidence-pack\/route\.ts$/,
    required: ['requireOrganizationContext', 'assertOrganizationPermission', 'assertPlanAtLeast', 'checkDistributedRateLimit', 'createAuditEvent', 'buildEvidencePackIntegrity'],
  },
  {
    name: 'evidence pack verifier',
    match: /src\/app\/api\/audit\/evidence-pack\/verify\/route\.ts$/,
    required: ['checkDistributedRateLimit', 'verifyEvidencePackIntegrity'],
  },
  {
    name: 'AI governance endpoint',
    match: /src\/app\/api\/ai-(systems|incidents)\/route\.ts$/,
    required: ['requireOrganizationContext', 'assertOrganizationPermission', 'createAuditEvent'],
  },
  {
    name: 'ops endpoint',
    match: /src\/app\/api\/ops\/.*\/route\.ts$/,
    required: ['HEALTHCHECK_TOKEN'],
  },
  {
    name: 'team invite endpoint',
    match: /src\/app\/api\/team\/.*\/route\.ts$/,
    required: ['requireOrganizationContext', 'assertOrganizationPermission', 'checkDistributedRateLimit'],
  },
  {
    name: 'GDPR endpoint',
    match: /src\/app\/api\/gdpr\/.*\/route\.ts$/,
    required: ['requireOrganizationContext', 'assertOrganizationPermission', 'assertPlanAtLeast', 'createAuditEvent'],
  },
  {
    name: 'document mutation endpoint',
    match: /src\/app\/api\/documents\/.*\/route\.ts$/,
    required: ['requireOrganizationContext', 'assertOrganizationPermission'],
  },
];

const forbiddenPatterns = [
  {
    name: 'public service role exposure',
    pattern: /NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE/i,
  },
  {
    name: 'hard-coded Supabase service role JWT prefix',
    pattern: /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/,
  },
];

function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile() && entry.name === 'route.ts') return [fullPath];
    return [];
  });
}

function normalizePath(path) {
  return relative(process.cwd(), path).split(sep).join('/');
}

function evaluateRoute(filePath) {
  const normalized = normalizePath(filePath);
  const source = readFileSync(filePath, 'utf8');
  const failures = [];

  for (const forbidden of forbiddenPatterns) {
    if (forbidden.pattern.test(source)) {
      failures.push(`${normalized}: forbidden pattern detected (${forbidden.name})`);
    }
  }

  for (const rule of endpointRules) {
    if (!rule.match.test(normalized)) continue;
    const missing = rule.required.filter((token) => !source.includes(token));
    if (missing.length > 0) {
      failures.push(`${normalized}: ${rule.name} missing guard token(s): ${missing.join(', ')}`);
    }
  }

  return failures;
}

const routes = walk(apiRoot);
const failures = routes.flatMap(evaluateRoute);

console.log('EuroComply API guard coverage check');
console.log('-----------------------------------');
console.log(`Scanned ${routes.length} API route files.`);

if (failures.length > 0) {
  console.error('Security guard coverage failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('API guard coverage: ok');
}
