import { existsSync, readFileSync } from 'node:fs';

const path = 'src/app/api/ready/route.ts';
const testPath = 'src/app/api/ready/route.test.ts';
const failures = [];

function read(requiredPath) {
  if (!existsSync(requiredPath)) {
    failures.push(`${requiredPath} is missing.`);
    return '';
  }

  return readFileSync(requiredPath, 'utf8');
}

function requireToken(source, token, message) {
  if (!source.includes(token)) failures.push(message);
}

function requireBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex >= secondIndex) failures.push(message);
}

function forbidToken(source, token, message) {
  if (source.includes(token)) failures.push(message);
}

const source = read(path);
const tests = read(testPath);

console.log('EuroComply ready endpoint security check');
console.log('-----------------------------------------');

requireToken(source, 'noStoreJson', 'ready endpoint must use no-store JSON responses.');
requireToken(source, 'readyEnvironmentCheck', 'ready endpoint must expose grouped environment status through a testable helper.');
requireToken(source, 'missingCount', 'ready endpoint must count missing configuration without returning key names.');
requireToken(source, 'databaseReachable', 'ready endpoint must expose grouped database reachability.');
requireToken(source, 'reportError', 'ready endpoint must keep detailed provider errors server-side only.');
requireToken(source, "policy: 'health-internal'", 'ready endpoint must use the health-internal distributed rate-limit policy.');
requireToken(source, "failureMode: 'fail-closed'", 'ready endpoint must fail closed when readiness rate limiting is unavailable.');
requireBefore(
  source,
  'await requireEnterpriseRateLimit',
  'if (!hasHealthcheckToken(request))',
  'ready endpoint must rate limit requests before bearer-token validation.',
);
requireBefore(
  source,
  'await requireEnterpriseRateLimit',
  'await checkSupabaseConnectivity()',
  'ready endpoint must rate limit requests before live dependency checks.',
);

forbidToken(source, 'NextResponse.json', 'ready endpoint must not bypass noStoreJson.');
forbidToken(source, 'error.message', 'ready endpoint must not reflect raw exception messages.');
forbidToken(source, 'error?.message', 'ready endpoint must not reflect raw provider messages.');
forbidToken(source, 'supabaseUrl', 'ready endpoint must not expose individual environment key labels.');
forbidToken(source, 'supabaseAnonKey', 'ready endpoint must not expose individual environment key labels.');
forbidToken(source, 'supabaseServiceRole', 'ready endpoint must not expose individual environment key labels.');

requireToken(tests, 'not.toContain', 'ready endpoint tests must prove individual environment keys are not returned.');
requireToken(tests, 'cache-control', 'ready endpoint tests must assert no-store headers.');

if (failures.length > 0) {
  console.error('Ready endpoint security failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Ready endpoint security: ok');
}
