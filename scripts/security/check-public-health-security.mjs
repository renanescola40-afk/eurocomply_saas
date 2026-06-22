import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const routePath = join(root, 'src', 'app', 'api', 'health', 'route.ts');
const testPath = join(root, 'src', 'app', 'api', 'health', 'route.test.ts');
const failures = [];

function readRequired(path, label) {
  if (!existsSync(path)) {
    failures.push(`${label} is missing`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

const routeSource = readRequired(routePath, 'public health route');
const testSource = readRequired(testPath, 'public health route test');

if (routeSource.includes('NextResponse.json')) {
  failures.push('public health route must use noStoreJson instead of manual JSON responses');
}

if (!routeSource.includes('noStoreJson')) {
  failures.push('public health route must use noStoreJson for no-store headers');
}

const forbiddenRouteTokens = [
  'environment:',
  'commit:',
  'VERCEL_ENV',
  'VERCEL_GIT_COMMIT_SHA',
  'NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA',
];

for (const token of forbiddenRouteTokens) {
  if (routeSource.includes(token)) {
    failures.push(`public health route must not expose operational metadata token: ${token}`);
  }
}

if (!testSource.includes('not.toHaveProperty(\'environment\')') || !testSource.includes('not.toHaveProperty(\'commit\')')) {
  failures.push('public health route tests must assert that operational metadata stays out of the response');
}

console.log('Public health endpoint security check');
console.log('-------------------------------------');

if (failures.length > 0) {
  console.error('Public health endpoint security failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Public health endpoint contract: ok');
}
