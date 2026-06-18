import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const apiRoot = join(process.cwd(), 'src', 'app', 'api');

const guards = {
  auth: ['getCurrentUser', 'requireCurrentUser', 'requireOrganizationContext', 'requireEnterpriseApiAccess'],
  org: ['getCurrentOrganizationForUser', 'requireOrganizationContext', 'requireEnterpriseApiAccess'],
  rbac: ['assertOrganizationPermission', 'requireEnterpriseApiAccess'],
  plan: ['assertPlanAtLeast', 'assertGdprSelfServiceEnabled'],
  rateLimit: ['checkDistributedRateLimit', 'rateLimitByIp', 'rateLimitByUser', 'requireEnterpriseApiAccess'],
  audit: ['createAuditEvent'],
  integrity: ['buildEvidencePackIntegrity'],
  noStore: ['noStoreJson', 'noStoreDownload', 'applyNoStoreHeaders', 'Cache-Control', 'no-store'],
  origin: ['assertTrustedOrigin', 'verifyTrustedOrigin', 'requireEnterpriseApiAccess'],
  stepUp: ['requireStepUpForRequest'],
  internal: ['isAuthorizedInternalCronRequest', 'HEALTHCHECK_TOKEN', 'CRON_SECRET', 'INTERNAL_CRON_SECRET'],
  webhook: ['constructEvent', 'STRIPE_WEBHOOK_SECRET', 'stripe-signature'],
};

const rules = [
  {
    name: 'billing checkout',
    match: /src\/app\/api\/billing\/checkout\/route\.ts$/,
    any: [guards.auth, guards.org, guards.rbac, guards.origin, guards.rateLimit, guards.noStore],
    all: ['manage_billing'],
  },
  {
    name: 'billing portal',
    match: /src\/app\/api\/billing\/portal\/route\.ts$/,
    any: [guards.auth, guards.org, guards.rbac, guards.origin, guards.rateLimit, guards.noStore],
    all: ['manage_billing', 'getStripeClient'],
  },
  {
    name: 'Stripe webhook',
    match: /src\/app\/api\/(billing|stripe)\/webhook\/route\.ts$/,
    any: [guards.webhook, guards.noStore],
    all: [],
  },
  {
    name: 'enterprise export endpoint',
    match: /src\/app\/api\/(audit\/evidence-pack|security-questionnaire|vendor-assurance|enterprise-readiness|retention-center|continuity-center)\/export?\/route\.ts$|src\/app\/api\/(security-questionnaire|vendor-assurance|enterprise-readiness|retention-center|continuity-center)\/export\/route\.ts$/,
    any: [guards.auth, guards.org, guards.rbac, guards.plan, guards.rateLimit, guards.audit, guards.integrity, guards.stepUp, guards.noStore],
    all: ['export_data', 'signed_hmac'],
  },
  {
    name: 'evidence pack verifier',
    match: /src\/app\/api\/audit\/evidence-pack\/verify\/route\.ts$/,
    any: [guards.rateLimit, guards.noStore],
    all: ['verifyEvidencePackIntegrity'],
  },
  {
    name: 'audit chain verifier',
    match: /src\/app\/api\/audit\/chain\/verify\/route\.ts$/,
    any: [guards.auth, guards.org, guards.rbac, guards.plan, guards.rateLimit, guards.stepUp, guards.noStore],
    all: ['read_audit', 'requireStepUpForRequest', 'signed_hmac', 'listAuditEvents', 'verifyAuditChain'],
  },
  {
    name: 'AI governance endpoint',
    match: /src\/app\/api\/ai-(systems|incidents)\/route\.ts$/,
    any: [guards.auth, guards.org, guards.rbac, guards.audit, guards.origin, guards.rateLimit, guards.noStore],
    all: [],
  },
  {
    name: 'internal cron or ops endpoint',
    match: /src\/app\/api\/(internal\/.*|ops\/.*|intelligence\/refresh)\/route\.ts$/,
    any: [guards.internal, guards.noStore],
    all: [],
  },
  {
    name: 'team endpoint',
    match: /src\/app\/api\/team\/.*\/route\.ts$/,
    any: [guards.auth, guards.org, guards.rbac, guards.rateLimit, guards.origin, guards.noStore],
    all: ['manage_team'],
  },
  {
    name: 'GDPR endpoint',
    match: /src\/app\/api\/gdpr\/.*\/route\.ts$/,
    any: [guards.auth, guards.org, guards.plan, guards.audit, guards.noStore],
    all: [],
  },
  {
    name: 'GDPR delete request endpoint',
    match: /src\/app\/api\/gdpr\/delete-request\/route\.ts$/,
    any: [guards.origin, guards.rateLimit],
    all: [],
  },
  {
    name: 'document mutation endpoint',
    match: /src\/app\/api\/documents\/.*\/route\.ts$/,
    any: [guards.auth, guards.org, guards.rbac, guards.origin, guards.rateLimit, guards.noStore],
    all: ['manage_documents'],
  },
  {
    name: 'step-up challenge endpoint',
    match: /src\/app\/api\/security\/step-up\/challenge\/route\.ts$/,
    any: [guards.auth, guards.org, guards.origin, guards.rateLimit, guards.noStore],
    all: [],
  },
];

const forbidden = [
  { name: 'public service role exposure', pattern: /NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE/i },
  { name: 'stack trace exposure', pattern: /error\.stack|stack:\s*error|JSON\.stringify\(\s*error/ },
];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && entry.name === 'route.ts' ? [fullPath] : [];
  });
}

function normalizePath(path) {
  return relative(process.cwd(), path).split(sep).join('/');
}

function hasAny(source, tokens) {
  return tokens.some((token) => source.includes(token));
}

function evaluateRoute(filePath) {
  const normalized = normalizePath(filePath);
  const source = readFileSync(filePath, 'utf8');
  const failures = [];

  for (const item of forbidden) {
    if (item.pattern.test(source)) failures.push(`${normalized}: forbidden pattern detected (${item.name})`);
  }

  for (const rule of rules) {
    if (!rule.match.test(normalized)) continue;
    for (const token of rule.all) {
      if (!source.includes(token)) failures.push(`${normalized}: ${rule.name} missing required guard token: ${token}`);
    }
    for (const tokens of rule.any) {
      if (!hasAny(source, tokens)) failures.push(`${normalized}: ${rule.name} missing one of guard token group: ${tokens.join(' OR ')}`);
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
