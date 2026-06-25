import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join, relative, sep } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

const requiredFiles = [
  '.env.example',
  '.github/workflows/vercel-production.yml',
  'docs/security/evidence/runtime/production-secrets-provider-stores.json',
  'docs/production-runbook.md',
];

const ignoredDirectories = new Set(['.git', '.next', '.turbo', '.vercel', 'coverage', 'dist', 'node_modules', 'playwright-report', 'test-results']);
const concreteValuePatterns = [
  { name: 'jwt-like value', pattern: /(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'payment provider restricted value', pattern: /(?<![A-Za-z0-9_-])(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { name: 'webhook signing value', pattern: /(?<![A-Za-z0-9_-])whsec_[A-Za-z0-9]{16,}/g },
  { name: 'source-control token value', pattern: /(?<![A-Za-z0-9_-])(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{20,}/g },
  { name: 'cloud access token value', pattern: /(?<![A-Za-z0-9_-])sbp_[A-Za-z0-9_.-]{20,}/g },
  { name: 'oauth client value', pattern: /(?<![A-Za-z0-9_-])GOCSPX-[A-Za-z0-9_-]{20,}/g },
  { name: 'api key value', pattern: /(?<![A-Za-z0-9_-])AIza[0-9A-Za-z_-]{30,}/g },
  { name: 'email provider key value', pattern: /(?<![A-Za-z0-9_-])re_[A-Za-z0-9_]{20,}/g },
];

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return ignoredDirectories.has(entry.name) ? [] : walk(fullPath);
    return entry.isFile() ? [fullPath] : [];
  });
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

function isPlaceholderValue(value) {
  return /^(|redacted|placeholder|example|sample|dummy|changeme|change-me|your-|sua-|ci-|ci_|test_|dev-|\.\.\.)/i.test(value)
    || value.includes('example')
    || value.includes('localhost');
}

function scanConcreteValues(path, source) {
  for (const item of concreteValuePatterns) {
    for (const match of source.matchAll(item.pattern)) {
      if (!isPlaceholderValue(match[0])) failures.push(`${path}:${lineNumberFor(source, match.index ?? 0)} possible committed ${item.name}`);
    }
  }
}

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) failures.push(`${file} is required for production provider readiness`);
}

for (const file of walk(root)) {
  const path = normalizePath(file);
  if (path === '.env.example') continue;
  if (basename(path).startsWith('.env')) failures.push(`${path}: committed environment file detected`);
  if (!['.md', '.mdx', '.txt', '.json', '.yml', '.yaml', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(extname(path))) continue;
  scanConcreteValues(path, readFileSync(file, 'utf8'));
}

if (existsSync(join(root, 'docs/security/evidence/runtime/production-secrets-provider-stores.json'))) {
  try {
    const evidence = JSON.parse(readFileSync(join(root, 'docs/security/evidence/runtime/production-secrets-provider-stores.json'), 'utf8'));
    if (evidence.status !== 'Complete') failures.push('production provider evidence status must be Complete');
    if (evidence.valuesRedacted !== true) failures.push('production provider evidence must set valuesRedacted=true');
    if (!Array.isArray(evidence.environmentsChecked) || !evidence.environmentsChecked.includes('production')) failures.push('production provider evidence must include production scope');
  } catch (error) {
    failures.push(`production provider evidence JSON is invalid: ${error instanceof Error ? error.message : error}`);
  }
}

try {
  const output = readFileSync(join(root, '.github/workflows/vercel-production.yml'), 'utf8');
  for (const token of ['npm ci', 'npm run lint', 'npm run typecheck', 'npm run test', 'npm run build', 'npm run security:ci', 'npm run quality:routes', 'npm run ops:vercel-readiness', 'npm run release:readiness', 'vercel deploy --prebuilt --prod']) {
    if (!output.includes(token)) failures.push(`production workflow missing gate: ${token}`);
  }
} catch {
  warnings.push('production workflow could not be read');
}

console.log('EuroComply production provider readiness check');
console.log('------------------------------------------------');
if (warnings.length > 0) {
  console.warn('Warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (failures.length > 0) {
  console.error('Production provider readiness failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Production provider readiness: ok');
}
