import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const routePath = join(root, 'src', 'app', 'api', 'billing', 'webhook', 'route.ts');
const testPath = join(root, 'src', 'app', 'api', 'billing', 'webhook', 'route.test.ts');
const failures = [];

if (!existsSync(routePath)) {
  failures.push('Billing webhook route is missing.');
} else {
  const source = readFileSync(routePath, 'utf8');
  for (const token of ['MAX_BILLING_WEBHOOK_BYTES', 'getBillingWebhookContentLength', 'readBoundedBillingWebhookBody', 'payload_too_large']) {
    if (!source.includes(token)) failures.push(`Billing webhook route must include ${token}.`);
  }
  if (/await\s+request\.text\(\)/.test(source) && !source.includes('readBoundedBillingWebhookBody(request)')) {
    failures.push('Billing webhook route must read the raw body through the bounded helper.');
  }
}

if (!existsSync(testPath)) {
  failures.push('Billing webhook body-boundary tests are missing.');
} else {
  const testSource = readFileSync(testPath, 'utf8');
  for (const token of ['content-length', '1000001', 'readBoundedBillingWebhookBody']) {
    if (!testSource.includes(token)) failures.push(`Billing webhook tests must cover ${token}.`);
  }
}

if (failures.length > 0) {
  console.error('Billing webhook body-boundary check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Billing webhook body-boundary checks passed.');
