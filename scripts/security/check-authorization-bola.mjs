import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const routeRoots = [
  join(root, 'src', 'app', 'api'),
  join(root, 'src', 'app', 'next_api'),
];
const inventoryPaths = [
  join(root, 'docs', 'security', 'API_ROUTE_INVENTORY.md'),
  join(root, 'docs', 'security', 'API_ROUTE_INVENTORY.billing.md'),
];
const ignoredDirectories = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);

const allowedClasses = new Set([
  'public safe',
  'public mutation',
  'authenticated',
  'tenant-scoped',
  'admin-only',
  'high-risk',
  'integration',
  'webhook',
  'health/internal',
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
  const routeClasses = new Map();
  const failures = [];
  const rowPattern = /^\|\s*`([^`]+route\.ts)`\s*\|\s*([^|]+?)\s*\|/gm;

  for (const inventoryPath of inventoryPaths) {
    if (!existsSync(inventoryPath)) {
      failures.push(`missing ${normalizePath(inventoryPath)}`);
      continue;
    }

    const source = readFileSync(inventoryPath, 'utf8');
    for (const match of source.matchAll(rowPattern)) {
      const route = match[1];
      const routeClass = match[2].trim();

      if (routeClasses.has(route)) {
        failures.push(`${route}: duplicate API_ROUTE_INVENTORY.md classification across modular inventories`);
        continue;
      }

      routeClasses.set(route, routeClass);
    }
  }

  return { routeClasses, failures };
}

const inventory = readInventory();
const routes = routeRoots.flatMap((routeRoot) => walk(routeRoot));
const routePaths = routes.map(normalizePath);
const routePathSet = new Set(routePaths);
const findings = [...inventory.failures];

for (const route of routePaths) {
  if (!inventory.routeClasses.has(route)) {
    findings.push(`${route}: missing API route inventory classification`);
  }
}

for (const [route, routeClass] of inventory.routeClasses) {
  if (!allowedClasses.has(routeClass)) {
    findings.push(`${route}: unknown API route classification: ${routeClass}`);
  }

  if (!routePathSet.has(route)) {
    findings.push(`${route}: stale API_ROUTE_INVENTORY.md classification for missing route`);
  }
}

console.log('EuroComply API route inventory check');
console.log('------------------------------------');
console.log(`Scanned ${routes.length} API route files.`);
console.log(`Loaded ${inventoryPaths.length} inventory files.`);

if (findings.length > 0) {
  console.error('API inventory findings:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log('API inventory checks: ok');
}
