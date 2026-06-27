import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const appRoot = join(root, 'src', 'app');
const ignoredDirectories = new Set(['api', 'auth', 'node_modules', '.next', '.git', 'dist', 'coverage']);
const checkoutPagePath = 'src/app/[locale]/billing/checkout/[plan]/page.tsx';

const failures = [];

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function walk(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) return [];
      return walk(fullPath);
    }

    if (!entry.isFile()) return [];
    return /\.(ts|tsx|js|jsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function requireToken(source, token, message) {
  if (!source.includes(token)) failures.push(message);
}

function forbidToken(source, token, message) {
  if (source.includes(token)) failures.push(message);
}

console.log('EuroComply billing page boundary security check');
console.log('--------------------------------------------------');

if (!existsSync(checkoutPagePath)) {
  failures.push(`${checkoutPagePath} is missing; deprecated checkout page boundary cannot be verified.`);
} else {
  const checkoutPage = readFileSync(checkoutPagePath, 'utf8');

  requireToken(checkoutPage, 'normalizeBillingPlanId', 'Deprecated checkout page must normalize legacy plan identifiers before redirecting.');
  requireToken(checkoutPage, 'normalizeLocale', 'Deprecated checkout page must normalize locale before building local redirects.');
  requireToken(checkoutPage, '/checkout?plan=', 'Deprecated checkout page must redirect to the canonical checkout page.');
  requireToken(checkoutPage, 'pricing?checkout=invalid_plan', 'Deprecated checkout page must route invalid plans to a controlled pricing error state.');

  forbidToken(checkoutPage, 'getStripeClient', 'Deprecated checkout page must not import or initialize Stripe.');
  forbidToken(checkoutPage, 'checkout.sessions.create', 'Deprecated checkout page must not create Stripe sessions during GET rendering.');
  forbidToken(checkoutPage, 'process.env.NEXT_PUBLIC_APP_URL', 'Deprecated checkout page must not build absolute return URLs.');
  forbidToken(checkoutPage, 'process.env.VERCEL_URL', 'Deprecated checkout page must not use deployment host fallbacks.');
  forbidToken(checkoutPage, 'http://localhost:3000', 'Deprecated checkout page must not embed local host fallbacks.');
  forbidToken(checkoutPage, 'getCurrentUser', 'Deprecated checkout page must not duplicate checkout authorization outside the API route.');
  forbidToken(checkoutPage, 'getCurrentOrganizationForUser', 'Deprecated checkout page must not duplicate tenant lookup outside the API route.');
}

for (const file of walk(appRoot)) {
  const path = normalizePath(file);
  const source = readFileSync(file, 'utf8');

  if (path.startsWith('src/app/api/') || path.startsWith('src/app/auth/')) continue;

  const looksLikePageBoundary = /\/page\.(ts|tsx|js|jsx)$/.test(path);
  if (!looksLikePageBoundary) continue;

  if (source.includes('checkout.sessions.create') || source.includes('getStripeClient')) {
    failures.push(`${path}: page boundaries must not create Stripe sessions or initialize Stripe; use hardened API routes instead.`);
  }
}

if (failures.length > 0) {
  console.error('Billing page boundary security failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Billing page boundary security: ok');
}
