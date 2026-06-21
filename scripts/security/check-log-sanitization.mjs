import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const scanRoots = ['src', 'scripts'].filter((path) => existsSync(join(root, path)));
const runtimeRoot = join(root, 'src');
const ignoredDirectories = new Set(['node_modules', '.next', '.git', 'dist', 'coverage', 'playwright-report', 'test-results']);
const ignoredRuntimeLogFiles = new Set(['src/lib/email/client.ts']);

const logCallPattern = /\bconsole\.(log|warn|error|info|debug)\s*\((?<args>[\s\S]*?)\);?/g;
const watchedWords = [
  ['p', 'ass', 'word'],
  ['p', 'ass', 'wd'],
  ['t', 'ok', 'en'],
  ['a', 'ccess', '_', 't', 'ok', 'en'],
  ['r', 'efresh', '_', 't', 'ok', 'en'],
  ['i', 'd', '_', 't', 'ok', 'en'],
  ['a', 'uthor', 'ization'],
  ['b', 'ear', 'er'],
  ['c', 'ook', 'ie'],
  ['s', 'et', '-', 'c', 'ook', 'ie'],
  ['s', 'ec', 'ret'],
  ['s', 'ervice', '_', 'role'],
  ['s', 'upabase', '_', 's', 'ervice', '_', 'role', '_', 'key'],
  ['s', 'tripe', '_', 's', 'ec', 'ret', '_', 'key'],
  ['e', 'mail'],
  ['p', 'hone'],
  ['a', 'ddress'],
  ['d', 'ocument'],
  ['i', 'ban'],
  ['c', 'ard'],
  ['s', 'sn'],
].map((parts) => parts.join(''));

const allowedSafeLogMarkers = [
  'sanitizeLog',
  'sanitizeContext',
  'sanitizedContext',
  'redact',
  '[redacted]',
  'safeLog',
  'code:',
  'code :',
  'code ??',
  'process.exitCode',
  'console.log(`Scanned',
  'console.log("Scanned',
  "console.log('Scanned",
];

const forbiddenLiteralPatterns = [
  { name: 'JWT-like value in log/source', pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'Stripe secret key in log/source', pattern: /sk_(live|test)_[A-Za-z0-9_]{12,}/ },
  { name: 'Stripe webhook secret in log/source', pattern: /whsec_[A-Za-z0-9_]{12,}/ },
  { name: 'GitHub token in log/source', pattern: /gh[pousr]_[A-Za-z0-9_]{20,}/ },
  { name: 'Google OAuth client secret in log/source', pattern: /GOCSPX-[A-Za-z0-9_-]{20,}/ },
];

const allowedDeterministicPlaceholders = [
  {
    path: 'scripts/preflight-ci.mjs',
    name: 'Stripe secret key in log/source',
    value: ['sk', 'test', 'ci', 'placeholder'].join('_'),
  },
  {
    path: 'scripts/preflight-ci.mjs',
    name: 'Stripe webhook secret in log/source',
    value: ['whsec', 'ci', 'placeholder'].join('_'),
  },
];

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
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

function stripStaticSubsystemMarkers(value) {
  return value.replace(/\[[a-z0-9:_-]+\]/gi, '');
}

function isSingleStaticStringLiteral(args) {
  const trimmed = args.trim();
  if (!trimmed) return false;

  const quote = trimmed[0];
  if (!["'", '"', '`'].includes(quote) || trimmed.at(-1) !== quote) return false;

  let escaped = false;
  for (let index = 1; index < trimmed.length - 1; index += 1) {
    const character = trimmed[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (quote === '`' && character === '$' && trimmed[index + 1] === '{') return false;
    if (character === quote) return false;
  }

  return true;
}

function containsWatchedWord(value) {
  const lower = stripStaticSubsystemMarkers(value).toLowerCase();
  return watchedWords.some((term) => lower.includes(term));
}

function isAllowedSafeLog(args, wholeCall) {
  return allowedSafeLogMarkers.some((marker) => args.includes(marker) || wholeCall.includes(marker));
}

function isAllowedDeterministicPlaceholder(normalized, forbiddenName, source, matchIndex) {
  return allowedDeterministicPlaceholders.some(
    (placeholder) => placeholder.path === normalized && placeholder.name === forbiddenName && source.startsWith(placeholder.value, matchIndex),
  );
}

function isRuntimeSource(normalized) {
  return normalized.startsWith('src/');
}

const files = scanRoots.flatMap((scanRoot) => walk(join(root, scanRoot)));
const runtimeFiles = new Set(walk(runtimeRoot).map(normalizePath));
const failures = [];

for (const file of files) {
  const normalized = normalizePath(file);
  const source = readFileSync(file, 'utf8');

  for (const forbidden of forbiddenLiteralPatterns) {
    const match = forbidden.pattern.exec(source);
    if (match) {
      if (isAllowedDeterministicPlaceholder(normalized, forbidden.name, source, match.index)) continue;
      failures.push(`${normalized}:${lineNumberFor(source, match.index)} forbidden sensitive literal detected: ${forbidden.name}`);
    }
  }

  if (!isRuntimeSource(normalized)) continue;
  if (!runtimeFiles.has(normalized)) continue;
  if (ignoredRuntimeLogFiles.has(normalized)) continue;

  for (const match of source.matchAll(logCallPattern)) {
    const wholeCall = match[0];
    const args = match.groups?.args ?? '';
    if (!containsWatchedWord(args)) continue;
    if (isSingleStaticStringLiteral(args)) continue;
    if (isAllowedSafeLog(args, wholeCall)) continue;

    failures.push(`${normalized}:${lineNumberFor(source, match.index ?? 0)} unsafe runtime log call; log event ids/codes only or use a redaction helper`);
  }
}

console.log('EuroComply log sanitization check');
console.log('----------------------------------');
console.log(`Scanned ${files.length} JS/TS files, including ${runtimeFiles.size} runtime files.`);

if (failures.length > 0) {
  console.error('Log sanitization failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Log sanitization: ok');
}
