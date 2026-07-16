import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const IGNORED_DIRS = new Set(['.git', '.next', 'node_modules', 'coverage', 'dist', 'out']);
const ROUTE_FILE = /route\.(ts|tsx|js|mjs)$/;
const SERVER_FETCH_PATTERN = /(?:\bglobalThis\s*\.\s*)?\bfetch\s*\(/;

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

function stripComments(source) {
  let output = '';
  let state = 'code';
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (state === 'line-comment') {
      if (char === '\n') {
        output += '\n';
        state = 'code';
      } else {
        output += ' ';
      }
      continue;
    }

    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        output += '  ';
        index += 1;
        state = 'code';
      } else {
        output += char === '\n' ? '\n' : ' ';
      }
      continue;
    }

    if (state === 'single-quote' || state === 'double-quote' || state === 'template') {
      output += char;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (
        (state === 'single-quote' && char === "'") ||
        (state === 'double-quote' && char === '"') ||
        (state === 'template' && char === '`')
      ) {
        state = 'code';
      }
      continue;
    }

    if (char === '/' && next === '/') {
      output += '  ';
      index += 1;
      state = 'line-comment';
      continue;
    }
    if (char === '/' && next === '*') {
      output += '  ';
      index += 1;
      state = 'block-comment';
      continue;
    }
    if (char === "'") state = 'single-quote';
    else if (char === '"') state = 'double-quote';
    else if (char === '`') state = 'template';
    output += char;
  }

  return output;
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

  const source = stripComments(readFileSync(file.absolute, 'utf8'));
  const lowerPath = file.relative.toLowerCase();
  const looksLikeProxyRoute = lowerPath.includes('proxy') || lowerPath.includes('/[...');
  const doesServerFetch = SERVER_FETCH_PATTERN.test(source);
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
