#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const API_ROOT = path.join(ROOT, 'src', 'app', 'api');
const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

const PUBLIC_SAFE_PATTERNS = [
  /src\/app\/api\/health\/route\.ts$/,
  /src\/app\/api\/ready\/route\.ts$/,
  /src\/app\/api\/public\//,
  /src\/app\/api\/verify\//,
  /src\/app\/api\/og\//,
];

const WEBHOOK_PATTERNS = [/\/webhook\//, /\/webhooks\//, /stripe\/webhook/, /billing\/webhook/];
const INTERNAL_PATTERNS = [/src\/app\/api\/(cron|internal|maintenance)\//];
const TENANT_KEYWORDS = [
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
];
const ADMIN_KEYWORDS = ['manage_team', 'manage_billing', 'manage_settings', 'admin', 'owner'];
const HIGH_RISK_KEYWORDS = ['delete', 'approval', 'export', 'upload', 'checkout', 'billing', 'invite', 'members/remove'];

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

function classify(relativePath, source) {
  if (WEBHOOK_PATTERNS.some((pattern) => pattern.test(relativePath))) return 'webhook';
  if (INTERNAL_PATTERNS.some((pattern) => pattern.test(relativePath))) return 'health/internal';
  if (PUBLIC_SAFE_PATTERNS.some((pattern) => pattern.test(relativePath))) return 'public safe';
  if (hasAny(source, ADMIN_KEYWORDS) || /\/admin\//.test(relativePath)) return 'admin-only';
  if (hasAny(relativePath, HIGH_RISK_KEYWORDS) || hasAny(source, HIGH_RISK_KEYWORDS)) return 'high-risk action';
  if (hasAny(source, TENANT_KEYWORDS) || hasAny(relativePath, TENANT_KEYWORDS)) return 'tenant-scoped';
  return 'authenticated';
}

function checkRoute(file) {
  const relativePath = rel(file);
  const source = readFileSync(file, 'utf8');
  const methods = exportedMethods(source);
  const mutable = methods.some((method) => MUTATING_METHODS.includes(method));
  const routeClass = classify(relativePath, source);
  const failures = [];

  const publicOrWebhook = routeClass === 'public safe' || routeClass === 'webhook' || routeClass === 'health/internal';
  const sensitive = routeClass === 'tenant-scoped' || routeClass === 'admin-only' || routeClass === 'high-risk action';
  const hasAuth = hasAny(source, ['requireApiUser', 'getCurrentUser', 'requireAuthenticatedUser', 'requireCurrentUser']);
  const hasNoStore = hasAny(source, ['noStoreJson', 'noStoreDownload', 'applyNoStoreHeaders', 'secureApiError']);
  const hasSanitizedErrors = hasAny(source, ['secureApiError', 'noStoreJson', 'guardErrorResponse']);
  const hasValidation = hasAny(source, ['z.object', 'zod', '.safeParse', '.parse(', 'readBoundedJsonRequest', 'formData()', 'request.json']);
  const hasTenantGuard = hasAny(source, [
    'requireOrganizationAccess',
    'requirePermission',
    'assertOrganizationPermission',
    'assertApiResourceOrganization',
    'assertOrganizationResource',
    'assertSameOrganization',
    ".eq('organization_id'",
    '.eq("organization_id"',
  ]);
  const hasTrustedMutation = hasAny(source, ['requireTrustedMutation', 'assertTrustedOrigin']);
  const hasRateLimit = hasAny(source, ['checkDistributedRateLimit', 'checkRateLimit', 'requireTrustedMutation']);

  if (sensitive && !publicOrWebhook && !hasAuth) failures.push('missing auth guard');
  if (sensitive && !publicOrWebhook && !hasNoStore) failures.push('missing no-store response helper');
  if (sensitive && !publicOrWebhook && !hasSanitizedErrors) failures.push('missing sanitized error response');

  if (sensitive && !hasTenantGuard) failures.push('missing tenant/BOLA guard');

  if (mutable && sensitive && routeClass !== 'webhook' && routeClass !== 'health/internal') {
    if (!hasTrustedMutation) failures.push('missing trusted Origin guard');
    if (!hasRateLimit) failures.push('missing rate limit');
    if (!hasValidation) failures.push('missing input validation');
  }

  return { relativePath, routeClass, methods: methods.length ? methods : SAFE_METHODS.filter((method) => source.includes(method)), failures };
}

const routes = walk(API_ROOT).map(checkRoute);
const failingRoutes = routes.filter((route) => route.failures.length > 0);

console.log('[security] API route hardening inventory');
for (const route of routes) {
  console.log(`- ${route.relativePath} :: ${route.routeClass} :: ${route.methods.join(', ') || 'no exported methods'}`);
}

if (failingRoutes.length > 0) {
  console.error('\n[security] API route hardening failures:');
  for (const route of failingRoutes) {
    console.error(`- ${route.relativePath}: ${route.failures.join('; ')}`);
  }
  process.exit(1);
}

console.log('\n[security] API route hardening checks passed.');
