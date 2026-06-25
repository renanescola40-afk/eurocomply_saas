import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const workflowRoot = join(root, '.github', 'workflows');

const requiredWorkflowFiles = [
  '.github/workflows/ci.yml',
  '.github/workflows/security-ci.yml',
  `.github/workflows/${scanName}-scanning.yml`,
  '.github/workflows/vercel-production.yml',
];

const requiredPreflightTokens = [
  'npm run preflight',
  'npm run security:ci',
  'npm run security:production-secrets',
  'npm run security:public-secrets',
];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))) return [fullPath];
    return [];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function isPrintCommand(line) {
  const trimmed = line.trimStart();
  return trimmed.startsWith('echo ') || trimmed.startsWith('printf ') || trimmed.startsWith('tee ') || trimmed.startsWith('cat ');
}

function hasCredentialContext(line) {
  const text = line.replaceAll(' ', '').replaceAll('\t', '');
  return text.includes('${{secrets.') || text.includes('${{secrets[');
}

const failures = [];
const workflows = walk(workflowRoot);
const workflowSources = workflows.map((path) => ({ path: normalizePath(path), source: readFileSync(path, 'utf8') }));

for (const path of requiredWorkflowFiles) {
  if (!existsSync(join(root, path))) failures.push(`${path} is missing`);
}

for (const token of requiredPreflightTokens) {
  if (!allWorkflowSource.includes(token)) failures.push(`GitHub Actions workflows must run ${token} before deploy/release gates`);
}

for (const { path, source } of workflowSources) {
  const lines = source.split('\n');

  lines.forEach((line, index) => {
    if (isPrintCommand(line) && hasCredentialContext(line)) {
      failures.push(`${path}:${index + 1} workflow must not print credential contexts`);
    }
  });

  if (source.includes('vercel deploy') || source.includes('vercel pull') || source.includes('vercel build')) {
    if (!source.includes('environment: production')) {
      failures.push(`${path}: Vercel deploy workflow must use a protected GitHub Environment such as production`);
    }
  }
}

console.log('EuroComply CI/CD workflow governance check');
console.log('-------------------------------------------');
console.log(`Scanned ${workflowSources.length} workflow files.`);

if (failures.length > 0) {
  console.error('CI/CD workflow governance failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('CI/CD workflow governance: ok');
}
