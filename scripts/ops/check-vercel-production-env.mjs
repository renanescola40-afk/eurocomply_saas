import { readFileSync, existsSync } from 'node:fs';

const failures = [];
const envExamplePath = '.env.example';
const productionWorkflowPath = '.github/workflows/vercel-production.yml';

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function parseEnvExample(source) {
  const names = new Set();
  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    names.add(trimmed.slice(0, index).trim());
  }
  return names;
}

function hasRuntimeValue(name) {
  return Boolean(String(process.env[name] ?? '').trim());
}

function requireWorkflowToken(workflow, token) {
  if (!workflow.includes(token)) failures.push(`${productionWorkflowPath}: missing gate or deploy command ${token}.`);
}

function validateDocumentation(envNames, workflow) {
  const requiredNames = [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SITE_URL',
    'TRUSTED_ORIGINS',
    'RELEASE_TARGET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'GOOGLE_CLIENT_ID',
    'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
    'MALWARE_SCANNER_PROVIDER',
    'NEXT_PUBLIC_SENTRY_DSN',
  ];

  for (const name of requiredNames) {
    if (!envNames.has(name)) failures.push(`${envExamplePath}: missing ${name}.`);
  }

  for (const token of [
    'npm ci',
    'npm run lint',
    'npm run typecheck',
    'npm run test',
    'npm run build',
    'npm run security:ci',
    'npm run quality:routes',
    'npm run ops:vercel-readiness',
    'npm run release:readiness',
    'npm run release:enterprise-readiness',
    '"vercel@${VERCEL_CLI_VERSION}" deploy --prebuilt --prod',
  ]) {
    requireWorkflowToken(workflow, token);
  }
}

function validateRuntime() {
  const requiredRuntimeNames = ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL', 'TRUSTED_ORIGINS', 'RELEASE_TARGET'];
  for (const name of requiredRuntimeNames) {
    if (!hasRuntimeValue(name)) failures.push(`${name}: missing production runtime value.`);
  }

  for (const originName of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL']) {
    const value = process.env[originName];
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') failures.push(`${originName}: production value must use https.`);
    } catch {
      failures.push(`${originName}: production value must be an absolute URL.`);
    }
  }

  const trustedOrigins = String(process.env.TRUSTED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  if (trustedOrigins.length === 0) failures.push('TRUSTED_ORIGINS: configure at least one trusted production origin.');
  for (const origin of trustedOrigins) {
    try {
      const url = new URL(origin);
      if (url.protocol !== 'https:') failures.push('TRUSTED_ORIGINS: every production origin must use https.');
    } catch {
      failures.push('TRUSTED_ORIGINS: every entry must be an absolute origin URL.');
    }
  }

  if (process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS === 'true') {
    const provider = String(process.env.MALWARE_SCANNER_PROVIDER ?? '').trim().toLowerCase();
    const hasHttp = hasRuntimeValue('MALWARE_SCANNER_ENDPOINT') || hasRuntimeValue('MALWARE_SCANNER_URL');
    const hasClamAv = hasRuntimeValue('MALWARE_SCANNER_CLAMAV_HOST');
    if (!provider) failures.push('malware scanner: provider is required when upload scanning is required.');
    if (!hasHttp && !hasClamAv) failures.push('malware scanner: configure either an HTTP scanner target or a ClamAV host.');
  }
}

const envExample = read(envExamplePath);
const workflow = read(productionWorkflowPath);
if (!envExample) failures.push(`${envExamplePath} is missing.`);
if (!workflow) failures.push(`${productionWorkflowPath} is missing.`);

validateDocumentation(parseEnvExample(envExample), workflow);
validateRuntime();

console.log('Vercel production environment readiness');
console.log('---------------------------------------');

if (failures.length > 0) {
  console.error('Readiness failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Vercel production environment readiness: ok');
}
