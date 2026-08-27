import { execFileSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const API_ROOT = join(ROOT, 'src', 'app', 'api');
const INVENTORY_FILES = [
  join(ROOT, 'docs', 'security', 'API_ROUTE_INVENTORY.md'),
  join(ROOT, 'docs', 'security', 'API_ROUTE_INVENTORY.billing.md'),
];
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const BILLING_RECOVERY_AUTH_ONLY = new Set([
  'src/app/api/billing/checkout/activation/route.ts',
  'src/app/api/billing/entitlements/route.ts',
]);

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
  'HEALTHCHECK_TOKEN',
  'CRON_SECRET',
  'INTERNAL_CRON_SECRET',
  'STRIPE_WEBHOOK_SECRET',
]);

const APPROVED_PUBLIC_ADMIN_CLIENT_ROUTES = new Set([
  'src/app/api/leads/route.ts',
  'src/app/api/prelaunch/route.ts',
]);

const PUBLIC_CLASSES = new Set(['public safe', 'public mutation']);
const MACHINE_AUTH_CLASSES = new Set(['integration', 'webhook', 'health/internal']);

type HandlerAnalysis = {
  method: string;
  identifiers: Set<string>;
};

type RouteAnalysis = {
  file: string;
  path: string;
  source: string;
  handlers: HandlerAnalysis[];
};

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && entry.name === 'route.ts' ? [fullPath] : [];
  }));
  return nested.flat();
}

function repoPath(file: string) {
  return relative(ROOT, file).split(sep).join('/');
}

function hasExportModifier(node: ts.Node) {
  return Boolean(
    ts.canHaveModifiers(node)
      && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
  );
}

function isCallable(node: ts.Node) {
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node);
}

function buildTopLevelCallables(sourceFile: ts.SourceFile) {
  const callables = new Map<string, ts.Node>();

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
      callables.set(statement.name.text, statement);
      continue;
    }

    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      if (isCallable(declaration.initializer)) {
        callables.set(declaration.name.text, declaration.initializer);
      }
    }
  }

  return callables;
}

function resolveHandlerNode(initializer: ts.Expression, callables: Map<string, ts.Node>) {
  if (isCallable(initializer)) return initializer;
  if (ts.isIdentifier(initializer)) return callables.get(initializer.text) ?? initializer;
  return initializer;
}

function collectExportedHandlers(sourceFile: ts.SourceFile, callables: Map<string, ts.Node>) {
  const handlers = new Map<string, ts.Node>();

  for (const statement of sourceFile.statements) {
    if (
      ts.isFunctionDeclaration(statement)
      && statement.name
      && statement.body
      && hasExportModifier(statement)
      && HTTP_METHODS.has(statement.name.text)
    ) {
      handlers.set(statement.name.text, statement);
      continue;
    }

    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name)
          && HTTP_METHODS.has(declaration.name.text)
          && declaration.initializer
        ) {
          handlers.set(declaration.name.text, resolveHandlerNode(declaration.initializer, callables));
        }
      }
      continue;
    }

    if (
      ts.isExportDeclaration(statement)
      && !statement.moduleSpecifier
      && statement.exportClause
      && ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        const method = element.name.text;
        if (!HTTP_METHODS.has(method)) continue;
        const localName = element.propertyName?.text ?? method;
        const callable = callables.get(localName);
        if (callable) handlers.set(method, callable);
      }
    }
  }

  return handlers;
}

function collectReachableIdentifiers(rootNode: ts.Node, callables: Map<string, ts.Node>) {
  const identifiers = new Set<string>();
  const visitedCallables = new Set<string>();

  function visitNode(node: ts.Node) {
    const referencedCallables = new Set<string>();

    function visit(current: ts.Node) {
      if (ts.isIdentifier(current)) {
        identifiers.add(current.text);
        if (callables.has(current.text)) referencedCallables.add(current.text);
      }
      if (ts.isPropertyAccessExpression(current)) {
        identifiers.add(current.name.text);
        identifiers.add(current.getText());
      }
      ts.forEachChild(current, visit);
    }

    visit(node);

    for (const name of referencedCallables) {
      if (visitedCallables.has(name)) continue;
      visitedCallables.add(name);
      const callable = callables.get(name);
      if (callable) visitNode(callable);
    }
  }

  visitNode(rootNode);
  return identifiers;
}

function analyzeHandlers(source: string, filePath: string): HandlerAnalysis[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const callables = buildTopLevelCallables(sourceFile);
  const handlers = collectExportedHandlers(sourceFile, callables);

  return [...handlers.entries()].map(([method, node]) => ({
    method,
    identifiers: collectReachableIdentifiers(node, callables),
  }));
}

function hasAnyIdentifier(identifiers: Set<string>, expected: Set<string>) {
  for (const identifier of identifiers) {
    if (expected.has(identifier)) return true;
  }
  return false;
}

async function routeSources(): Promise<RouteAnalysis[]> {
  const files = await walk(API_ROOT);
  return Promise.all(files.map(async (file) => {
    const source = await readFile(file, 'utf8');
    const path = repoPath(file);
    return {
      file,
      path,
      source,
      handlers: analyzeHandlers(source, path),
    };
  }));
}

