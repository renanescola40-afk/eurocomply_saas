import { existsSync, readFileSync } from 'node:fs';

const ROUTE_PATH = 'src/app/api/internal/daily-maintenance/route.ts';
const TEST_PATH = 'src/app/api/internal/daily-maintenance/route.test.ts';

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing.`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function requireToken(source, token, message) {
  if (!source.includes(token)) {
    failures.push(message);
  }
}

console.log('EuroComply internal maintenance job security check');
console.log('---------------------------------------------------');

const route = read(ROUTE_PATH);
const test = read(TEST_PATH);

requireToken(
  route,
  'getConfiguredMaintenanceBaseUrl',
  `${ROUTE_PATH} must centralize configured app URL parsing.`,
);
requireToken(
  route,
  'resolveMaintenanceBaseUrl',
  `${ROUTE_PATH} must resolve job destinations through the hardened resolver.`,
);
requireToken(
  route,
  "process.env.NODE_ENV === 'production'",
  `${ROUTE_PATH} must fail closed in production before using request-derived fallback URLs.`,
);
requireToken(
  route,
  'internal_maintenance_base_url_unavailable',
  `${ROUTE_PATH} must return a stable public error when the base URL security control is unavailable.`,
);
requireToken(
  route,
  'noStoreJson',
  `${ROUTE_PATH} must keep no-store responses for internal maintenance errors and results.`,
);

const productionGuardIndex = route.indexOf("process.env.NODE_ENV === 'production'");
const requestUrlFallbackIndex = route.indexOf('new URL(request.url).origin');

if (requestUrlFallbackIndex !== -1 && (productionGuardIndex === -1 || requestUrlFallbackIndex < productionGuardIndex)) {
  failures.push(`${ROUTE_PATH} uses a request-derived fallback before the production fail-closed guard.`);
}

if (route.includes('process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin')) {
  failures.push(`${ROUTE_PATH} must not use caller-derived request origin as a direct fallback for internal jobs.`);
}

requireToken(
  test,
  'fails closed in production',
  `${TEST_PATH} must cover production fail-closed behavior.`,
);
requireToken(
  test,
  'uses the configured app URL and ignores the caller host',
  `${TEST_PATH} must cover configured app URL precedence over caller-controlled request host.`,
);

if (failures.length > 0) {
  console.error('Internal maintenance job security failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Internal maintenance job security: ok');
}
