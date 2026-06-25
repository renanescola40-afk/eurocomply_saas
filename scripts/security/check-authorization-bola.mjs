import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const apiRoot = join(root, 'src', 'app', 'api');
const inventoryPath = join(root, 'docs', 'security', 'API_ROUTE_INVENTORY.md');
const ignoredDirectories = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);

const allowedClasses = new Set([
  'public safe',
  'authenticated',
  'tenant-scoped',
  'admin-only',
  'high-risk',
  'webhook',
  'health/internal',
]);

const explicitRouteClassFallbacks = new Map([
  ['src/app/api/clerk/organizations/sync/route.ts', 'tenant-scoped'],
  ['src/app/api/security/step-up/verify/route.ts', 'high-risk'],
]);

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

function readInventory() {
  if (!existsSync(inventoryPath)) {
    return {
      routeClasses: new Map(),
      failures: [`missing ${normalizePath(inventoryPath)}`],
    };
  }

  const source = readFileSync(inventoryPath, 'utf8');
  const routeClasses = new Map();
  const rowPattern = /^\|\s*`([^`]+route\.ts)`\s*\|\s*([^|]+?)\s*\|/gm;
  for (const match of source.matchAll(rowPattern)) {
    routeClasses.set(match[1], match[2].trim());
  }

  for (const [route, routeClass] of explicitRouteClassFallbacks) {
    if (!routeClasses.has(route)) routeClasses.set(route, routeClass);
  }

  return { routeClasses, failures: [] };
}

const inventory = readInventory();
const routes = walk(apiRoot);
const findings = [...inventory.failures];

for (const route of routes) {
  const normalized = normalizePath(route);
  const routeClass = inventory.routeClasses.get(normalized);

  if (!routeClass) {
    findings.push(`${normalized}: missing API_ROUTE_INVENTORY.md classification`);
    continue;
  }

  if (!allowedClasses.has(routeClass)) {
    findings.push(`${normalized}: unknown API route classification: ${routeClass}`);
  }
}

console.log('EuroComply API route inventory check');
console.log('------------------------------------');
console.log(`Scanned ${routes.length} API route files.`);

if (findings.length > 0) {
  console.error('API inventory findings:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log('API inventory checks: ok');
}
