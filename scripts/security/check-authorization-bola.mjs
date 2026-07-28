import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const routeRoots = [
  join(root, 'src', 'app', 'api'),
  join(root, 'src', 'app', 'next_api'),
];
const inventoryPath = join(root, 'docs', 'security', 'API_ROUTE_INVENTORY.md');
const inventoryFragmentsPath = join(root, 'docs', 'security', 'api-route-inventory');
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

function inventoryFiles() {
  const files = [inventoryPath];
  if (!existsSync(inventoryFragmentsPath)) return files;

  const fragments = readdirSync(inventoryFragmentsPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => join(inventoryFragmentsPath, entry.name))
    .sort();

  return [...files, ...fragments];
}

function readInventory() {
  const routeClasses = new Map();
  const failures = [];
  const files = inventoryFiles();

  if (!existsSync(inventoryPath)) {
    failures.push(`missing ${normalizePath(inventoryPath)}`);
  }

  for (const file of files) {
    if (!existsSync(file)) continue;
    const source = readFileSync(file, 'utf8');
    const rowPattern = /^\|\s*`([^`]+route\.ts)`\s*\|\s*([^|]+?)\s*\|/gm;

    for (const match of source.matchAll(rowPattern)) {
      const route = match[1];
      const routeClass = match[2].trim();

      if (routeClasses.has(route)) {
        failures.push(
          `${route}: duplicate API route classification in ${normalizePath(file)}`,
        );
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
    findings.push(`${route}: stale API route classification for missing route`);
  }
}

console.log('EuroComply API route inventory check');
console.log('------------------------------------');
console.log(`Scanned ${routes.length} API route files.`);
console.log(`Loaded ${inventoryFiles().length} inventory file(s).`);

if (findings.length > 0) {
  console.error('API inventory findings:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log('API inventory checks: ok');
}
