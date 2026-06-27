#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const API_ROOT = path.join(ROOT, 'src', 'app', 'api');
const INVENTORY_PATH = path.join(ROOT, 'docs', 'security', 'API_ROUTE_INVENTORY.md');
const CANONICAL_GUARD_PATH = path.join(ROOT, 'src', 'server', 'security', 'api-guard.ts');
const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const KNOWN_CLASSES = new Set([
  'public safe',
  'public mutation',
  'authenticated',
  'tenant-scoped',
  'admin-only',
  'high-risk',
  'webhook',
  'health/internal',
]);

const PUBLIC_SAFE_PATTERNS = [
  /src\/app\/api\/health\/route\.ts$/,
  /src\/app\/api\/ready\/route\.ts$/,
  /src\/app\/api\/public\//,
  /src\/app\/api\/verify\//,
  /src\/app\/api\/og\//,
  /src\/app\/api\/audit\/evidence-pack\/verify\/route\.ts$/,
];
const PUBLIC_MUTATION_PATTERNS = [/src\/app\/api\/leads\/route\.ts$/];

const WEBHOOK_PATTERNS = [/\/webhook\//, /\/webhooks\//, /stripe\/webhook/, /billing\/webhook/];
const INTERNAL_PATTERNS = [/src\/app\/api\/(cron|internal|maintenance|ops|intelligence\/refresh)\//];
const TENANT_TERMS = [
  'organization',
  'organizationId',
  'organization_id',
  'documents',
  'vendors',
  'risks',
  'billing',
  'team',
  'audit',
  'gdpr',
  'retention',
  'ai-systems',
  'ai-incidents',
  'continuity',
  'reports',
  'security-questionnaire',
  'vendor-assurance',
  'enterprise-readiness',
];
const ADMIN_TERMS = ['manage_team', 'manage_billing', 'manage_settings', 'admin', 'owner'];
const HIGH_RISK_TERMS = ['delete', 'approval', 'export', 'upload', 'checkout', 'billing', 'invite', 'members/remove', 'security/settings'];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const absolute = path.join(dir, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) return walk(absolute);
    return absolute.endsWith('route.ts') ? [absolute] : [];
  });
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, '/');
}

function hasAny(source, needles) {
  return needles.some((needle) => source.includes(needle));
}

function exportedMethods(source) {
  return [...source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)].map(
    (match) => match[1],
  );
}

