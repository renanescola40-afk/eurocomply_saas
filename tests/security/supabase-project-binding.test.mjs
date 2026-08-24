import assert from 'node:assert/strict';
import test from 'node:test';
import {
  digestFromApiUrl,
  digestFromPoolerUrl,
  projectRefFromApiUrl,
  projectRefFromPoolerUrl,
} from '../../scripts/security/supabase-project-binding.mjs';

const ref = 'tganhbbhfxcpblmgqprg';

test('derives one redacted identity from API and pooler endpoints', () => {
  const api = `https://${ref}.supabase.co`;
  const pooler = `postgresql://postgres.${ref}:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
  assert.equal(projectRefFromApiUrl(api), ref);
  assert.equal(projectRefFromPoolerUrl(pooler), ref);
  assert.equal(digestFromApiUrl(api), digestFromPoolerUrl(pooler));
  assert.match(digestFromApiUrl(api), /^sha256:[a-f0-9]{64}$/);
  assert.equal(digestFromApiUrl(api).includes(ref), false);
});

test('rejects a different project binding', () => {
  const apiDigest = digestFromApiUrl(`https://${ref}.supabase.co`);
  const poolerDigest = digestFromPoolerUrl('postgresql://postgres.aaaaaaaaaaaaaaaaaaaa:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres');
  assert.notEqual(apiDigest, poolerDigest);
});

test('rejects non-Supabase endpoint shapes', () => {
  assert.throws(() => projectRefFromApiUrl('https://example.com'), /not canonical/);
  assert.throws(() => projectRefFromPoolerUrl('postgresql://postgres:secret@example.com/postgres'), /not canonical/);
});
