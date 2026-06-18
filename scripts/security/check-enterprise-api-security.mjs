import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const srcRoot = join(root, 'src');
const apiRoot = join(srcRoot, 'app', 'api');
const ignoredDirectories = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);

const MUTATING_HANDLER = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/g;
const ALL_HANDLER = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g;

const guardGroups = {
  auth: ['getCurrentUser', 'requireCurrentUser', 'requireEnterpriseApiAccess'],
  organization: ['getCurrentOrganizationForUser', 'requireOrganizationContext', 'requireEnterpriseApiAccess'],
  rbac: ['assertOrganizationPermission', 'requireEnterpriseApiAccess'],
  origin: ['assertTrustedOrigin', 'verifyTrustedOrigin', 'requireEnterpriseApiAccess'],
  noStore: ['noStoreJson', 'noStoreDownload', 'applyNoStoreHeaders', 'no-store'],
  rateLimit: ['checkDistributedRateLimit', 'rateLimitByIp', 'rateLimitByUser', 'requireEnterpriseApiAccess'],
  internalAuth: ['isAuthorizedInternalCronRequest', 'HEALTHCHECK_TOKEN', 'CRON_SECRET', 'INTERNAL_CRON_SECRET'],
  tenant: ['organization.id', 'organizationId', 'organization_id', 'resourceOrganizationId', 'requireEnterpriseApiAccess'],
  webhookAuth: ['constructEvent', 'STRIPE_WEBHOOK_SECRET', 'stripe-signature'],
};

const publicVerifierRoutes = [
  /src\/app\/api\/audit\/evidence-pack\/verify\/route\.ts$/,
];

const webhookRoutes = [
  /src\/app\/api\/(billing|stripe)\/webhook\/route\.ts$/,
];

const internalRoutes = [
  /src\/app\/api\/internal\/.*\/route\.ts$/,
  /src\/app\/api\/ops\/.*\/route\.ts$/,
  /src\/app\/api\/intelligence\/refresh\/route\.ts$/,
];

const publicMutationExemptions = [
  ...webhookRoutes,
  ...publicVerifierRoutes,
];

const routeSpecificPermissions = [
  { match: /src\/app\/api\/billing\/(checkout|checkout-intent|portal)\/route\.ts$/, tokens: ['manage_billing'] },
  { match: /src\/app\/api\/team\/.*\/route\.ts$/, tokens: ['manage_team'] },
  { match: /src\/app\/api\/documents\/.*\/route\.ts$/, tokens: ['manage_documents'] },
  { match: /src\/app\/api\/ai-systems\/route\.ts$/, tokens: ['manage_ai_governance', 'read_ai_governance'] },
  { match: /src\/app\/api\/ai-incidents\/route\.ts$/, tokens: ['manage_ai_incidents', 'read_ai_incidents'] },
  { match: /src\/app\/api\/audit\/(chain|evidence-pack).*\/route\.ts$/, tokens: ['read_audit', 'export_data'] },
  { match: /src\/app\/api\/gdpr\/.*\/route\.ts$/, tokens: ['export_data', 'gdpr_delete', 'assertGdprSelfServiceEnabled'] },
  { match: /src\/app\/api\/(vendor-assurance|enterprise-readiness|retention-center|continuity-center|security-questionnaire)\/export\/route\.ts$/, tokens: ['export_data'] },
];

const unsafeErrorPatterns = [
  { name: 'stack trace returned or serialized', pattern: /error\.stack|stack:\s*error|JSON\.stringify\(\s*error/ },
  { name: 'raw error message returned to client', pattern: /(message|details):\s*(error|err|caught|exception)\.message/ },
];

function walk(dir, predicate) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) return [];
      return walk(fullPath, predicate);
    }
    if (!entry.isFile()) return [];
    return predicate(fullPath, entry.name) ? [fullPath] : [];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function hasAny(source, tokens) {
  return tokens.some((token) => source.includes(token));
}

function isAnyMatch(path, patterns) {
  return patterns.some((pattern) => pattern.test(path));
}

