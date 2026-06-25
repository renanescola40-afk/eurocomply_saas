import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

const root = process.cwd();
const strictName = ['STRICT', 'PUBLIC', 'SEC', 'RET', 'SCAN'].join('_').replace('SEC_RET', 'SECRET');
const strictPublicScan = process.env[strictName] === '1';
const scanRoots = ['src', 'scripts', 'docs', '.github', 'supabase'].filter((path) => existsSync(join(root, path)));
const scanFiles = [
  'package.json',
  'next.config.ts',
  'proxy.ts',
  'instrumentation.ts',
  'instrumentation-client.ts',
  '.env',
  '.env.local',
  '.env.development',
  '.env.test',
  '.env.production',
  '.env.preview',
  '.env.example',
].filter((path) => existsSync(join(root, path)));

const ignoredDirectories = new Set(['node_modules', '.next', '.git', '.vercel', 'dist', 'coverage', 'playwright-report', 'test-results']);
const committedEnvFile = /^\.env(\..*)?$/;
const allowedCommittedEnvFiles = new Set(['.env.example']);

const concretePatterns = [
  ['jwt-like credential', 'eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}'],
  ['provider live key', ['sk', 'live'].join('_') + '_[A-Za-z0-9]{16,}'],
  ['provider restricted key', ['rk', 'live'].join('_') + '_[A-Za-z0-9]{16,}'],
  ['webhook value', 'wh' + 'sec' + '_[A-Za-z0-9]{16,}'],
  ['repository token', 'gh[pousr]_[A-Za-z0-9_]{20,}'],
  ['provider access token', 'sbp_[A-Za-z0-9_.-]{20,}'],
  ['oauth client value', 'GOCSPX-[A-Za-z0-9_-]{20,}'],
  ['cloud api key', 'AIza[0-9A-Za-z_-]{30,}'],
  ['email provider key', 're_[A-Za-z0-9_]{20,}'],
].map(([name, source]) => ({ name, pattern: new RegExp(`(?<![A-Za-z0-9_-])${source}`, 'g') }));

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return ignoredDirectories.has(entry.name) ? [] : walk(fullPath);
    if (!entry.isFile()) return [];
    if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|md|yml|yaml|sql|example)$/.test(entry.name) && !entry.name.startsWith('.env')) return [];
    return [fullPath];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

function isReferenceOnlyContext(path, line) {
  return path === '.gitleaks.toml'
    || path === 'package.json'
    || path.startsWith('docs/')
    || path.startsWith('scripts/security/')
    || path.startsWith('.github/workflows/')
    || /\$\{\{\s*(secrets|vars|env|github)\./.test(line);
}

const files = [...scanRoots.flatMap((scanRoot) => walk(join(root, scanRoot))), ...scanFiles.map((file) => join(root, file))];
const failures = [];

if (!strictPublicScan) failures.push(`${strictName}=1 is required; report-only scanning is not allowed in CI or release checks`);

for (const file of new Set(files)) {
  const normalized = normalizePath(file);
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');

  if (committedEnvFile.test(basename(normalized)) && !allowedCommittedEnvFiles.has(basename(normalized))) {
    failures.push(`${normalized}: committed environment file detected; keep runtime values in provider stores only`);
  }

  for (const item of concretePatterns) {
    for (const match of source.matchAll(item.pattern)) {
      const line = lines[lineNumberFor(source, match.index ?? 0) - 1] ?? '';
      if (!isReferenceOnlyContext(normalized, line)) {
        failures.push(`${normalized}:${lineNumberFor(source, match.index ?? 0)} possible committed credential: ${item.name}`);
      }
    }
  }
}

console.log('EuroComply public exposure check');
console.log('--------------------------------');
console.log(`Scanned ${new Set(files).size} files.`);

if (failures.length > 0) {
  console.error('Public exposure findings:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Public exposure check: ok');
}
