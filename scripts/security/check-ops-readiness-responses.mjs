import { existsSync, readFileSync } from 'node:fs';

const OPS_ROUTES = [
  'src/app/api/ops/smoke/route.ts',
  'src/app/api/ops/enterprise-readiness/route.ts',
];

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

console.log('EuroComply ops readiness response security check');
console.log('------------------------------------------------');

for (const path of OPS_ROUTES) {
  const source = read(path);

  requireToken(source, 'noStoreJson', `${path} must use no-store JSON responses.`);
  requireToken(source, 'reportError', `${path} must report detailed provider/database errors server-side only.`);

  forbidToken(source, 'NextResponse.json', `${path} must not bypass noStoreJson.`);
  forbidToken(source, 'error.message', `${path} must not reflect raw exception messages.`);
  forbidToken(source, 'error?.message', `${path} must not reflect raw provider/storage messages.`);
  forbidToken(source, 'missingRequiredEnv', `${path} must not expose individual missing environment variable names.`);
  forbidToken(source, 'missingRecommendedEnv', `${path} must not expose individual missing recommended environment variable names.`);
  forbidToken(source, 'Configure required environment variable', `${path} must use grouped remediation hints instead of individual environment variable names.`);
  forbidToken(source, 'name, configured: Boolean(process.env[name])', `${path} must group readiness configuration instead of emitting individual environment keys.`);
}

const smoke = read('src/app/api/ops/smoke/route.ts');
requireToken(smoke, 'environment', 'ops smoke response must expose grouped environment status.');
requireToken(smoke, 'missingCount', 'ops smoke environment groups must include counts instead of key names.');

const enterpriseReadiness = read('src/app/api/ops/enterprise-readiness/route.ts');
requireToken(enterpriseReadiness, 'requiredEnvironment', 'enterprise readiness must expose grouped required environment status.');
requireToken(enterpriseReadiness, 'recommendedEnvironment', 'enterprise readiness must expose grouped recommended environment status.');
requireToken(enterpriseReadiness, 'missingRequiredGroups', 'enterprise readiness must expose grouped required gaps.');
requireToken(enterpriseReadiness, 'missingRecommendedGroups', 'enterprise readiness must expose grouped recommended gaps.');

if (failures.length > 0) {
  console.error('Ops readiness response security failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Ops readiness response security: ok');
}
