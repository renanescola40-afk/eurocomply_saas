import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const srcRoot = join(root, 'src');
const apiRoot = join(srcRoot, 'app', 'api');
const ignoredDirectories = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);

const MUTATING_HANDLER = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/g;
const ALL_HANDLER = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g;

const guardGroups = {
  auth: ['getCurrentUser', 'requireCurrentUser', 'requireApiUser', 'requireEnterpriseApiAccess'],
  organization: ['getCurrentOrganizationForUser', 'requireOrganizationContext', 'requireEnterpriseApiAccess'],
  rbac: ['assertOrganizationPermission', 'requirePermission', 'requireEnterpriseApiAccess'],
  origin: ['assertTrustedOrigin', 'verifyTrustedOrigin', 'requireTrustedMutation', 'requireEnterpriseApiAccess'],
  noStore: ['noStoreJson', 'noStoreDownload', 'applyNoStoreHeaders', 'no-store'],
  rateLimit: ['checkDistributedRateLimit', 'rateLimitByIp', 'rateLimitByUser', 'isRateLimited', 'requireTrustedMutation', 'requireEnterpriseApiAccess'],
  internalAuth: ['isAuthorizedInternalCronRequest', 'HEALTHCHECK_' + 'TOKEN', 'CRON_' + 'SECRET', 'INTERNAL_CRON_' + 'SECRET'],
  tenant: ['organization.id', 'organizationId', 'organization_id', 'resourceOrganizationId', 'requireEnterpriseApiAccess'],
  webhookAuth: ['constructEvent', 'STRIPE_WEBHOOK_' + 'SECRET', 'stripe-signature'],
};

const delegatedGateScripts = [
  'scripts/security/check-route-entrypoints.mjs',
  'scripts/security/check-upload-security.mjs',
  'scripts/security/check-upload-content-scan.mjs',
  'scripts/security/check-json-body-limits.mjs',
  'scripts/security/check-billing-return-url.mjs',
  'scripts/security/check-billing-page-boundary.mjs',
  'scripts/security/check-billing-checkout-intent.mjs',
  'scripts/security/check-ready-endpoint-security.mjs',
  'scripts/security/check-step-up-response-contract.mjs',
  'scripts/security/check-audit-chain-verify-contract.mjs',
  'scripts/security/check-enterprise-readiness-export-contract.mjs',
  'scripts/security/check-continuity-export-contract.mjs',
  'scripts/security/check-governance-export-contracts.mjs',
  'scripts/security/check-stripe-webhook-contract.mjs',
  'scripts/security/check-auth-redirect-base-url.mjs',
  'scripts/security/check-audit-chain.mjs',
];

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
  /src\/app\/api\/observability\/smoke\/route\.ts$/,
];

const privateReadOnlyPostRoutes = [
  /src\/app\/api\/billing\/checkout-intent\/route\.ts$/,
];

const clerkOrganizationSyncRoutes = [
  /src\/app\/api\/clerk\/organizations\/sync\/route\.ts$/,
];

const publicLeadCaptureRoutes = [
  /src\/app\/api\/leads\/route\.ts$/,
];

const publicMutationExemptions = [
  ...webhookRoutes,
  ...publicVerifierRoutes,
  ...publicLeadCaptureRoutes,
];

const routeSpecificPermissions = [
  { match: /src\/app\/api\/billing\/(checkout|portal)\/route\.ts$/, tokens: ['manage_billing'] },
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

function isServerOnlySource(source) {
  return source.includes("import 'server-only'") || source.includes('import "server-only"');
}

function isClientBoundary(path, source) {
  const firstStatements = source
    .split('\n')
    .slice(0, 8)
    .map((line) => line.trim().replace(/;$/, ''));
  const hasDirective = firstStatements.includes("'use client'") || firstStatements.includes('"use client"');

  if (hasDirective) return true;
  if (isServerOnlySource(source)) return false;

  const hasClientName = /(^|\/)([^/]+-client|client|.*\.client)\.(tsx|ts|jsx|js)$/.test(path);
  return hasClientName;
}

function assertGuard(failures, source, path, groupName, description) {
  if (!hasAny(source, guardGroups[groupName])) {
    failures.push(`${path}: missing ${description} (${guardGroups[groupName].join(' OR ')})`);
  }
}

function assertRequiredTokens(failures, source, path, contractName, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) {
      failures.push(`${path}: missing ${contractName} contract token ${token}`);
    }
  }
}

function evaluateClerkOrganizationSyncContract(failures, source, path) {
  if (!isAnyMatch(path, clerkOrganizationSyncRoutes)) return false;

  assertRequiredTokens(failures, source, path, 'Clerk organization sync', [
    'const authState = await auth()',
    'const userId = authState.userId',
    'const orgId = authState.orgId',
    'orgRole',
    'if (!userId || !orgId)',
    "return noStoreJson({ error: 'unauthorized' }, { status: 401 })",
    'requireTrustedMutation',
    "policy: 'general-api'",
    'action: \'clerk.organization.sync\'',
    "route: '/api/clerk/organizations/sync'",
    'readBoundedJsonRequest',
    'maxBytes: 2048',
    'ValidationError',
    "return noStoreJson({ error: 'invalid_organization_payload' }, { status: 400 })",
    'parsedBody.data.clerkOrgId !== orgId',
    'clerkClient',
    'client.organizations.getOrganization',
    'name: clerkOrganization.name',
    'slug: clerkOrganization.slug',
    'syncClerkOrganizationToSupabase',
    'secureApiError',
  ]);

  assertGuard(failures, source, path, 'origin', 'trusted Origin validation for mutable route');
  assertGuard(failures, source, path, 'noStore', 'no-store response protection');
  assertGuard(failures, source, path, 'rateLimit', 'rate limiting');

  return true;
}

