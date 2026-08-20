import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../../scripts/ops/provision-stripe-live-account.mjs', import.meta.url), 'utf8');

test('Vercel env contract uses v10 for list/create and v9 for update', () => {
  assert.match(source, /const createBase = `https:\/\/api\.vercel\.com\/v10\/projects\/\$\{encodeURIComponent\(target\.projectId\)\}\/env`/);
  assert.match(source, /const updateBase = `https:\/\/api\.vercel\.com\/v9\/projects\/\$\{encodeURIComponent\(target\.projectId\)\}\/env`/);
  assert.match(source, /vercelJson\(fetchImpl, `\$\{createBase\}\?target=production&decrypt=false&\$\{teamQuery\}`/);
  assert.match(source, /vercelJson\(fetchImpl, `\$\{updateBase\}\/\$\{encodeURIComponent\(candidates\[0\]\.id\)\}\?\$\{teamQuery\}`,[\s\S]*?method: 'PATCH'/);
  assert.match(source, /vercelJson\(fetchImpl, `\$\{createBase\}\?\$\{teamQuery\}`,[\s\S]*?method: 'POST'/);
});

test('bootstrap confirmation guard references the declared constant', () => {
  assert.match(source, /const REQUIRED_CONFIRMATION = 'PROVISION_NEW_STRIPE_LIVE_ACCOUNT';/);
  assert.match(source, /confirmation !== REQUIRED_CONFIRMATION/);
  assert.doesNotMatch(source, /REQUIRED_CONFIRMIRMATION/);
});
