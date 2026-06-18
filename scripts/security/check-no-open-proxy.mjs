import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const IGNORED_DIRS = new Set(['.git', '.next', 'node_modules', 'coverage', 'dist', 'out']);
const ROUTE_FILE = /route\.(ts|tsx|js|mjs)$/;

const failures = [];

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;

    const absolute = join(dir, entry);
    const stat = statSync(absolute);

    if (stat.isDirectory()) {
      walk(absolute, files);
    } else {
      files.push(absolute);
    }
  }

  return files;
}

function normalizePath(path) {
  return path.replace(/\\/g, '/');
}

function hasWhitespacePathSegment(path) {
  return normalizePath(path)
    .split('/')
    .some((segment) => segment.length > 0 && /\s/.test(segment));
}

function hasAny(source, tokens) {
  return tokens.some((token) => source.includes(token));
}

function isRouteFile(path) {
  return ROUTE_FILE.test(path);
}

const files = walk(ROOT).map((path) => ({
  absolute: path,
  relative: normalizePath(relative(ROOT, path)),
}));

console.log('EuroComply open proxy / SSRF regression check');
console.log('-----------------------------------------------');

for (const file of files) {
  if (!file.relative.startsWith('src/')) continue;
  if (!isRouteFile(file.relative)) continue;

  const source = readFileSync(file.absolute, 'utf8');
  const lowerPath = file.relative.toLowerCase();
  const looksLikeProxyRoute = lowerPath.includes('proxy') || lowerPath.includes('/[...');
  const doesServerFetch = source.includes('fetch(');
  const forwardsRequestHeaders =
    source.includes('request.headers.forEach') ||
    source.includes('new Headers(request.headers)') ||
    source.includes('headers.set("Host"') ||
    source.includes("headers.set('Host'");
  const injectsServerCredential = /process\.env|api[_-]?key|authorization|bearer|service[_-]?role/i.test(source);
  const usesTrustedOriginGuard = hasAny(source, ['assertTrustedOrigin', 'requireEnterpriseApiAccess']);
  const usesAuthGuard = hasAny(source, ['requireEnterpriseApiAccess', 'getCurrentUser', 'requireCurrentUser']);
  const usesRateLimit = source.includes('checkDistributedRateLimit');
  const usesNoStore = hasAny(source, ['noStoreJson', 'applyNoStoreHeaders', 'noStoreDownload']);

  if (hasWhitespacePathSegment(file.relative)) {
    failures.push(`${file.relative} has whitespace in a route path segment; this can hide or orphan proxy routes.`);
  }

  if (looksLikeProxyRoute && doesServerFetch) {
    const missing = [];
    if (!usesTrustedOriginGuard) missing.push('trusted origin guard');
    if (!usesAuthGuard) missing.push('authentication guard');
    if (!usesRateLimit) missing.push('distributed rate limit');
    if (!usesNoStore) missing.push('no-store response handling');

    if (missing.length > 0) {
      failures.push(`${file.relative} looks like a proxy/catch-all route with server fetch but is missing: ${missing.join(', ')}`);
    }
  }

  if (doesServerFetch && forwardsRequestHeaders && injectsServerCredential) {
    failures.push(`${file.relative} forwards caller-controlled headers while injecting server-side credentials; use an explicit outbound allowlist instead.`);
  }
}

if (failures.length > 0) {
  console.error('Open proxy / SSRF guard failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Open proxy / SSRF guard: ok');
}
