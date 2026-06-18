const requiredProductionEvidenceVars = [
  'NEXT_PUBLIC_APP_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];

const missing = requiredProductionEvidenceVars.filter((key) => !process.env[key]);

console.log('P1 production evidence environment readiness');
console.log('--------------------------------------------');

if (missing.length > 0) {
  console.error('Missing variables required before closing production-backed P1 controls:');
  for (const key of missing) console.error(`- ${key}`);
  console.error('\nThese values are required for production evidence collection. Do not mark P1-04 or production-backed evidence controls as Complete until this check passes in Production.');
  process.exit(1);
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!/^https:\/\//.test(appUrl)) {
  console.error('NEXT_PUBLIC_APP_URL must be an https:// production URL for P1 production evidence.');
  process.exit(1);
}

console.log('P1 production evidence environment: ok');
