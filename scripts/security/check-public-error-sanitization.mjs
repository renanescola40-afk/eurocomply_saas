import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const failures = [];

const requiredFiles = [
  'src/lib/auth/public-errors.ts',
  'src/server/security/auth-callback.ts',
  'src/server/security/auth-callback.test.ts',
  'src/app/auth/callback/route.ts',
  'src/app/auth/google/route.ts',
  'src/app/[locale]/login/page.tsx',
];

function readRequiredFile(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
      walk(path, acc);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(path);
    }
  }

  return acc;
}

function containsAll(source, tokens) {
  return tokens.every((token) => source.includes(token));
}

function hasRawPublicErrorReflection(source) {
  const hasPublicErrorSink = source.includes("searchParams.set('error'") || source.includes('searchParams.set("error"');
  const hasMessageSource = source.includes('.message') || source.includes('JSON.stringify(');
  const decodesUrlError = source.includes('decodeURIComponent(urlError)');
  const reflectsSdkError = source.includes('setError(result.error') && source.includes('.message');
  const buildsProviderMessage = source.includes('error?.message') || source.includes('error.message');
  const passesMessageToLoginRedirect = source.includes('getLoginUrl(') && source.includes('message');
  return (hasPublicErrorSink && hasMessageSource)
    || decodesUrlError
    || reflectsSdkError
    || (buildsProviderMessage && passesMessageToLoginRedirect);
}

function hasSanitizedLegacyRedirect(source) {
  return containsAll(source, [
    'applyNoStoreHeaders',
    'NextResponse.redirect',
    'getSafeNextPath',
    "searchParams.set('next'",
  ]) && !hasRawPublicErrorReflection(source);
}

console.log('EuroComply public error sanitization check');
console.log('--------------------------------------------');

for (const path of requiredFiles) {
  readRequiredFile(path);
}

const callbackRouteSource = readRequiredFile('src/app/auth/callback/route.ts');
const callbackUsesAllowlistedRedirect = containsAll(callbackRouteSource, [
  'getSafeAuthCallbackNextPath',
  'getAuthCallbackLoginUrl',
  'applyNoStoreHeaders',
  'auth_exchange_failed',
  'auth_configuration_unavailable',
]);
if (!callbackUsesAllowlistedRedirect && !hasSanitizedLegacyRedirect(callbackRouteSource)) {
  failures.push('src/app/auth/callback/route.ts must use sanitized callback redirects and no-store');
}

const googleRouteSource = readRequiredFile('src/app/auth/google/route.ts');
const googleUsesAllowlistedRedirect = containsAll(googleRouteSource, [
  'getSafeAuthCallbackNextPathForLocale',
  'getAuthCallbackLoginUrl',
  'applyNoStoreHeaders',
  'auth_exchange_failed',
  'auth_configuration_unavailable',
]);
if (!googleUsesAllowlistedRedirect && !hasSanitizedLegacyRedirect(googleRouteSource)) {
  failures.push('src/app/auth/google/route.ts must use sanitized OAuth start redirects and no-store');
}

const loginSource = readRequiredFile('src/app/[locale]/login/page.tsx');
if (!containsAll(loginSource, ['normalizePublicAuthErrorCode', 'publicErrors', 'email_sign_in_failed'])) {
  failures.push('src/app/[locale]/login/page.tsx must render allowlisted public auth errors');
}

const publicErrorsSource = readRequiredFile('src/lib/auth/public-errors.ts');
if (!containsAll(publicErrorsSource, ['PUBLIC_AUTH_ERROR_CODES', 'normalizePublicAuthErrorCode', 'auth_exchange_failed'])) {
  failures.push('src/lib/auth/public-errors.ts must define allowlisted public auth error codes');
}

for (const path of walk('src')) {
  const source = readFileSync(path, 'utf8');
  if (hasRawPublicErrorReflection(source)) {
    failures.push(`${path} may reflect a raw public error; use allowlisted public error codes instead`);
  }
}

if (failures.length > 0) {
  console.error('Public error sanitization failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Public error sanitization: ok');
}
