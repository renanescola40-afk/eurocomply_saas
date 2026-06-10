const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const recommended = [
  'NEXT_PUBLIC_APP_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ESSENTIAL_MONTHLY',
  'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  'STRIPE_PRICE_BUSINESS_MONTHLY',
  'HEALTHCHECK_TOKEN',
  'SENTRY_AUTH_TOKEN',
];

const missingRequired = required.filter((key) => !process.env[key]);
const missingRecommended = recommended.filter((key) => !process.env[key]);

console.log('EuroComply production preflight');
console.log('--------------------------------');

if (missingRequired.length > 0) {
  console.error('Missing required environment variables:');
  for (const key of missingRequired) console.error(`- ${key}`);
  process.exitCode = 1;
} else {
  console.log('Required environment variables: ok');
}

if (missingRecommended.length > 0) {
  console.warn('Missing recommended production variables:');
  for (const key of missingRecommended) console.warn(`- ${key}`);
} else {
  console.log('Recommended production variables: ok');
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (appUrl && !/^https?:\/\//.test(appUrl)) {
  console.error('NEXT_PUBLIC_APP_URL must start with http:// or https://');
  process.exitCode = 1;
}

const stripePrices = [
  process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY,
  process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
  process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
].filter(Boolean);

for (const price of stripePrices) {
  if (!price.startsWith('price_')) {
    console.error(`Stripe price id looks invalid: ${price}`);
    process.exitCode = 1;
  }
}

if (process.exitCode === 1) {
  console.error('Preflight failed. Fix the issues above before production deploy.');
} else {
  console.log('Preflight completed. Review warnings before launch.');
}
