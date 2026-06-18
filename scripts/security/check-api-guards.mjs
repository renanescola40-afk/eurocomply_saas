import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const apiRoot = join(process.cwd(), 'src', 'app', 'api');

const authGuard = ['getCurrentUser', 'requireCurrentUser', 'requireOrganizationContext', 'requireEnterpriseApiAccess'];
const organizationGuard = ['getCurrentOrganizationForUser', 'requireOrganizationContext', 'requireEnterpriseApiAccess'];
const rbacGuard = ['assertOrganizationPermission', 'requireEnterpriseApiAccess'];
const planGuard = ['assertPlanAtLeast', 'assertGdprSelfServiceEnabled'];
const rateLimitGuard = ['checkDistributedRateLimit', 'rateLimitByIp', 'rateLimitByUser', 'requireEnterpriseApiAccess'];
const auditGuard = ['createAuditEvent'];
const integrityGuard = ['buildEvidencePackIntegrity'];
const noStoreGuard = ['noStoreJson', 'noStoreDownload', 'applyNoStoreHeaders', 'Cache-Control', 'no-store'];
const originGuard = ['assertTrustedOrigin', 'verifyTrustedOrigin', 'requireEnterpriseApiAccess'];
const stepUpGuard = ['requireStepUpForRequest'];
const internalAuthGuard = ['isAuthorizedInternalCronRequest', 'HEALTHCHECK_TOKEN', 'CRON_SECRET', 'INTERNAL_CRON_SECRET'];

const endpointRules = [
  {
    name: 'billing checkout',
    match: /src\/app\/api\/billing\/(checkout|checkout-intent)\/route\.ts$/,
    requiredAny: [authGuard, organizationGuard, rbacGuard, originGuard, rateLimitGuard, noStoreGuard],
    requiredAll: ['manage_billing'],
  },
  {
    name: 'billing portal',
    match: /src\/app\/api\/billing\/portal\/route\.ts$/,
    requiredAny: [authGuard, organizationGuard, rbacGuard, originGuard, rateLimitGuard, noStoreGuard],
    requiredAll: ['manage_billing', 'getStripeClient'],
  },
  {
    name: 'Stripe webhook',
    match: /src\/app\/api\/(billing|stripe)\/webhook\/route\.ts$/,
    requiredAny: [noStoreGuard],
    requiredAll: ['constructEvent', 'STRIPE_WEBHOOK_SECRET'],
  },
  {
    name: 'enterprise export endpoint',
    match: /src\/app\/api\/(audit\/evidence-pack|security-questionnaire|vendor-assurance|enterprise-readiness|retention-center|continuity-center)\/export?\/route\.ts$|src\/app\/api\/(security-questionnaire|vendor-assurance|enterprise-readiness|retention-center|continuity-center)\/export\/route\.ts$/,
    requiredAny: [authGuard, organizationGuard, rbacGuard, planGuard, rateLimitGuard, auditGuard, integrityGuard, stepUpGuard, noStoreGuard],
    requiredAll: ['export_data', 'signed_hmac'],
  },
  {
    name: 'audit evidence pack export',
    match: /src\/app\/api\/audit\/evidence-pack\/route\.ts$/,
    requiredAny: [authGuard, organizationGuard, rbacGuard, planGuard, rateLimitGuard, auditGuard, integrityGuard, stepUpGuard, noStoreGuard],
    requiredAll: ['export_data', 'requireStepUpForRequest', 'signed_hmac', 'stepUpVerifiedAt'],
  },
  {
    name: 'evidence pack verifier',
    match: /src\/app\/api\/audit\/evidence-pack\/verify\/route\.ts$/,
    requiredAny: [rateLimitGuard, noStoreGuard],
    requiredAll: ['verifyEvidencePackIntegrity'],
  },
  {
    name: 'audit chain verifier',
    match: /src\/app\/api\/audit\/chain\/verify\/route\.ts$/,
    requiredAny: [authGuard, organizationGuard, rbacGuard, planGuard, rateLimitGuard, stepUpGuard, noStoreGuard],
    requiredAll: [
      'read_audit',
      'requireStepUpForRequest',
      'signed_hmac',
      'listAuditEvents',
      'verifyAuditChain',
      'legacyEvents',
      'chainedEventsChecked',
    ],
  },
  {
    name: 'AI governance endpoint',
    match: /src\/app\/api\/ai-(systems|incidents)\/route\.ts$/,
    requiredAny: [authGuard, organizationGuard, rbacGuard, auditGuard, originGuard, rateLimitGuard, noStoreGuard],
    requiredAll: [],
  },
  {
    name: 'ops endpoint',
    match: /src\/app\/api\/ops\/.*\/route\.ts$/,
    requiredAny: [internalAuthGuard, noStoreGuard],
    requiredAll: [],
  },
  {
    name: 'internal cron endpoint',
    match: /src\/app\/api\/internal\/.*\/route\.ts$|src\/app\/api\/intelligence\/refresh\/route\.ts$/,
    requiredAny: [internalAuthGuard, noStoreGuard],
    requiredAll: [],
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
    requiredAny: [originGuard, rateLimitGuard],
    requiredAll: [],
  },
  {
    name: 'document mutation endpoint',
    match: /src\/app\/api\/documents\/.*\/route\.ts$/,
    requiredAny: [authGuard, organizationGuard, rbacGuard, originGuard, rateLimitGuard, noStoreGuard],
    requiredAll: ['manage_documents'],
  },
  {
    name: 'step-up challenge endpoint',
    match: /src\/app\/api\/security\/step-up\/challenge\/route\.ts$/,
    requiredAny: [authGuard, organizationGuard, originGuard, rateLimitGuard, noStoreGuard],
    requiredAll: [],
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
  {
    name: 'stack trace exposure',
    pattern: /error\.stack|stack:\s*error|JSON\.stringify\(\s*error/,
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
