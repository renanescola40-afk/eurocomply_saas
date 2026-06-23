import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const apiRoot = join(root, 'src', 'app', 'api');
const inventoryPath = join(root, 'docs', 'security', 'API_ROUTE_INVENTORY.md');
const ignoredDirectories = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);

const publicEndpointAllowlist = [
  /src\/app\/api\/billing\/webhook\/route\.ts$/,
  /src\/app\/api\/stripe\/webhook\/route\.ts$/,
  /src\/app\/api\/audit\/evidence-pack\/verify\/route\.ts$/,
  /src\/app\/api\/ops\/.*\/route\.ts$/,
  /src\/app\/api\/health\/route\.ts$/,
  /src\/app\/api\/ready\/route\.ts$/,
];

const internalEndpointAllowlist = [
  /src\/app\/api\/internal\/.*\/route\.ts$/,
  /src\/app\/api\/intelligence\/refresh\/route\.ts$/,
];

const internalGuardTokens = [
  'isAuthorizedInternalCronRequest',
  'isAuthorizedInternalMaintenanceRequest',
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
  'requireCurrentUser',
  'requireApiUser',
  'requireAuthenticatedUser',
  'requireOrganizationContext',
  'requirePrivilegedOrganizationContext',
  'requireEnterpriseApiAccess',
  'supabase.auth.getUser',
  'auth.getUser',
];

const ownershipGuardTokens = [
  'requireOrganizationContext',
  'requirePrivilegedOrganizationContext',
  'requireOrganizationMembership',
  'requireOrganizationAccess',
  'requireOrganizationMembership',
  'requirePrivilegedOrganizationContext',
  'getCurrentOrganizationForUser',
  'assertOrganizationPermission',
  'assertApiResourceOrganization',
  'assertSameOrganization',
  'assertOrganizationResource',
  'organization_id',
  'organizationId',
  'organization.id',
  'user.id',
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
    return entry.isFile() && entry.name === 'route.ts' ? [fullPath] : [];
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

function isInternalAllowlisted(path, source) {
  return internalEndpointAllowlist.some((pattern) => pattern.test(path)) && hasAny(source, internalGuardTokens);
}

const routes = walk(apiRoot);
const findings = [...inventory.failures];

for (const route of routes) {
  const normalized = normalizePath(route);
  const source = readFileSync(route, 'utf8');
  if (isPublicAllowlisted(normalized)) continue;
  if (isInternalAllowlisted(normalized, source)) continue;

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
