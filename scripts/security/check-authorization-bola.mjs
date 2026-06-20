import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const apiRoot = join(root, 'src', 'app', 'api');
const ignoredDirectories = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);

const publicEndpointAllowlist = [
  /src\/app\/api\/billing\/webhook\/route\.ts$/,
  /src\/app\/api\/audit\/evidence-pack\/verify\/route\.ts$/,
  /src\/app\/api\/ops\/.*\/route\.ts$/,
];

const resourceIdentifierPatterns = [
  /params\s*[:=]/,
  /\.params\b/,
  /searchParams\.get\(['"](?:id|userId|organizationId|tenantId|documentId|vendorId|systemId|incidentId|teamId|memberId|inviteId)['"]\)/,
  /(?:id|userId|organizationId|tenantId|documentId|vendorId|systemId|incidentId|teamId|memberId|inviteId)\s*=\s*(?:await\s+)?request\.json\(/,
  /\b(?:userId|organizationId|tenantId|documentId|vendorId|systemId|incidentId|teamId|memberId|inviteId)\b/,
];

const authGuardTokens = [
  'getCurrentUser',
  'requireApiUser',
  'requireOrganizationContext',
  'supabase.auth.getUser',
];

const ownershipGuardTokens = [
  'requireOrganizationContext',
  'requireOrganizationAccess',
  'getCurrentOrganizationForUser',
  'assertOrganizationPermission',
  'assertApiResourceOrganization',
  'organization_id',
  'organizationId',
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
  'manage_team',
  'manage_billing',
  'manage_documents',
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

function isPublicAllowlisted(path) {
  return publicEndpointAllowlist.some((pattern) => pattern.test(path));
}

const routes = walk(apiRoot);
const findings = [];

for (const route of routes) {
  const normalized = normalizePath(route);
  const source = readFileSync(route, 'utf8');
  if (isPublicAllowlisted(normalized)) continue;

  const handlesResourceId = hasAny(source, resourceIdentifierPatterns) || /\[[^\]]*id[^\]]*\]/i.test(normalized);
  const appearsAdminRoute = adminRoutePatterns.some((pattern) => pattern.test(normalized));
  const hasAuthGuard = hasAny(source, authGuardTokens);
  const hasOwnershipGuard = hasAny(source, ownershipGuardTokens);
  const hasRbacGuard = hasAny(source, rbacTokens);

  if (handlesResourceId && !hasAuthGuard) {
    findings.push(`${normalized}: receives or references a resource id but does not prove an authenticated user guard`);
  }

  if (handlesResourceId && !hasOwnershipGuard) {
    findings.push(`${normalized}: receives or references a resource id but does not prove tenant/user ownership validation`);
  }

  if (appearsAdminRoute && !hasRbacGuard) {
    findings.push(`${normalized}: admin/team/billing/settings route does not prove RBAC/admin permission enforcement`);
  }
}

console.log('EuroComply authorization and anti-BOLA check');
console.log('---------------------------------------------');
console.log(`Scanned ${routes.length} API route files.`);

if (findings.length > 0) {
  console.error('Authorization/BOLA findings:');
  for (const finding of findings) console.error(`- ${finding}`);
  if (process.env.STRICT_AUTHORIZATION_BOLA_SCAN === '1') {
    process.exitCode = 1;
  } else {
    console.warn('Authorization/BOLA check is running in report-only mode. Set STRICT_AUTHORIZATION_BOLA_SCAN=1 to fail on findings.');
  }
} else {
  console.log('Authorization and anti-BOLA checks: ok');
}