function evaluatePublicLeadCaptureContract(failures, source, path) {
  if (!isAnyMatch(path, publicLeadCaptureRoutes)) return false;

  assertGuard(failures, source, path, 'noStore', 'no-store response protection');
  assertGuard(failures, source, path, 'rateLimit', 'rate limiting');
  assertRequiredTokens(failures, source, path, 'public lead capture', [
    'readBoundedJsonRequest',
    'LEAD_CAPTURE_BODY_MAX_BYTES',
    'requireJsonContentType: true',
    'validateEmail',
    'consentToContact',
    'isRateLimited(ipHint)',
    "return noStoreJson({ ok: true }, { status: 201 })",
  ]);

  return true;
}

function evaluateGdprExportContract(failures, source, path) {
  if (path !== 'src/app/api/gdpr/export/route.ts') return;

  if (!source.includes('sanitizeDocumentDownloadFileName')) {
    failures.push(`${path}: GDPR export filename must use the shared download filename sanitizer.`);
  }

  if (/organization\s*,/.test(source)) {
    failures.push(`${path}: GDPR export must export an explicit minimal organization shape, not the full object.`);
  }

  if (/filename="eurocomply-gdpr-export-\$\{/.test(source)) {
    failures.push(`${path}: GDPR export must not interpolate organization data directly into Content-Disposition.`);
  }

  if (!source.includes('X-Content-Type-Options')) {
    failures.push(`${path}: GDPR export must set nosniff for downloaded JSON.`);
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
  const isPrivateReadOnlyPost = isAnyMatch(path, privateReadOnlyPostRoutes);
  const isPublicMutationExemption = isAnyMatch(path, publicMutationExemptions);

  if (routeHandlers.length === 0) return failures;

  if (evaluateClerkOrganizationSyncContract(failures, source, path)) {
    return failures;
  }

  if (evaluatePublicLeadCaptureContract(failures, source, path)) {
    return failures;
  }

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

  if (isPrivateReadOnlyPost) {
    assertGuard(failures, source, path, 'auth', 'authentication');
    assertGuard(failures, source, path, 'organization', 'organization/tenant context');
    assertGuard(failures, source, path, 'noStore', 'no-store response protection');
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

  evaluateGdprExportContract(failures, source, path);

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
    'SUPABASE_' + 'SERVICE_ROLE_KEY',
    'service_' + 'role',
    'create' + 'AdminClient',
    '@/lib/supabase/admin',
  ];

  for (const token of forbiddenClientTokens) {
    if (source.includes(token)) {
      failures.push(`${path}: client boundary references server-only service-role token/helper: ${token}`);
    }
  }

  return failures;
}

function evaluateAuditEvidencePackExportContract() {
  const routePath = join(apiRoot, 'audit', 'evidence-pack', 'route.ts');
  if (!existsSync(routePath)) return ['src/app/api/audit/evidence-pack/route.ts is missing'];

  const source = readFileSync(routePath, 'utf8');
  const path = normalizePath(routePath);
  const failures = [];
  const requiredTokens = [
    'publicStepUpSummary',
    'noStoreDownload',
    'noStoreJson',
    'sanitizeDocumentDownloadFileName',
    'X-Content-Type-Options',
  ];

  for (const token of requiredTokens) {
    if (!source.includes(token)) {
      failures.push(`${path}: missing required export contract token ${token}`);
    }
  }

  if (source.includes("from 'next/server'")) {
    failures.push(`${path}: must use shared no-store response helpers instead of direct next/server response creation`);
  }

  if (source.includes('stepUp: {')) {
    failures.push(`${path}: must not hand-build step-up details in exported payloads`);
  }

  return failures;
}

function runDelegatedGate(scriptPath) {
  const fullPath = join(root, scriptPath);
  if (!existsSync(fullPath)) {
    return `${scriptPath} is missing; delegated enterprise gate cannot run`;
  }

  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    stdio: 'inherit',
  });

  if (result.error) {
    return `${scriptPath} failed to execute: ${result.error.message}`;
  }

  if (result.status !== 0) {
    return `${scriptPath} failed as part of enterprise API security coverage`;
  }

  return null;
}

const routeFiles = walk(apiRoot, (_path, name) => name === 'route.ts');
const sourceFiles = walk(srcRoot, (_path, name) => /\.(ts|tsx|js|jsx)$/.test(name));
const failures = [
  ...routeFiles.flatMap(evaluateRoute),
  ...sourceFiles.flatMap(evaluateClientBoundary),
  ...evaluateAuditEvidencePackExportContract(),
];

for (const scriptPath of delegatedGateScripts) {
  const failure = runDelegatedGate(scriptPath);
  if (failure) failures.push(failure);
}

const adminClientPath = join(root, 'src', 'lib', 'supabase', 'admin.ts');
if (!existsSync(adminClientPath)) {
  failures.push('src/lib/supabase/admin.ts is missing; server-side admin client boundary cannot be verified');
} else {
  const adminSource = readFileSync(adminClientPath, 'utf8');
  if (!adminSource.includes("import 'server-only'")) {
    failures.push('src/lib/supabase/admin.ts must import server-only to prevent client bundle leakage');
  }
}

console.log('EuroComply enterprise API security check');
console.log('----------------------------------------');
console.log(`Scanned ${routeFiles.length} API route handlers and ${sourceFiles.length} source files.`);

if (failures.length > 0) {
  console.error('Enterprise API security failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Enterprise API security: ok');
}
