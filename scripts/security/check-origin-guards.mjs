import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const apiRoot = join(process.cwd(), 'src', 'app', 'api');
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
  return relative(process.cwd(), path).split(sep).join('/');
}

function hasMutatingHandler(source) {
  return Array.from(source.matchAll(mutatingExportRegex)).length > 0;
}

function isExempt(path) {
  return exemptRoutePatterns.some((pattern) => pattern.test(path));
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
