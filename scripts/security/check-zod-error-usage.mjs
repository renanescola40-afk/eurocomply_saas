import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const roots = ['src', 'scripts'];
const ignoredDirectories = new Set(['node_modules', '.next', '.git', 'coverage', 'playwright-report', 'test-results']);
const checkedExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);
const forbiddenPatterns = [
  {
    pattern: /\.error\.errors\b/g,
    message: 'Use ZodError.issues instead of ZodError.errors; Zod v4 no longer exposes .errors on the public type.',
  },
  {
    pattern: /z\.record\s*\(\s*z\.unknown\s*\(\s*\)\s*\)/g,
    message: 'Use z.record(z.string(), z.unknown()) instead of z.record(z.unknown()); Zod v4 requires an explicit key schema.',
  },
];

const failures = [];

function hasCheckedExtension(filePath) {
  return [...checkedExtensions].some(extension => filePath.endsWith(extension));
}

function scanFile(filePath) {
  const source = readFileSync(filePath, 'utf8');

  for (const { pattern, message } of forbiddenPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const line = source.slice(0, match.index).split('\n').length;
      failures.push(`${relative(process.cwd(), filePath)}:${line} ${message}`);
    }
  }
}

function scanDirectory(directoryPath) {
  if (!existsSync(directoryPath)) return;

  for (const entry of readdirSync(directoryPath)) {
    if (ignoredDirectories.has(entry)) continue;

    const entryPath = join(directoryPath, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      scanDirectory(entryPath);
      continue;
    }

    if (stats.isFile() && hasCheckedExtension(entryPath)) {
      scanFile(entryPath);
    }
  }
}

console.log('EuroComply Zod compatibility check');
console.log('------------------------------------');

for (const root of roots) scanDirectory(root);

if (failures.length > 0) {
  console.error('Zod compatibility failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Zod compatibility: ok');
}
