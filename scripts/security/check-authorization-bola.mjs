import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const apiRoot = join(root, 'src', 'app', 'api');
const inventoryPath = join(root, 'docs', 'security', 'API_ROUTE_INVENTORY.md');
const ignoredDirectories = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);

const knownClasses = new Set([
  'public safe',
  'authenticated',
  'tenant-scoped',
  'admin-only',
  'high-risk',
  'webhook',
  'health/internal',
]);
const publicClasses = new Set(['public safe', 'webhook']);
const tenantClasses = new Set(['tenant-scoped', 'admin-only', 'high-risk']);
const privilegedClasses = new Set(['admin-only', 'high-risk']);

const internalProtectedRoutePatterns = [
  /src\/app\/api\/(cron|internal|maintenance)\//,
  /src\/app\/api\/intelligence\/refresh\//,
];

const internalGuardTokens = [
  'isAuthorizedInternalCronRequest',
  'isAuthorizedInternalMaintenanceRequest',
  'HEALTHCHECK_TOKEN',
  'CRON_SECRET',
  'INTERNAL_CRON_SECRET',
  'MAINTENANCE_SECRET',
  'INTELLIGENCE_REFRESH_SECRET',
  'requireEnterpriseApiAccess',
];

const authGuardTokens = [
  'getCurrentUser',
  'requireApiUser',
  'requireAuthenticatedUser',
  'requireOrganizationContext',
  'requirePrivilegedOrganizationContext',
  'requireEnterpriseApiAccess',
  'supabase.auth.getUser',
  'auth.getUser',
  'session.user',
  'currentUser',
];

const ownershipGuardTokens = [
  'requireOrganizationContext',
  'requirePrivilegedOrganizationContext',
  'requireOrganizationMembership',
  'requireOrganizationAccess',
  'getCurrentOrganizationForUser',
  'assertOrganizationPermission',
  'assertApiResourceOrganization',
  'assertSameOrganization',
  'assertOrganizationResource',
  'requireEnterpriseApiAccess',
  ".eq('organization_id'",
  '.eq("organization_id"',
  'organization_id',
  'organizationId',
  'organization.id',
  'organization?.id',
  'context.organizationId',
  'context.organization',
  'organization',
  'membership.user_id',
  'memberships',
  'owner_user_id',
  'created_by',
];

const rbacTokens = [
  'assertOrganizationPermission',
  'requirePermission',
  'requireAdmin',
  'requirePrivilegedOrganizationContext',
  'assertPrivilegedOrganizationRole',
  'assertAdminAllowed',
  'assertMutationAllowed',
  'assertRole',
  'permission.ok',
  'permissionDeniedResponse',
  'permission',
  'requireEnterpriseApiAccess',
  'manage_team',
  'manage_billing',
  'manage_documents',
  'manage_settings',
  'export_data',
  'read_audit',
  'admin',
  'owner',
];

const adminRoutePatterns = [
  /\/admin\//,
  /\/team\//,
  /\/billing\//,
  /\/settings\//,
  /\/security\/settings\//,
];

const resourceSelectorPatterns = [
  /\/\[[^\]]*id[^\]]*\]\//i,
  /params\s*[:=]/,
  /\.params\b/,
  /searchParams\.get\(['"](?:id|documentId|vendorId|systemId|incidentId|teamId|memberId|inviteId)['"]\)/,
  /\b(?:documentId|vendorId|systemId|incidentId|teamId|memberId|inviteId)\b/,
];

function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) return [];
      return walk(fullPath);
    }
    if (entry.isFile() && /^route\.(ts|js)$/.test(entry.name)) return [fullPath];
    return [];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function hasAny(source, tokens) {
  return tokens.some((token) => (typeof token === 'string' ? source.includes(token) : token.test(source)));
}

function readInventory() {
  if (!existsSync(inventoryPath)) {
    return {
      routeClasses: new Map(),
      failures: [`missing ${relative(root, inventoryPath).split(sep).join('/')}`],
    };
  }

  const source = readFileSync(inventoryPath, 'utf8');
  const routeClasses = new Map();
  const rowPattern = /^\|\s*`([^`]+route\.ts)`\s*\|\s*([^|]+?)\s*\|/gm;
  for (const match of source.matchAll(rowPattern)) {
    routeClasses.set(match[1], match[2].trim());
  }

  return { routeClasses, failures: [] };
}

const inventory = readInventory();
const routes = walk(apiRoot);
const findings = [...inventory.failures];

for (const route of routes) {
  const normalized = normalizePath(route);
  const source = readFileSync(route, 'utf8');
  const routeClass = inventory.routeClasses.get(normalized);

  if (!routeClass) {
    findings.push(`${normalized}: missing API_ROUTE_INVENTORY.md classification`);
    continue;
  }

  if (!knownClasses.has(routeClass)) {
    findings.push(`${normalized}: unknown API route classification: ${routeClass}`);
    continue;
  }

  if (publicClasses.has(routeClass)) continue;

  if (routeClass === 'health/internal') {
    const requiresInternalGuard = internalProtectedRoutePatterns.some((pattern) => pattern.test(normalized));
    if (requiresInternalGuard && !hasAny(source, internalGuardTokens)) {
      findings.push(`${normalized}: health/internal route does not prove internal secret or platform guard enforcement`);
    }
    continue;
  }

  const appearsAdminRoute = adminRoutePatterns.some((pattern) => pattern.test(normalized));
  const handlesResourceSelector = hasAny(source, resourceSelectorPatterns);
  const hasAuthGuard = hasAny(source, authGuardTokens);
  const hasOwnershipGuard = hasAny(source, ownershipGuardTokens);
  const hasRbacGuard = hasAny(source, rbacTokens);

  if (!hasAuthGuard) {
    findings.push(`${normalized}: ${routeClass} route does not prove an authenticated user guard`);
  }

  if (tenantClasses.has(routeClass) && !hasOwnershipGuard) {
    findings.push(`${normalized}: ${routeClass} route does not prove tenant membership/resource ownership validation`);
  }

  if ((privilegedClasses.has(routeClass) || appearsAdminRoute) && !hasRbacGuard) {
    findings.push(`${normalized}: ${routeClass} route does not prove RBAC/admin permission enforcement`);
  }

  if (handlesResourceSelector && !hasOwnershipGuard) {
    findings.push(`${normalized}: resource selector requires tenant ownership validation before use`);
  }
}

console.log('EuroComply authorization and anti-BOLA check');
console.log('---------------------------------------------');
console.log(`Scanned ${routes.length} API route files.`);

if (findings.length > 0) {
  console.error('Authorization/BOLA findings:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log('Authorization and anti-BOLA checks: ok');
}