function handlers(source, pattern) {
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

function isClientBoundary(path, source) {
  const firstStatements = source
    .split('\n')
    .slice(0, 8)
    .map((line) => line.trim().replace(/;$/, ''));
  const hasDirective = firstStatements.includes("'use client'") || firstStatements.includes('"use client"');
  const hasClientName = /(^|\/)([^/]+-client|client|.*\.client)\.(tsx|ts|jsx|js)$/.test(path);
  return hasDirective || hasClientName;
}

function assertGuard(failures, source, path, groupName, description) {
  if (!hasAny(source, guardGroups[groupName])) {
    failures.push(`${path}: missing ${description} (${guardGroups[groupName].join(' OR ')})`);
  }
}

function evaluateRoute(filePath) {
  const path = normalizePath(filePath);
  const source = readFileSync(filePath, 'utf8');
  const failures = [];
  const mutatingMethods = handlers(source, MUTATING_HANDLER);
  const routeHandlers = handlers(source, ALL_HANDLER);
  const hasMutation = mutatingMethods.length > 0;
  const isInternal = isAnyMatch(path, internalRoutes);
  const isWebhook = isAnyMatch(path, webhookRoutes);
  const isPublicVerifier = isAnyMatch(path, publicVerifierRoutes);
  const isPublicMutationExemption = isAnyMatch(path, publicMutationExemptions);

  if (routeHandlers.length === 0) return failures;

  if (isWebhook) {
    assertGuard(failures, source, path, 'webhookAuth', 'webhook signature validation');
    assertGuard(failures, source, path, 'noStore', 'no-store response protection');
    return failures;
  }

  if (isInternal) {
    assertGuard(failures, source, path, 'internalAuth', 'internal cron/ops authentication');
    assertGuard(failures, source, path, 'noStore', 'no-store response protection');
    return failures;
  }

  if (isPublicVerifier) {
    assertGuard(failures, source, path, 'rateLimit', 'rate limiting');
    assertGuard(failures, source, path, 'noStore', 'no-store response protection');
    if (!source.includes('verifyEvidencePackIntegrity')) {
      failures.push(`${path}: public verifier must validate evidence-pack integrity`);
    }
    return failures;
  }

  if (hasMutation && !isPublicMutationExemption) {
    assertGuard(failures, source, path, 'origin', 'trusted Origin validation for mutable route');
    assertGuard(failures, source, path, 'auth', 'authentication');
    assertGuard(failures, source, path, 'organization', 'organization/tenant context');
    assertGuard(failures, source, path, 'rbac', 'RBAC authorization');
    assertGuard(failures, source, path, 'noStore', 'no-store response protection');
    assertGuard(failures, source, path, 'rateLimit', 'rate limiting');
  }

  if ((hasMutation || path.includes('/export/')) && !isPublicMutationExemption) {
    const permissionRule = routeSpecificPermissions.find((rule) => rule.match.test(path));
    if (permissionRule && !hasAny(source, permissionRule.tokens)) {
      failures.push(`${path}: missing route-specific permission token (${permissionRule.tokens.join(' OR ')})`);
    }
  }

  if (path.includes('[') && !isPublicMutationExemption) {
    assertGuard(failures, source, path, 'tenant', 'tenant/resource organization validation for dynamic resource route');
  }

  for (const unsafe of unsafeErrorPatterns) {
    if (unsafe.pattern.test(source)) {
      failures.push(`${path}: unsafe error handling pattern detected (${unsafe.name})`);
    }
  }

  return failures;
}

function evaluateClientBoundary(filePath) {
  const path = normalizePath(filePath);
  const source = readFileSync(filePath, 'utf8');
  const failures = [];

  if (!isClientBoundary(path, source)) return failures;

  const forbiddenClientTokens = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'service_role',
    'createAdminClient',
    '@/lib/supabase/admin',
  ];

  for (const token of forbiddenClientTokens) {
    if (source.includes(token)) {
      failures.push(`${path}: client boundary references server-only service-role token/helper: ${token}`);
    }
  }

  return failures;
}

const routeFiles = walk(apiRoot, (_path, name) => name === 'route.ts');
const sourceFiles = walk(srcRoot, (_path, name) => /\.(ts|tsx|js|jsx)$/.test(name));
const failures = [
  ...routeFiles.flatMap(evaluateRoute),
  ...sourceFiles.flatMap(evaluateClientBoundary),
];

const adminClientPath = join(root, 'src', 'lib', 'supabase', 'admin.ts');
if (!existsSync(adminClientPath)) {
  failures.push('src/lib/supabase/admin.ts is missing; service-role usage must stay centralized server-side.');
} else {
  const adminClient = readFileSync(adminClientPath, 'utf8');
  if (!adminClient.includes("import 'server-only'")) {
    failures.push('src/lib/supabase/admin.ts must import server-only to block client bundling.');
  }
}

const publicSecretPattern = /NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE/i;
for (const file of sourceFiles) {
  const path = normalizePath(file);
  const source = readFileSync(file, 'utf8');
  if (publicSecretPattern.test(source)) {
    failures.push(`${path}: service role key must never use NEXT_PUBLIC_* naming.`);
  }
}

console.log('EuroComply enterprise API security check');
console.log('-----------------------------------------');
console.log(`Scanned ${routeFiles.length} API route files and ${sourceFiles.length} source files.`);

if (failures.length > 0) {
  console.error('Enterprise API security failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Enterprise API security coverage: ok');
}
