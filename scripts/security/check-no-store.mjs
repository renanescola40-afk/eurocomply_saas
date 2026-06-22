import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const apiRoot = join(process.cwd(), 'src', 'app', 'api');

const sensitiveApiPatterns = [
  /src\/app\/api\/.*\/export\/route\.ts$/,
  /src\/app\/api\/audit\/evidence-pack(\/verify)?\/route\.ts$/,
  /src\/app\/api\/audit\/chain\/verify\/route\.ts$/,
  /src\/app\/api\/billing\/(checkout|checkout-intent|portal|webhook)\/route\.ts$/,
  /src\/app\/api\/stripe\/webhook\/route\.ts$/,
  /src\/app\/api\/gdpr\/.*\/route\.ts$/,
  /src\/app\/api\/ops\/.*\/route\.ts$/,
  /src\/app\/api\/internal\/.*\/route\.ts$/,
  /src\/app\/api\/intelligence\/refresh\/route\.ts$/,
  /src\/app\/api\/security\/step-up\/challenge\/route\.ts$/,
  /src\/app\/api\/ai-(systems|incidents)\/route\.ts$/,
  /src\/app\/api\/team\/.*\/route\.ts$/,
  /src\/app\/api\/documents\/.*\/route\.ts$/,
];

const acceptableNoStoreTokens = [
  'noStoreJson',
  'noStoreDownload',
  'applyNoStoreHeaders',
  "'Cache-Control'",
  '"Cache-Control"',
  'no-store',
];

function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile() && entry.name === 'route.ts') return [fullPath];
    return [];
  });
}

function normalizePath(path) {
  return relative(process.cwd(), path).split(sep).join('/');
}

function isSensitiveApi(path) {
  return sensitiveApiPatterns.some((pattern) => pattern.test(path));
}

function hasNoStore(source) {
  return acceptableNoStoreTokens.some((token) => source.includes(token));
}

const failures = [];
const routes = walk(apiRoot);
const sensitiveRoutes = routes.map(normalizePath).filter(isSensitiveApi);

for (const normalized of sensitiveRoutes) {
  const source = readFileSync(join(process.cwd(), normalized), 'utf8');
  if (!hasNoStore(source)) {
    failures.push(`${normalized}: sensitive API route is missing no-store cache protection`);
  }
}

const helperPath = 'src/server/security/no-store.ts';
if (!existsSync(helperPath)) {
  failures.push(`${helperPath} is missing. Use centralized no-store helpers for sensitive responses.`);
}

console.log('EuroComply sensitive API no-store check');
console.log('---------------------------------------');
console.log(`Scanned ${routes.length} API route files; ${sensitiveRoutes.length} sensitive route files.`);

if (failures.length > 0) {
  console.error('No-store cache failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Sensitive API no-store coverage: ok');
}
