import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const srcRoot = join(root, 'src');
const ignoredDirectories = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);

const serverOnlyImportPatterns = [
  '@/lib/supabase/admin',
  '@/server/',
  '@/server',
  '@/lib/security/rate-limit',
  '@/lib/security/env-guard',
  '@/lib/observability/report-error',
  '@/server/security/',
  '@/server/billing/',
  '@/server/queries/',
  '@/server/governance/',
  '@/server/ai-governance/',
  'stripe',
  '@supabase/supabase-js',
];

const allowedClientImportPatterns = [
  '@/server/governance/security-questionnaire',
  '@/server/governance/vendor-assurance-policy',
  '@/server/governance/retention-policy',
  '@/server/governance/continuity-policy',
  '@/server/governance/enterprise-readiness',
];

const browserSessionStoragePatterns = [
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /document\.cookie\s*=/,
  /window\.localStorage\b/,
  /window\.sessionStorage\b/,
];

const tokenNamePattern = /(access[_-]?token|refresh[_-]?token|id[_-]?token|jwt|bearer|supabase[_-]?auth[_-]?token)/i;

function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) return [];
      return walk(fullPath);
    }
    if (!entry.isFile()) return [];
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function hasUseClientDirective(source) {
  const firstStatements = source
    .split('\n')
    .slice(0, 8)
    .map((line) => line.trim().replace(/;$/, ''));
  return firstStatements.includes("'use client'") || firstStatements.includes('"use client"');
}

function isClientNamedFile(path) {
  return /(^|\/)([^/]+-client|client|.*\.client)\.(tsx|ts|jsx|js)$/.test(path);
}

function extractImports(source) {
  const imports = [];
  const staticImport = /import\s+(type\s+)?(?:[^'";]+\s+from\s+)?['"]([^'"]+)['"]/g;
  const dynamicImport = /import\(['"]([^'"]+)['"]\)/g;

  for (const match of source.matchAll(staticImport)) {
    imports.push({
      module: match[2],
      index: match.index ?? 0,
      typeOnly: Boolean(match[1]),
      dynamic: false,
    });
  }

  for (const match of source.matchAll(dynamicImport)) {
    imports.push({
      module: match[1],
      index: match.index ?? 0,
      typeOnly: false,
      dynamic: true,
    });
  }

  return imports;
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

function isForbiddenImport(moduleName) {
  if (allowedClientImportPatterns.includes(moduleName)) return false;
  return serverOnlyImportPatterns.some((pattern) => moduleName === pattern || moduleName.startsWith(pattern));
}

const failures = [];
const files = walk(srcRoot);

for (const file of files) {
  const normalized = normalizePath(file);
  const source = readFileSync(file, 'utf8');
  const isClientBoundary = hasUseClientDirective(source) || isClientNamedFile(normalized);
  if (!isClientBoundary) continue;

  for (const imported of extractImports(source)) {
    // TypeScript removes `import type` declarations from emitted client bundles. They do
    // not execute server modules or move service-role code across the runtime boundary.
    // Runtime, side-effect and dynamic imports remain forbidden and fail closed.
    if (!imported.typeOnly && isForbiddenImport(imported.module)) {
      failures.push(`${normalized}:${lineNumberFor(source, imported.index)} client boundary imports server-only module at runtime: ${imported.module}`);
    }
  }

  if (/process\.env\.(?!NEXT_PUBLIC_)[A-Z0-9_]+/.test(source)) {
    failures.push(`${normalized}: client boundary references non-public process.env value`);
  }

  const lines = source.split('\n');
  lines.forEach((line, index) => {
    if (!browserSessionStoragePatterns.some((pattern) => pattern.test(line))) return;

    const surroundingSource = lines.slice(Math.max(0, index - 2), Math.min(lines.length, index + 3)).join('\n');
    if (tokenNamePattern.test(surroundingSource)) {
      failures.push(`${normalized}:${index + 1} client boundary appears to store or read auth tokens from browser storage; use Supabase SSR cookies with HttpOnly, Secure and SameSite instead`);
    }
  });
}

console.log('EuroComply client boundary security check');
console.log('------------------------------------------');
console.log(`Scanned ${files.length} source files.`);

if (failures.length > 0) {
  console.error('Client boundary findings:');
  for (const failure of failures) console.error(`- ${failure}`);
  if (process.env.STRICT_CLIENT_BOUNDARY_SCAN === '1') {
    process.exitCode = 1;
  } else {
    console.warn('Client boundary check is running in report-only mode. Set STRICT_CLIENT_BOUNDARY_SCAN=1 to fail on findings.');
  }
} else {
  console.log('Client boundary security: ok');
}
