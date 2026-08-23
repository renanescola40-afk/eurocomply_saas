import { readFileSync, existsSync } from 'node:fs';

const failures = [];
const envExamplePath = '.env.example';
const productionWorkflowPath = '.github/workflows/vercel-production.yml';
const HTTP_SCANNER_PROVIDERS = new Set(['http', 'generic-http', 'webhook']);
const CLAMAV_SCANNER_PROVIDERS = new Set(['clamav', 'clamd']);

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
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY',
    'ENABLE_DASHBOARD_METRIC_SNAPSHOTS',
    'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
    'MALWARE_SCANNER_PROVIDER',
    'MALWARE_SCANNER_ALLOWED_HOSTS',
    'MALWARE_SCANNER_CLAMAV_HOST',
    'MALWARE_SCANNER_CLAMAV_PORT',
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
    'REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY',
    'ENABLE_DASHBOARD_METRIC_SNAPSHOTS',
    'MALWARE_SCANNER_ALLOWED_HOSTS',
    'MALWARE_SCANNER_CLAMAV_HOST',
    'MALWARE_SCANNER_CLAMAV_PORT',
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

  if (process.env.REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY === 'true') {
    if (!hasRuntimeValue('RESEND_API_KEY')) failures.push('transactional email: RESEND_API_KEY is required when delivery is required.');
    if (!hasRuntimeValue('EMAIL_FROM')) failures.push('transactional email: EMAIL_FROM is required when delivery is required.');
  }

  if (process.env.ENABLE_DASHBOARD_METRIC_SNAPSHOTS !== 'false') {
    failures.push('dashboard metric snapshots: Production must remain false until the V19 snapshot schema is proven compatible.');
  }

  if (process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS === 'true') {
    const provider = String(process.env.MALWARE_SCANNER_PROVIDER ?? '').trim().toLowerCase();
    const hasHttp = hasRuntimeValue('MALWARE_SCANNER_ENDPOINT') || hasRuntimeValue('MALWARE_SCANNER_URL');
    const hasAllowedHosts = hasRuntimeValue('MALWARE_SCANNER_ALLOWED_HOSTS');
    const hasClamAvHost = hasRuntimeValue('MALWARE_SCANNER_CLAMAV_HOST');
    const rawClamAvPort = String(process.env.MALWARE_SCANNER_CLAMAV_PORT ?? '').trim();
    const clamAvPort = Number(rawClamAvPort);
    const hasValidClamAvPort = /^\d+$/.test(rawClamAvPort)
      && Number.isInteger(clamAvPort)
      && clamAvPort >= 1
      && clamAvPort <= 65_535;

    if (!provider) failures.push('malware scanner: provider is required when upload scanning is required.');
    else if (HTTP_SCANNER_PROVIDERS.has(provider)) {
      if (!hasHttp) failures.push('malware scanner: HTTP provider requires MALWARE_SCANNER_ENDPOINT or MALWARE_SCANNER_URL.');
      if (!hasAllowedHosts) failures.push('malware scanner: HTTP provider requires MALWARE_SCANNER_ALLOWED_HOSTS.');
    } else if (CLAMAV_SCANNER_PROVIDERS.has(provider)) {
      if (!hasClamAvHost) failures.push('malware scanner: ClamAV provider requires MALWARE_SCANNER_CLAMAV_HOST.');
      if (!hasValidClamAvPort) failures.push('malware scanner: ClamAV provider requires a valid MALWARE_SCANNER_CLAMAV_PORT.');
    } else {
      failures.push('malware scanner: configure a supported real provider (http, generic-http, webhook, clamav, or clamd).');
    }
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
