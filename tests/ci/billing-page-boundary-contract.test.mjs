import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const checker = resolve('scripts/security/check-billing-page-boundary.mjs');
const pagePath = 'src/app/[locale]/billing/checkout/[plan]/page.tsx';
const page = readFileSync(pagePath, 'utf8');
function check(source) {
  const cwd = mkdtempSync(join(tmpdir(), 'billing-boundary-'));
  try {
    mkdirSync(dirname(join(cwd, pagePath)), { recursive: true });
    writeFileSync(join(cwd, pagePath), source);
    return spawnSync(process.execPath, [checker], { cwd, encoding: 'utf8' });
  } finally { rmSync(cwd, { recursive: true, force: true }); }
}
test('public checkout redirect satisfies the security boundary', () => {
  assert.equal(check(page).status, 0);
});
test('persisted plan normalizer is rejected at public checkout', () => {
  const result = check(page.replaceAll('normalizePublicCheckoutPlanId', 'normalizeBillingPlanId'));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must not accept persisted free\/basic aliases/);
});
test('Stripe session creation in page rendering remains forbidden', () => {
  const result = check(page + '\ncheckout.sessions.create({});\n');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must not create Stripe sessions during GET rendering/);
});
