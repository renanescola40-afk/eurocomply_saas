import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const apiRoot = join(process.cwd(), 'src', 'app', 'api');

const authGuard = ['getCurrentUser', 'requireOrganizationContext'];
const organizationGuard = ['getCurrentOrganizationForUser', 'requireOrganizationContext'];
const rbacGuard = ['assertOrganizationPermission'];
const planGuard = ['assertPlanAtLeast', 'assertGdprSelfServiceEnabled'];
const rateLimitGuard = ['checkDistributedRateLimit'];
const auditGuard = ['createAuditEvent'];
const integrityGuard = ['buildEvidencePackIntegrity'];
const noStoreGuard = ['noStoreJson', 'noStoreDownload', 'Cache-Control'];
const originGuard = ['assertTrustedOrigin', 'verifyTrustedOrigin'];

const endpointRules = [
  {
    name: 'billing checkout',
    match: /src\/app\/api\/billing\/checkout\/route\.ts$/,
    requiredAny: [authGuard, organizationGuard, rbacGuard, originGuard, noStoreGuard],
    requiredAll: ['manage_billing', 'getStripeClient'],
  },
  {
    name: 'billing portal',
    match: /src\/app\/api\/billing\/portal\/route\.ts$/,
    requiredAny: [authGuard, organizationGuard, rbacGuard, originGuard, noStoreGuard],
    requiredAll: ['manage_billing', 'getStripeClient'],
  },
  {
    name: 'Stripe webhook',
    match: /src\/app\/api\/billing\/webhook\/route\.ts$/,
    requiredAny: [],
    requiredAll: ['constructEvent', 'STRIPE_WEBHOOK_SECRET'],
  },
  {
    name: 'enterprise export endpoint',
    match: /src\/app\/api\/(audit\/evidence-pack|security-questionnaire|vendor-assurance|enterprise-readiness|retention-center|continuity-center)\/export?\/route\.ts$|src\/app\/api\/(security-questionnaire|vendor-assurance|enterprise-readiness|retention-center|continuity-center)\/export\/route\.ts$/,
    requiredAny: [authGuard, organizationGuard, rbacGuard, planGuard, rateLimitGuard, auditGuard, integrityGuard, noStoreGuard],
    requiredAll: ['export_data'],
  },
  {
    name: 'audit evidence pack export',
    match: /src\/app\/api\/audit\/evidence-pack\/route\.ts$/,
    requiredAny: [authGuard, organizationGuard, rbacGuard, planGuard, rateLimitGuard, auditGuard, integrityGuard, noStoreGuard],
    requiredAll: ['export_data'],
  },
  {
    name: 'evidence pack verifier',
    match: /src\/app\/api\/audit\/evidence-pack\/verify\/route\.ts$/,
    requiredAny: [rateLimitGuard, noStoreGuard],
    requiredAll: ['verifyEvidencePackIntegrity'],
  },
  {
    name: 'AI governance endpoint',
    match: /src\/app\/api\/ai-(systems|incidents)\/route\.ts$/,
    requiredAny: [authGuard, organizationGuard, rbacGuard, auditGuard, originGuard, noStoreGuard],
    requiredAll: [],
  },
  {
    name: 'ops endpoint',
    match: /src\/app\/api\/ops\/.*\/route\.ts$/,
    requiredAny: [noStoreGuard],
    requiredAll: ['HEALTHCHECK_TOKEN'],
  },
  {
    name: 'team endpoint',
    match: /src\/app\/api\/team\/.*\/route\.ts$/,
    requiredAny: [authGuard, organizationGuard, rbacGuard, rateLimitGuard, originGuard, noStoreGuard],
    requiredAll: ['manage_team'],
  },
  {
    name: 'GDPR endpoint',
    match: /src\/app\/api\/gdpr\/.*\/route\.ts$/,
    requiredAny: [authGuard, organizationGuard, planGuard, auditGuard, noStoreGuard],
    requiredAll: [],
  },
  {
    name: 'GDPR delete request endpoint',
    match: /src\/app\/api\/gdpr\/delete-request\/route\.ts$/,
    requiredAny: [originGuard],
    requiredAll: [],
  },
  {
    name: 'document mutation endpoint',
    match: /src\/app\/api\/documents\/.*\/route\.ts$/,
    requiredAny: [authGuard, organizationGuard, rbacGuard, originGuard, noStoreGuard],
    requiredAll: ['manage_documents'],
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

function hasAnyToken(source, tokens) {
  return tokens.some((token) => source.includes(token));
}

function describeTokenGroup(tokens) {
  return tokens.join(' OR ');
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

    for (const token of rule.requiredAll ?? []) {
      if (!source.includes(token)) {
        failures.push(`${normalized}: ${rule.name} missing required guard token: ${token}`);
      }
    }

    for (const tokens of rule.requiredAny ?? []) {
      if (!hasAnyToken(source, tokens)) {
        failures.push(`${normalized}: ${rule.name} missing one of guard token group: ${describeTokenGroup(tokens)}`);
      }
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
