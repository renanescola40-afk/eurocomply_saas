#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { analyzeExportedRouteHandlers } from './lib/api-route-ast.mjs';

const ROOT = process.cwd();
const API_ROOTS = [
  path.join(ROOT, 'src', 'app', 'api'),
  path.join(ROOT, 'src', 'app', 'next_api'),
];
const INVENTORY_FILES = [
  path.join(ROOT, 'docs', 'security', 'API_ROUTE_INVENTORY.md'),
  path.join(ROOT, 'docs', 'security', 'API_ROUTE_INVENTORY.billing.md'),
];

const BILLING_RECOVERY_AUTH_ONLY = new Set([
  'src/app/api/billing/checkout/activation/route.ts',
  'src/app/api/billing/entitlements/route.ts',
]);

const PUBLIC_CLASSES = new Set(['public safe', 'public mutation']);
const MACHINE_AUTH_CLASSES = new Set(['integration', 'webhook', 'health/internal']);

// Only repository-owned, semantically explicit session guards count here.
// Generic names such as `auth()` or `getUser()` are intentionally excluded:
// a future local helper with one of those names must never manufacture a
// false-green authorization result.
const SESSION_GUARDS = new Set([
  'requireApiUser',
  'getCurrentUser',
  'requireCurrentUser',
  'requireAuthenticatedUser',
]);

const TENANT_CONTEXT = new Set([
  'getCurrentOrganizationForUser',
  'requireOrganizationAccess',
  'requireOrganizationContext',
  'requirePrivilegedOrganizationContext',
  'requireOrganizationMembership',
]);

const AUTHORIZATION_GUARDS = new Set([
  'requirePermission',
  'assertOrganizationPermission',
  'requirePlatformCapability',
  'requireEnterpriseApiAccess',
  'authenticateScimRequest',
  'getReviewerSession',
  'requireReviewerSession',
  'requireQualifiedReviewerSession',
]);

const MACHINE_AUTH_GUARDS = new Set([
  'validateBearerToken',
  'isAuthorizedInternalCronRequest',
  'isAuthorizedInternalMaintenanceRequest',
  'authenticateScimRequest',
  'requireEnterpriseApiAccess',
  'constructEvent',
  'authorizePlatformProofRequest',
  'getReviewerSession',
  'requireReviewerSession',
  'requireQualifiedReviewerSession',
  'hasHealthcheckToken',
]);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return entry.isFile() && entry.name === 'route.ts' ? [absolute] : [];
  });
}

function relativePath(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function readInventory() {
  const classes = new Map();
  const rowPattern = /^\|\s*`([^`]+route\.ts)`\s*\|\s*([^|]+?)\s*\|/gm;

  for (const file of INVENTORY_FILES) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(rowPattern)) {
      classes.set(match[1], match[2].trim());
    }
  }

  return classes;
}

function hasAnyCall(calls, expected) {
  for (const call of calls) {
    if (expected.has(call)) return true;
  }
  return false;
}

function assertAnalyzerRegressions() {
  const cases = [
    {
      name: 'unreachable false branch',
      source: `export function GET() { if (false) requireApiUser(); return noStoreJson({ ok: true }); }`,
      expected: false,
    },
    {
      name: 'shadowed non-call identifier',
      source: `export function GET() { const requireApiUser = false; return noStoreJson({ ok: requireApiUser }); }`,
      expected: false,
    },
    {
      name: 'uninvoked nested callback',
      source: `export function GET() { const callback = () => requireApiUser(); return noStoreJson({ ok: true }); }`,
      expected: false,
    },
    {
      name: 'direct guard call',
      source: `export async function GET() { await requireApiUser(); return noStoreJson({ ok: true }); }`,
      expected: true,
    },
    {
      name: 'invoked local helper',
      source: `function guard() { return requireApiUser(); } export async function GET() { await guard(); return noStoreJson({ ok: true }); }`,
      expected: true,
    },
    {
      name: 'export const handler',
      source: `export const POST = async () => { await requireApiUser(); return noStoreJson({ ok: true }); };`,
      expected: true,
    },
  ];

  for (const testCase of cases) {
    const handlers = analyzeExportedRouteHandlers(testCase.source, `${testCase.name}.ts`);
    const observed = handlers.some((handler) => handler.calls.has('requireApiUser'));
    if (observed !== testCase.expected) {
      throw new Error(`AST guard regression failed: ${testCase.name}; expected=${testCase.expected} observed=${observed}`);
    }
  }
}

assertAnalyzerRegressions();

const inventory = readInventory();
const routes = API_ROOTS.flatMap(walk);
const violations = [];

for (const file of routes) {
  const routePath = relativePath(file);
  const routeClass = inventory.get(routePath);
  if (!routeClass) {
    violations.push(`${routePath}:missing_inventory_class`);
    continue;
  }

  if (PUBLIC_CLASSES.has(routeClass)) continue;

  const source = readFileSync(file, 'utf8');
  const handlers = analyzeExportedRouteHandlers(source, routePath);
  if (handlers.length === 0) {
    violations.push(`${routePath}:no_exported_http_handler`);
    continue;
  }

  for (const handler of handlers) {
    const hasSession = hasAnyCall(handler.calls, SESSION_GUARDS);
    const hasTenant = hasAnyCall(handler.calls, TENANT_CONTEXT);
    const hasAuthorization = hasAnyCall(handler.calls, AUTHORIZATION_GUARDS);
    const hasMachineAuth = hasAnyCall(handler.calls, MACHINE_AUTH_GUARDS);

    if (MACHINE_AUTH_CLASSES.has(routeClass)) {
      if (!hasMachineAuth) violations.push(`${routePath}:${handler.method}:machine_auth_call_missing`);
      continue;
    }

    if (!hasSession && !hasAuthorization && !hasMachineAuth) {
      violations.push(`${routePath}:${handler.method}:entrypoint_guard_call_missing`);
      continue;
    }

    if (
      !BILLING_RECOVERY_AUTH_ONLY.has(routePath)
      && hasSession
      && hasTenant
      && !hasAuthorization
    ) {
      violations.push(`${routePath}:${handler.method}:session_tenant_without_authorization_call`);
    }

    if (handler.calls.has('createAdminClient')) {
      const guardedAdminAccess = hasMachineAuth || (hasSession && (hasAuthorization || hasTenant));
      if (!guardedAdminAccess) violations.push(`${routePath}:${handler.method}:unguarded_admin_client_call`);
    }
  }
}

if (routes.length < 120) {
  violations.push(`api_inventory_too_small:${routes.length}`);
}

if (violations.length > 0) {
  console.error('[security] API handler guard invocation failures:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`[security] API handler guard invocation checks passed across ${routes.length} route files.`);