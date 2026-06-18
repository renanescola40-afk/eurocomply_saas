import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const failures = [];

const requiredFiles = [
  'src/lib/auth/public-errors.ts',
  'src/server/security/auth-callback.ts',
  'src/server/security/auth-callback.test.ts',
  'src/app/auth/callback/route.ts',
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
  return (hasPublicErrorSink && hasMessageSource) || decodesUrlError || reflectsSdkError;
}

console.log('EuroComply public error sanitization check');
console.log('--------------------------------------------');

for (const path of requiredFiles) {
  readRequiredFile(path);
}

const routeSource = readRequiredFile('src/app/auth/callback/route.ts');
if (!containsAll(routeSource, [
  'getSafeAuthCallbackNextPath',
  'getAuthCallbackLoginUrl',
  'applyNoStoreHeaders',
  'auth_exchange_failed',
  'auth_configuration_unavailable',
])) {
  failures.push('src/app/auth/callback/route.ts must use sanitized auth callback redirects and no-store');
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