async function routeInventory() {
  const classes = new Map<string, string>();
  const rowPattern = /^\|\s*`([^`]+route\.ts)`\s*\|\s*([^|]+?)\s*\|/gm;

  for (const file of INVENTORY_FILES) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(rowPattern)) {
      classes.set(match[1], match[2].trim());
    }
  }

  return classes;
}

describe('API entrypoint commercial closure', () => {
  it('runs the complete API taxonomy on every unit-test execution, including pull requests', () => {
    expect(() => execFileSync(
      process.execPath,
      [join(ROOT, 'scripts/security/check-api-endpoint-hardening.mjs')],
      {
        cwd: ROOT,
        env: {
          ...process.env,
          API_ENDPOINT_HARDENING_FULL_SCAN: '1',
          GITHUB_EVENT_NAME: '',
        },
        stdio: 'pipe',
      },
    )).not.toThrow();
  }, 30_000);

  it('requires an entrypoint guard independently for every non-public exported handler', async () => {
    const [routes, inventory] = await Promise.all([routeSources(), routeInventory()]);
    const violations: string[] = [];

    for (const route of routes) {
      const routeClass = inventory.get(route.path);
      if (!routeClass) {
        violations.push(`${route.path}:missing_inventory_class`);
        continue;
      }
      if (PUBLIC_CLASSES.has(routeClass)) continue;

      for (const handler of route.handlers) {
        const hasSession = hasAnyIdentifier(handler.identifiers, SESSION_GUARDS);
        const hasAuthorization = hasAnyIdentifier(handler.identifiers, AUTHORIZATION_GUARDS);
        const hasMachineAuth = hasAnyIdentifier(handler.identifiers, MACHINE_AUTH_GUARDS);

        if (MACHINE_AUTH_CLASSES.has(routeClass)) {
          if (!hasMachineAuth) violations.push(`${route.path}:${handler.method}:machine_auth_missing`);
          continue;
        }

        if (!hasSession && !hasAuthorization && !hasMachineAuth) {
          violations.push(`${route.path}:${handler.method}:entrypoint_auth_missing`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('never accepts session plus tenant context as sufficient authorization for a product handler', async () => {
    const routes = await routeSources();
    const violations: string[] = [];

    for (const route of routes) {
      if (BILLING_RECOVERY_AUTH_ONLY.has(route.path)) continue;
      for (const handler of route.handlers) {
        const hasSession = hasAnyIdentifier(handler.identifiers, SESSION_GUARDS);
        const hasTenant = hasAnyIdentifier(handler.identifiers, TENANT_CONTEXT);
        const hasAuthorization = hasAnyIdentifier(handler.identifiers, AUTHORIZATION_GUARDS);
        if (hasSession && hasTenant && !hasAuthorization) {
          violations.push(`${route.path}:${handler.method}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps the narrow pre-license billing recovery routes read-only and incapable of granting authority locally', async () => {
    const routes = await routeSources();
    const byPath = new Map(routes.map((route) => [route.path, route]));

    const activation = byPath.get('src/app/api/billing/checkout/activation/route.ts');
    expect(activation).toBeDefined();
    expect(activation?.handlers.some((handler) => MUTATING_METHODS.has(handler.method))).toBe(false);
    expect(
      activation?.handlers.some((handler) => handler.identifiers.has('hasProcessedLiveStripeSubscriptionAuthority')),
    ).toBe(true);
    expect(activation?.source).toContain("const ACTIVATED_SUBSCRIPTION_STATUSES = new Set(['active']);");
    expect(activation?.source).not.toContain('licensed: true');

    const entitlements = byPath.get('src/app/api/billing/entitlements/route.ts');
    expect(entitlements).toBeDefined();
    expect(entitlements?.handlers.some((handler) => MUTATING_METHODS.has(handler.method))).toBe(false);
    expect(entitlements?.source).not.toContain('licensed: true');
  });

  it('does not let service-role/admin database access sit behind an unclassified anonymous handler', async () => {
    const routes = await routeSources();
    const violations: string[] = [];

    for (const route of routes) {
      if (APPROVED_PUBLIC_ADMIN_CLIENT_ROUTES.has(route.path)) continue;
      for (const handler of route.handlers) {
        if (!handler.identifiers.has('createAdminClient')) continue;

        const hasSession = hasAnyIdentifier(handler.identifiers, SESSION_GUARDS);
        const hasAuthorization = hasAnyIdentifier(handler.identifiers, AUTHORIZATION_GUARDS);
        const hasTenant = hasAnyIdentifier(handler.identifiers, TENANT_CONTEXT);
        const hasMachineAuth = hasAnyIdentifier(handler.identifiers, MACHINE_AUTH_GUARDS);
        if (!(hasMachineAuth || (hasSession && (hasAuthorization || hasTenant)))) {
          violations.push(`${route.path}:${handler.method}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps the API inventory broad enough that accidental route deletion cannot fake closure', async () => {
    const routes = await routeSources();
    expect(routes.length).toBeGreaterThanOrEqual(120);

    for (const route of routes) {
      const info = await stat(route.file);
      expect(info.isFile(), route.path).toBe(true);
      expect(route.handlers.length, `${route.path}: no exported HTTP handlers discovered`).toBeGreaterThan(0);
    }
  });
});
