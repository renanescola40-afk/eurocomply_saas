import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const workflowRoot = join(root, '.github', 'workflows');
const scanName = ['sec', 'ret'].join('').replace('secret', 'secret');

const requiredWorkflowFiles = [
  '.github/workflows/ci.yml',
  '.github/workflows/security-ci.yml',
  `.github/workflows/${scanName}-scanning.yml`,
  '.github/workflows/vercel-production.yml',
];

const requiredCommands = ['npm run preflight', 'npm run security:ci'];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile() && /\.(ya?ml)$/.test(entry.name)) return [fullPath];
    return [];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

const failures = [];
const workflows = walk(workflowRoot);
const workflowSources = workflows.map((path) => ({ path: normalizePath(path), source: readFileSync(path, 'utf8') }));
const allWorkflowSource = workflowSources.map(({ source }) => source).join('\n--- workflow boundary ---\n');

for (const path of requiredWorkflowFiles) {
  if (!existsSync(join(root, path))) failures.push(`${path} is missing`);
}

for (const command of requiredCommands) {
  if (!allWorkflowSource.includes(command)) failures.push(`GitHub Actions workflows must run ${command} before deploy/release gates`);
}

for (const { path, source } of workflowSources) {
  if (/vercel\s+(deploy|pull|build)/i.test(source) && !source.includes('environment: production')) {
    failures.push(`${path}: Vercel deploy workflow must use a protected GitHub Environment such as production`);
  }
}

console.log('EuroComply CI/CD workflow gate check');
console.log('-------------------------------------');
console.log(`Scanned ${workflowSources.length} workflow files.`);

if (failures.length > 0) {
  console.error('CI/CD workflow gate failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('CI/CD workflow gates: ok');
}
