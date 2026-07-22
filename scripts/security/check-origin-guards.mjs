import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const apiRoot = join(root, 'src', 'app', 'api');
const inventoryPath = join(root, 'docs', 'security', 'API_ROUTE_INVENTORY.md');
const strict = process.env.ENFORCE_ORIGIN_GUARDS !== 'false';
const mutatingExportRegex = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\s*\(/g;

const exemptRoutePatterns = [
  /src\/app\/api\/billing\/webhook\/route\.ts$/,
  /src\/app\/api\/stripe\/webhook\/route\.ts$/,
  /src\/app\/api\/audit\/evidence-pack\/verify\/route\.ts$/,
  /src\/app\/api\/ops\/.*\/route\.ts$/,
  /src\/app\/api\/internal\/.*\/route\.ts$/,
  /src\/app\/api\/leads\/route\.ts$/,
];

function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile() && entry.name === 'route.ts') return [fullPath];
    return [];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function readCredentialBoundIntegrationRoutes() {
  if (!existsSync(inventoryPath)) return new Set();

  const source = readFileSync(inventoryPath, 'utf8');
  const routes = new Set();
  const rowPattern = /^\|\s*`([^`]+route\.ts)`\s*\|\s*([^|]+?)\s*\|/gm;

  for (const match of source.matchAll(rowPattern)) {
    const route = match[1];
    const routeClass = match[2].trim();
    if (routeClass === 'integration') routes.add(route);
  }

  return routes;
}

function hasMutatingHandler(source) {
  return Array.from(source.matchAll(mutatingExportRegex)).length > 0;
}

const credentialBoundIntegrationRoutes = readCredentialBoundIntegrationRoutes();

function isExempt(path) {
  return (
    exemptRoutePatterns.some((pattern) => pattern.test(path)) ||
    credentialBoundIntegrationRoutes.has(path)
  );
}

function hasOriginGuard(source) {
  return (
    source.includes('assertTrustedOrigin') ||
    source.includes('verifyTrustedOrigin') ||
    source.includes('originDeniedResponse') ||
    source.includes('requireTrustedMutation') ||
    source.includes('requireTrustedOriginForMutation') ||
    source.includes('assertTrustedOriginForMutation') ||
    source.includes('isAuthorizedInternalCronRequest') ||
    source.includes('isAuthorizedInternalMaintenanceRequest') ||
    source.includes('constructEvent')
  );
}

const routes = walk(apiRoot);
const findings = [];

for (const route of routes) {
  const normalized = normalizePath(route);
  const source = readFileSync(route, 'utf8');
  if (!hasMutatingHandler(source)) continue;
  if (isExempt(normalized)) continue;
  if (!hasOriginGuard(source)) {
    findings.push(`${normalized}: mutating API route should validate Origin/Referer with assertTrustedOrigin()`);
  }
}

console.log('EuroComply Origin/CSRF guard coverage check');
console.log('-------------------------------------------');
console.log(`Scanned ${routes.length} API route files.`);
console.log(`Credential-bound integration exemptions: ${credentialBoundIntegrationRoutes.size}.`);

if (findings.length > 0) {
  const message = strict ? 'Origin guard failures:' : 'Origin guard advisory findings:';
  console[strict ? 'error' : 'warn'](message);
  for (const finding of findings) console[strict ? 'error' : 'warn'](`- ${finding}`);
  if (strict) process.exitCode = 1;
} else {
  console.log('Origin/CSRF guard coverage: ok');
}

if (!strict) {
  console.log('Advisory mode was explicitly requested with ENFORCE_ORIGIN_GUARDS=false.');
}