function readInventory() {
  if (!existsSync(INVENTORY_PATH)) return { source: '', routeClasses: new Map(), failures: ['missing docs/security/API_ROUTE_INVENTORY.md'] };

  const source = readFileSync(INVENTORY_PATH, 'utf8');
  const routeClasses = new Map();
  const rowPattern = /^\|\s*`([^`]+route\.ts)`\s*\|\s*([^|]+?)\s*\|/gm;
  for (const match of source.matchAll(rowPattern)) {
    routeClasses.set(match[1], match[2].trim());
  }

  return { source, routeClasses, failures: [] };
}

function classify(relativePath, source) {
  if (WEBHOOK_PATTERNS.some((pattern) => pattern.test(relativePath))) return 'webhook';
  if (INTERNAL_PATTERNS.some((pattern) => pattern.test(relativePath))) return 'health/internal';
  if (PUBLIC_MUTATION_PATTERNS.some((pattern) => pattern.test(relativePath))) return 'public mutation';
  if (PUBLIC_SAFE_PATTERNS.some((pattern) => pattern.test(relativePath))) return 'public safe';
  if (hasAny(source, ADMIN_TERMS) || /\/(admin|team|security\/settings)\//.test(relativePath)) return 'admin-only';
  if (hasAny(relativePath, HIGH_RISK_TERMS) || hasAny(source, HIGH_RISK_TERMS)) return 'high-risk';
  if (hasAny(source, TENANT_TERMS) || hasAny(relativePath, TENANT_TERMS)) return 'tenant-scoped';
  if (hasAny(source, ['requireApiUser', 'getCurrentUser', 'requireAuthenticatedUser', 'requireCurrentUser', 'requireOrganizationContext', 'requirePrivilegedOrganizationContext'])) return 'authenticated';
  return 'unclassified';
}

function checkRoute(file, inventory) {
  const relativePath = rel(file);
  const source = readFileSync(file, 'utf8');
  const methods = exportedMethods(source);
  const mutable = methods.some((method) => MUTATING_METHODS.includes(method));
  const computedClass = classify(relativePath, source);
  const inventoryClass = inventory.routeClasses.get(relativePath);
  const routeClass = inventoryClass ?? computedClass;
  const failures = [];

  const publicOrWebhook = routeClass === 'public safe' || routeClass === 'public mutation' || routeClass === 'webhook' || routeClass === 'health/internal';
  const sensitive = routeClass === 'tenant-scoped' || routeClass === 'admin-only' || routeClass === 'high-risk' || routeClass === 'authenticated';
  const hasCentralGuard = hasAny(source, [
    '@/server/security/api-guard',
    '@/server/security/api-guards',
    '@/server/security/guards',
    '@/server/security/rbac',
    'requireEnterpriseApiAccess',
    'isAuthorizedInternalCronRequest',
    'isAuthorizedInternalMaintenanceRequest',
    'constructEvent',
  ]);
  const hasAuth = hasAny(source, ['requireApiUser', 'getCurrentUser', 'requireAuthenticatedUser', 'requireCurrentUser', 'requireOrganizationContext', 'requirePrivilegedOrganizationContext', 'requireEnterpriseApiAccess']);
  const hasNoStore = hasAny(source, ['noStoreJson', 'noStoreDownload', 'applyNoStoreHeaders', 'secureApiError', 'secureApiJson', 'guardErrorResponse']);
  const hasSanitizedErrors = hasAny(source, ['secureApiError', 'noStoreJson', 'guardErrorResponse', 'secureApiJson']);
  const hasValidation = hasAny(source, ['parseJsonBodyWithZod', 'z.object', 'zod', '.safeParse', '.parse(', 'readBoundedJsonRequest', 'formData()']);
  const hasTenantGuard = hasAny(source, [
    'requireOrganizationContext',
    'requirePrivilegedOrganizationContext',
    'requireOrganizationMembership',
    'requireOrganizationAccess',
    'getCurrentOrganizationForUser',
    'requirePermission',
    'assertOrganizationPermission',
    'assertApiResourceOrganization',
    'assertOrganizationResource',
    'assertSameOrganization',
    ".eq('organization_id'",
    '.eq("organization_id"',
    'organization_id',
    'organization.id',
    'organization?.id',
    'context.organization',
  ]);
  const hasTrustedMutation = hasAny(source, ['requireTrustedOriginForMutation', 'requireTrustedMutation', 'assertTrustedOrigin']);
  const hasRateLimit = hasAny(source, ['requireRateLimit', 'checkDistributedRateLimit', 'checkRateLimit', 'isRateLimited', 'rateLimitByIp', 'requireTrustedMutation']);

  if (!inventoryClass) failures.push('missing explicit inventory classification in docs/security/API_ROUTE_INVENTORY.md');
  if (inventoryClass && !KNOWN_CLASSES.has(inventoryClass)) failures.push(`unknown inventory classification: ${inventoryClass}`);
  if (!inventoryClass && computedClass === 'unclassified') failures.push('route cannot be classified by enterprise API security taxonomy');

  if (routeClass === 'public mutation') {
    if (!mutable) failures.push('public mutation route must expose a mutating handler');
    if (!hasNoStore) failures.push('missing no-store response helper');
    if (!hasSanitizedErrors) failures.push('missing sanitized error response');
    if (!hasRateLimit) failures.push('missing rate limit');
    if (!hasValidation) failures.push('missing bounded input validation');
    if (!source.includes('consentToContact')) failures.push('missing explicit consent validation');
    if (!source.includes('validateEmail')) failures.push('missing email validation');
    if (source.includes('request.json()')) failures.push('must use bounded JSON parsing instead of request.json()');
  }

  if (sensitive && !publicOrWebhook && !hasCentralGuard) failures.push('missing central API guard import/entrypoint');
  if (sensitive && !publicOrWebhook && !hasAuth) failures.push('missing auth guard');
  if (sensitive && !publicOrWebhook && !hasNoStore) failures.push('missing no-store response helper');
  if (sensitive && !publicOrWebhook && !hasSanitizedErrors) failures.push('missing sanitized error response');

  if ((routeClass === 'tenant-scoped' || routeClass === 'admin-only' || routeClass === 'high-risk') && !hasTenantGuard) {
    failures.push('missing tenant/BOLA guard');
  }

  if (mutable && sensitive && routeClass !== 'webhook' && routeClass !== 'health/internal') {
    if (!hasTrustedMutation) failures.push('missing trusted Origin guard');
    if (!hasRateLimit) failures.push('missing rate limit');
    if (!hasValidation) failures.push('missing input validation');
  }

  return { relativePath, routeClass, computedClass, methods: methods.length ? methods : SAFE_METHODS.filter((method) => source.includes(method)), failures };
}

const inventory = readInventory();
const routes = walk(API_ROOT).map((file) => checkRoute(file, inventory));
const failingRoutes = routes.filter((route) => route.failures.length > 0);

if (!existsSync(CANONICAL_GUARD_PATH)) {
  inventory.failures.push('missing canonical src/server/security/api-guard.ts helper');
}

console.log('[security] API route hardening inventory');
for (const route of routes) {
  console.log(`- ${route.relativePath} :: ${route.routeClass} :: ${route.methods.join(', ') || 'no exported methods'}`);
}

if (inventory.failures.length > 0 || failingRoutes.length > 0) {
  console.error('\n[security] API route hardening failures:');
  for (const failure of inventory.failures) console.error(`- ${failure}`);
  for (const route of failingRoutes) {
    console.error(`- ${route.relativePath}: ${route.failures.join('; ')}`);
  }
  process.exit(1);
}

console.log('\n[security] API route hardening checks passed.');
