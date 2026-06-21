import { existsSync, readFileSync } from 'node:fs';

const ROUTE_PATHS = [
  'src/app/api/billing/checkout/route.ts',
  'src/app/api/billing/portal/route.ts',
];
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

function requireAnyToken(source, tokens, message) {
  if (!tokens.some((token) => source.includes(token))) failures.push(message);
}

function forbidToken(source, token, message) {
  if (source.includes(token)) failures.push(message);
}

console.log('EuroComply billing return URL security check');
console.log('-----------------------------------------------');

const routes = ROUTE_PATHS.map((path) => [path, read(path)]);
const helper = read(HELPER_PATH);
const test = read(TEST_PATH);

for (const [routePath, route] of routes) {
  requireToken(route, 'resolveBillingReturnBaseUrl', `${routePath} must resolve Stripe return URLs through the hardened helper.`);
  requireAnyToken(route, ['billing_app_url_unavailable', 'returnBaseUrl.error'], `${routePath} must return a stable public error when return URL configuration is unavailable.`);
  requireToken(route, 'noStoreJson', `${routePath} must use no-store responses for return URL failures.`);
  forbidToken(route, 'process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin', `${routePath} must not directly fall back to caller-derived request origin.`);
  forbidToken(route, 'new URL(request.url).origin', `${routePath} must not derive production Stripe return URLs from the request origin.`);
  forbidToken(route, 'process.env.VERCEL_URL', `${routePath} must not use deployment host fallbacks for Stripe return URLs.`);
  forbidToken(route, 'http://localhost:3000', `${routePath} must not embed local fallback return URLs in production-facing route code.`);
}

const portalRoute = routes.find(([path]) => path.endsWith('/portal/route.ts'))?.[1] ?? '';
requireToken(portalRoute, 'normalizeLocale', 'Billing portal must normalize return locale through the central locale allowlist.');
forbidToken(portalRoute, "url.searchParams.get('locale') ??", 'Billing portal must not use raw locale query values in return URLs.');

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
