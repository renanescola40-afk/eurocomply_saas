import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const workflowRoot = join(root, '.github', 'workflows');
const failures = [];

const requiredWorkflowFiles = [
  '.github/workflows/ci.yml',
  '.github/workflows/security-ci.yml',
  '.github/workflows/secret-scanning.yml',
  '.github/workflows/vercel-production.yml',
];

const requiredProductionTokens = [
  'environment: production',
  'persist-credentials: false',
  'npm ci',
  'npm run lint',
  'npm run typecheck',
  'npm run test',
  'npm run build',
  'npm run security:ci',
  'npm run quality:routes',
  'npm run ops:vercel-readiness',
  'npm run release:readiness',
  'npm run release:enterprise-readiness',
  'vercel pull',
  'vercel build --prod',
  'vercel deploy --prebuilt --prod',
];

const requiredSecurityCiTokens = [
  'node scripts/preflight-ci.mjs',
  'npm run security:github-workflows',
  'npm run security:ci',
  'npm run security:production-secrets',
];

const forbiddenValuePatterns = [
  { name: 'hardcoded cloud project URL', pattern: /https:\/\/[a-z0-9-]+\.supabase\.co/i },
  { name: 'hardcoded payment restricted value', pattern: /(?:sk|rk)_(?:live|test)_[A-Za-z0-9_]{16,}/i },
  { name: 'hardcoded webhook signing value', pattern: /whsec_[A-Za-z0-9_]{16,}/i },
  { name: 'hardcoded source-control token value', pattern: /(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{20,}/i },
  { name: 'hardcoded provider access token value', pattern: /sbp_[A-Za-z0-9_.-]{20,}/i },
  { name: 'hardcoded deploy token-like assignment', pattern: /vercel[_-]?token\s*[:=]\s*['"]?[A-Za-z0-9_\-]{20,}/i },
];

function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile() && /\.(ya?ml)$/.test(entry.name)) return [fullPath];
    return [];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

const workflows = walk(workflowRoot);
const workflowSources = workflows.map((path) => ({ path: normalizePath(path), source: readFileSync(path, 'utf8') }));

for (const path of requiredWorkflowFiles) {
  if (!existsSync(join(root, path))) failures.push(`${path} is missing`);
}

const productionWorkflow = workflowSources.find((workflow) => workflow.path === '.github/workflows/vercel-production.yml')?.source ?? '';
for (const token of requiredProductionTokens) {
  if (!productionWorkflow.includes(token)) failures.push(`production workflow missing required deploy gate token: ${token}`);
}

const securityCiWorkflow = workflowSources.find((workflow) => workflow.path === '.github/workflows/security-ci.yml')?.source ?? '';
for (const token of requiredSecurityCiTokens) {
  if (!securityCiWorkflow.includes(token)) failures.push(`security CI workflow missing required gate token: ${token}`);
}

for (const { path, source } of workflowSources) {
  for (const forbidden of forbiddenValuePatterns) {
    const match = source.match(forbidden.pattern);
    if (match) failures.push(`${path}:${lineNumberFor(source, match.index ?? 0)} forbidden CI/CD value pattern: ${forbidden.name}`);
  }

  source.split('\n').forEach((line, index) => {
    if (!/\b(echo|printf|tee|cat)\b/i.test(line)) return;
    if (/\$\{\{\s*secrets(?:\.|\[['"])/i.test(line)) failures.push(`${path}:${index + 1} workflow must not print protected provider context`);
  });

  if (/vercel\s+(deploy|pull|build)/i.test(source) && !source.includes('environment: production')) {
    failures.push(`${path}: Vercel deploy workflow must use a protected GitHub Environment such as production`);
  }
}

console.log('EuroComply CI/CD deploy gate check');
console.log('------------------------------------');
console.log(`Scanned ${workflowSources.length} workflow files.`);

if (failures.length > 0) {
  console.error('CI/CD deploy gate failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('CI/CD deploy gates: ok');
}
