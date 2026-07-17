import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const apiRoot = join(process.cwd(), 'src', 'app', 'api');

const guards = {
  auth: ['getCurrentUser', 'requireCurrentUser', 'requireAuthenticatedUser', 'requireApiUser', 'requireOrganizationContext', 'requireEnterpriseApiAccess'],
  org: ['getCurrentOrganizationForUser', 'requireOrganizationAccess', 'requireOrganizationContext', 'requireOrganizationMembership', 'requireEnterpriseApiAccess'],
  rbac: ['assertOrganizationPermission', 'requirePermission', 'requireEnterpriseApiAccess'],
  plan: ['assertPlanAtLeast', 'assertGdprSelfServiceEnabled'],
  rateLimit: ['checkDistributedRateLimit', 'checkRateLimit', 'rateLimitByIp', 'rateLimitByUser', 'requireRateLimit', 'requireEnterpriseRateLimit', 'requireTrustedMutation', 'requireEnterpriseApiAccess'],
  audit: ['createAuditEvent', 'writeAuditLog'],
  integrity: ['buildEvidencePackIntegrity'],
  noStore: ['noStoreJson', 'noStoreDownload', 'applyNoStoreHeaders', 'Cache-Control', 'no-store', 'secureApiError', 'secureApiJson'],
  origin: ['assertTrustedOrigin', 'verifyTrustedOrigin', 'requireTrustedOriginForMutation', 'requireTrustedMutation', 'requireEnterpriseApiAccess'],
  stepUp: ['requireStepUpForRequest'],
  internal: ['isAuthorizedInternalCronRequest', 'isAuthorizedInternalMaintenanceRequest', 'noStoreJson'],
  webhook: ['constructEvent', 'stripe-signature', 'noStoreJson'],
};

const rules = [
  {
    name: 'billing entitlements',
    match: /src\/app\/api\/billing\/entitlements\/route\.ts$/,
    any: [guards.auth, guards.org, guards.rateLimit, guards.noStore],
    all: ['billing.entitlements.read'],
  },
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
    all: ['export_data'],
    requireSignedHmac: true,
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
    all: ['read_audit', 'requireStepUpForRequest', 'signed_hmac', 'listAuditChainEventsForVerification', 'verifyAuditChain'],
  },
  {
    name: 'AI systems governance endpoint',
    match: /src\/app\/api\/ai-systems\/route\.ts$/,
    any: [guards.auth, guards.org, guards.rbac, guards.audit, guards.origin, guards.rateLimit, guards.noStore],
    all: [],
  },
  {
    name: 'AI incidents governance endpoint',
    match: /src\/app\/api\/ai-incidents\/route\.ts$/,
    any: [guards.auth, guards.org, guards.rbac, guards.origin, guards.rateLimit, guards.noStore],
    all: ['createAiIncident', 'auditMetadata'],
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
    name: 'security settings endpoint',
    match: /src\/app\/api\/security\/settings\/route\.ts$/,
    any: [guards.auth, guards.org, guards.rbac, guards.rateLimit, guards.origin, guards.stepUp, guards.audit, guards.noStore],
    all: ['manage_settings', 'change_security_settings', 'security_settings_changed'],
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
  { name: 'stack trace exposure', pattern: /error\.stack|stack:\s*error|JSON\.stringify\(\s*error/ },
];

function changedApiRoutes() {
  if (process.env.API_GUARDS_FULL_SCAN === '1') return null;
  if (process.env.GITHUB_EVENT_NAME !== 'pull_request') return null;

  try {
    const changed = execSync('git diff --name-only HEAD^ HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return changed.filter((file) => /^src\/app\/api\/.*\/route\.(ts|js)$/.test(file));
  } catch {
    return null;
  }
}

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

function hasSignedHmacEvidence(source) {
  return source.includes('signed_hmac')
    || (source.includes('buildEvidencePackIntegrity')
      && source.includes('requireStepUpForRequest')
      && source.includes('createAuditEvent')
      && source.includes('payloadHash'));
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
    if (rule.requireSignedHmac && !hasSignedHmacEvidence(source)) {
      failures.push(`${normalized}: ${rule.name} missing signed_hmac or signed HMAC integrity evidence`);
    }
    for (const tokens of rule.any) {
      if (!hasAny(source, tokens)) failures.push(`${normalized}: ${rule.name} missing one of guard token group: ${tokens.join(' OR ')}`);
    }
  }

  return failures;
}

const changedRoutes = changedApiRoutes();
const allRoutes = walk(apiRoot);
const routes = Array.isArray(changedRoutes)
  ? allRoutes.filter((route) => changedRoutes.includes(normalizePath(route)))
  : allRoutes;
const failures = routes.flatMap(evaluateRoute);

console.log('EuroComply API guard coverage check');
console.log('-----------------------------------');
console.log(`Scanned ${routes.length} API route files.`);
if (Array.isArray(changedRoutes) && changedRoutes.length === 0) console.log('No changed API route files detected in this pull request; full API guard scan is skipped for unrelated changes.');

if (failures.length > 0) {
  console.error('Security guard coverage failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('API guard coverage: ok');
}

if (Array.isArray(changedRoutes)) {
  if (changedRoutes.length === 0) {
    console.log('Skipped API route hardening subgate because no changed API route files were detected in this pull request.');
  } else {
    console.log('Skipped full API route taxonomy subgate for pull request mode; changed API routes were checked above.');
  }
} else {
  const hardening = spawnSync(process.execPath, [join(process.cwd(), 'scripts/security/check-api-route-hardening.mjs')], {
    stdio: 'inherit',
  });

  if (hardening.status !== 0) {
    process.exitCode = 1;
  }
}