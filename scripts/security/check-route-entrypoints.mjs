import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const srcRoot = join(root, 'src');
const ignoredDirectories = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);
const routeFileNames = new Set(['route.ts', 'route.tsx', 'route.js', 'route.jsx']);

function walk(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) return [];
      return walk(fullPath);
    }

    if (!entry.isFile() || !routeFileNames.has(entry.name)) return [];
    return [fullPath];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

const routeEntrypoints = walk(srcRoot).map(normalizePath);
const failures = routeEntrypoints.filter((path) => !path.startsWith('src/app/'));

console.log('EuroComply route entrypoint boundary check');
console.log('--------------------------------------------');
console.log(`Scanned ${routeEntrypoints.length} route entrypoint files.`);

if (failures.length > 0) {
  console.error('Route entrypoint boundary failures:');
  for (const path of failures) {
    console.error(`- ${path}: route handlers must live under src/app/** so enterprise API gates can classify and scan them.`);
  }
  process.exitCode = 1;
} else {
  console.log('Route entrypoint boundaries: ok');
}
