import { execFileSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const API_ROOT = join(ROOT, 'src', 'app', 'api');

const BILLING_RECOVERY_AUTH_ONLY = new Set([
  'src/app/api/billing/checkout/activation/route.ts',
  'src/app/api/billing/entitlements/route.ts',
]);

const SESSION_GUARDS = [
  'requireApiUser',
  'getCurrentUser',
  'requireCurrentUser',
];

const TENANT_CONTEXT = [
  'getCurrentOrganizationForUser',
  'requireOrganizationAccess',
  'requireOrganizationContext',
  'requireOrganizationMembership',
];

const AUTHORIZATION_GUARDS = [
  'requirePermission',
  'assertOrganizationPermission',
  'requirePlatformCapability',
  'requireEnterpriseApiAccess',
  'authenticateScimRequest',
  'getReviewerSession',
];

const MACHINE_AUTH_GUARDS = [
  'validateBearerToken',
  'isAuthorizedInternalCronRequest',
  'isAuthorizedInternalMaintenanceRequest',
  'authenticateScimRequest',
  'requireEnterpriseApiAccess',
  'constructEvent',
  'STRIPE_WEBHOOK_SECRET',
  'authorizePlatformProofRequest',
];

const APPROVED_PUBLIC_ADMIN_CLIENT_ROUTES = new Set([
  'src/app/api/leads/route.ts',
  'src/app/api/prelaunch/route.ts',
]);

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

function hasAny(source: string, tokens: readonly string[]) {
  return tokens.some((token) => source.includes(token));
}

async function routeSources() {
  const files = await walk(API_ROOT);
  return Promise.all(files.map(async (file) => ({
    file,
    path: repoPath(file),
    source: await readFile(file, 'utf8'),
  })));
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

  it('never accepts session plus tenant context as sufficient authorization for a product API', async () => {
    const routes = await routeSources();
    const violations = routes
      .filter(({ source }) => hasAny(source, SESSION_GUARDS) && hasAny(source, TENANT_CONTEXT))
      .filter(({ path }) => !BILLING_RECOVERY_AUTH_ONLY.has(path))
      .filter(({ source }) => !hasAny(source, AUTHORIZATION_GUARDS))
      .map(({ path }) => path);

    expect(violations).toEqual([]);
  });

  it('keeps the narrow pre-license billing recovery routes read-only and incapable of granting authority locally', async () => {
    const routes = await routeSources();
    const byPath = new Map(routes.map((route) => [route.path, route.source]));

    const activation = byPath.get('src/app/api/billing/checkout/activation/route.ts') ?? '';
    expect(activation).toContain('hasProcessedLiveStripeSubscriptionAuthority');
    expect(activation).toContain("const ACTIVATED_SUBSCRIPTION_STATUSES = new Set(['active']);");
    expect(activation).not.toMatch(/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/);
    expect(activation).not.toContain("licensed: true");

    const entitlements = byPath.get('src/app/api/billing/entitlements/route.ts') ?? '';
    expect(entitlements).not.toMatch(/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/);
    expect(entitlements).not.toContain("licensed: true");
  });

  it('does not let service-role/admin database access sit behind an unclassified anonymous route', async () => {
    const routes = await routeSources();
    const violations = routes
      .filter(({ source }) => source.includes('createAdminClient'))
      .filter(({ path }) => !APPROVED_PUBLIC_ADMIN_CLIENT_ROUTES.has(path))
      .filter(({ source }) => {
        const sessionProtected = hasAny(source, SESSION_GUARDS) && (
          hasAny(source, AUTHORIZATION_GUARDS) || hasAny(source, TENANT_CONTEXT)
        );
        const machineProtected = hasAny(source, MACHINE_AUTH_GUARDS);
        return !sessionProtected && !machineProtected;
      })
      .map(({ path }) => path);

    expect(violations).toEqual([]);
  });

  it('keeps the API inventory broad enough that accidental route deletion cannot fake closure', async () => {
    const routes = await routeSources();
    expect(routes.length).toBeGreaterThanOrEqual(120);

    for (const route of routes) {
      const info = await stat(route.file);
      expect(info.isFile(), route.path).toBe(true);
    }
  });
});
