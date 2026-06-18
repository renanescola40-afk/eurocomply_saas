import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const routePath = join(root, 'src', 'app', 'api', 'stripe', 'webhook', 'route.ts');
const testPath = join(root, 'src', 'app', 'api', 'stripe', 'webhook', 'route.test.ts');
const failures = [];

if (!existsSync(routePath)) {
  failures.push('Stripe webhook route is missing.');
} else {
  const source = readFileSync(routePath, 'utf8');
  const requiredTokens = [
    'MAX_STRIPE_WEBHOOK_BYTES',
    'getStripeWebhookContentLength',
    'readBoundedStripeWebhookBody',
    'payload_too_large',
    'noStoreJson',
  ];

  for (const token of requiredTokens) {
    if (!source.includes(token)) {
      failures.push(`Stripe webhook route must include ${token}.`);
    }
  }

  if (/const\s+body\s*=\s*await\s+request\.text\(\)/.test(source)) {
    failures.push('Stripe webhook route must not read the raw body without the bounded helper.');
  }
}

if (!existsSync(testPath)) {
  failures.push('Stripe webhook body-boundary tests are missing.');
} else {
  const testSource = readFileSync(testPath, 'utf8');
  for (const token of ['content-length', '1000001', 'readBoundedStripeWebhookBody']) {
    if (!testSource.includes(token)) {
      failures.push(`Stripe webhook tests must cover ${token}.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Stripe webhook contract check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Stripe webhook contract checks passed.');
