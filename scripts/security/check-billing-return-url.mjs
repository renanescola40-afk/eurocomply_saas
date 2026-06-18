import { existsSync, readFileSync } from 'node:fs';

const ROUTE_PATH = 'src/app/api/billing/checkout/route.ts';
const HELPER_PATH = 'src/server/billing/app-url.ts';
const TEST_PATH = 'src/server/billing/app-url.test.ts';

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing.`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function requireToken(source, token, message) {
  if (!source.includes(token)) failures.push(message);
}

function forbidToken(source, token, message) {
  if (source.includes(token)) failures.push(message);
}

console.log('EuroComply billing return URL security check');
console.log('-----------------------------------------------');

const route = read(ROUTE_PATH);
const helper = read(HELPER_PATH);
const test = read(TEST_PATH);

requireToken(route, 'resolveBillingReturnBaseUrl', `${ROUTE_PATH} must resolve Stripe return URLs through the hardened helper.`);
requireToken(route, 'billing_app_url_unavailable', `${ROUTE_PATH} must return a stable public error when return URL configuration is unavailable.`);
requireToken(route, 'noStoreJson', `${ROUTE_PATH} must use no-store responses for return URL failures.`);
forbidToken(route, 'process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin', `${ROUTE_PATH} must not directly fall back to caller-derived request origin.`);
forbidToken(route, 'new URL(request.url).origin', `${ROUTE_PATH} must not derive production Stripe return URLs from the request origin.`);

requireToken(helper, 'resolveBillingReturnBaseUrl', `${HELPER_PATH} must centralize billing return URL resolution.`);
requireToken(helper, "env.NODE_ENV === 'production'", `${HELPER_PATH} must fail closed in production when app URL configuration is unavailable.`);
requireToken(helper, 'NEXT_PUBLIC_APP_URL', `${HELPER_PATH} must prefer server-controlled app URL configuration.`);
requireToken(helper, 'ALLOWED_APP_URL_PROTOCOLS', `${HELPER_PATH} must restrict app URL protocols.`);

requireToken(test, 'fails closed in production when app URL is missing', `${TEST_PATH} must cover production missing-config fail-closed behavior.`);
requireToken(test, 'fails closed in production when app URL is invalid', `${TEST_PATH} must cover invalid configured app URL fail-closed behavior.`);
requireToken(test, 'allows request origin fallback outside production', `${TEST_PATH} must cover dev/test fallback behavior.`);

if (failures.length > 0) {
  console.error('Billing return URL security failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Billing return URL security: ok');
}
