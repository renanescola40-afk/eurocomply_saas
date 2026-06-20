import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const scanRoots = ['src', 'scripts'].filter((path) => existsSync(join(root, path)));
const ignoredDirectories = new Set(['node_modules', '.next', '.git', 'dist', 'coverage', 'playwright-report', 'test-results']);

const inboundAuthTokenPatterns = [
  /request\.headers\.get\(\s*['"]authorization['"]\s*\)/i,
  /headers\(\)\.get\(\s*['"]authorization['"]\s*\)/i,
  /\bauth(?:orization)?Header\b/i,
  /cookies\(\)\.get\(\s*['"](?:access[_-]?token|refresh[_-]?token|id[_-]?token|jwt)['"]\s*\)/i,
  /request\.cookies\.get\(\s*['"](?:access[_-]?token|refresh[_-]?token|id[_-]?token|jwt)['"]\s*\)/i,
  /verifyJwt/i,
  /verifyIdToken/i,
  /jwtVerify/i,
];

const trustedAuthValidators = [
  'supabase.auth.getUser',
  'getCurrentUser',
  'requireOrganizationContext',
  'verifyJwtClaims',
  'verifyIdToken',
  'jwtVerify',
  'isAuthorizedInternalCronRequest',
];

const requiredJwtClaims = ['iss', 'aud', 'exp', 'iat'];

const forbiddenSessionStorage = [
  /localStorage\s*\.\s*setItem\s*\([^)]*(access[_-]?token|refresh[_-]?token|id[_-]?token|jwt|bearer)/i,
  /sessionStorage\s*\.\s*setItem\s*\([^)]*(access[_-]?token|refresh[_-]?token|id[_-]?token|jwt|bearer)/i,
  /document\.cookie\s*=\s*[^;]*(access[_-]?token|refresh[_-]?token|id[_-]?token|jwt|bearer)/i,
];

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) return [];
      return walk(fullPath);
    }
    if (!entry.isFile()) return [];
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function hasAny(source, tokens) {
  return tokens.some((token) => (typeof token === 'string' ? source.includes(token) : token.test(source)));
}

function isRouteHandler(path) {
  return /^src\/app\/api\/.*\/route\.(ts|js)$/.test(path);
}

function isClientSource(source, path) {
  const firstStatements = source
    .split('\n')
    .slice(0, 8)
    .map((line) => line.trim().replace(/;$/, ''));
  return firstStatements.includes("'use client'") || firstStatements.includes('"use client"') || /(^|\/)([^/]+-client|client|.*\.client)\.(tsx|ts|jsx|js)$/.test(path);
}

const files = scanRoots.flatMap((scanRoot) => walk(join(root, scanRoot)));
const failures = [];

for (const file of files) {
  const normalized = normalizePath(file);
  const source = readFileSync(file, 'utf8');

  if (isClientSource(source, normalized)) {
    for (const forbidden of forbiddenSessionStorage) {
      if (forbidden.test(source)) {
        failures.push(`${normalized}: auth tokens must not be persisted in localStorage, sessionStorage, or script-writable cookies`);
      }
    }
  }

  if (!isRouteHandler(normalized)) continue;
  if (!hasAny(source, inboundAuthTokenPatterns)) continue;

  const usesTrustedValidator = trustedAuthValidators.some((token) => source.includes(token));
  const validatesAllClaims = requiredJwtClaims.every((claim) => new RegExp(`\b${claim}\b`).test(source));

  if (!usesTrustedValidator && !validatesAllClaims) {
    failures.push(`${normalized}: route inspects inbound auth tokens but does not prove validation of iss, aud, exp and iat; use Supabase getUser() or verifyJwtClaims()`);
  }
}

console.log('EuroComply auth token validation check');
console.log('--------------------------------------');
console.log(`Scanned ${files.length} JS/TS files.`);

if (failures.length > 0) {
  console.error('Auth token validation failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Auth token validation: ok');
}
