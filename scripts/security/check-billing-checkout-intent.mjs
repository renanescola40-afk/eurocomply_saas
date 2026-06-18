import { existsSync, readFileSync } from 'node:fs';

const ROUTE_PATH = 'src/app/api/billing/checkout-intent/route.ts';
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

console.log('EuroComply billing checkout intent security check');
console.log('----------------------------------------------------');

const route = read(ROUTE_PATH);

requireToken(route, 'assertOrganizationPermission', 'Checkout intent must authorize billing visibility through RBAC.');
requireToken(route, "permission: 'manage_billing'", 'Checkout intent must require manage_billing permission.');
requireToken(route, 'permissionDeniedResponse', 'Checkout intent must return hardened RBAC denial responses.');
requireToken(route, 'checkDistributedRateLimit', 'Checkout intent must use distributed rate limiting.');
requireToken(route, 'billing:checkout-intent', 'Checkout intent rate-limit key must be scoped to the billing intent action.');
requireToken(route, 'assertTrustedOrigin', 'Checkout intent POST must validate trusted Origin.');
requireToken(route, 'readBoundedJsonRequest', 'Checkout intent POST body must use bounded JSON parsing.');
requireToken(route, 'noStoreJson', 'Checkout intent responses must use no-store response helper.');

forbidToken(route, 'NextResponse.json', 'Checkout intent must not bypass noStoreJson with manual JSON responses.');
forbidToken(route, 'function jsonResponse', 'Checkout intent must not keep a local JSON helper that can drift from response policy.');
forbidToken(route, 'request.json()', 'Checkout intent must not parse request JSON directly.');

if (failures.length > 0) {
  console.error('Billing checkout intent security failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Billing checkout intent security: ok');
}
