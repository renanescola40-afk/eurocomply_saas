import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLocalSupabaseTarget } from '../../scripts/security/assert-local-supabase-target.mjs';

const base = {
  RISCK_LOCAL_TEST_CONFIRMATION: 'LOCAL_SYNTHETIC_ONLY',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
};

test('permits explicitly confirmed loopback Supabase CLI endpoint only', () => {
  assert.deepEqual(assertLocalSupabaseTarget(base), {
    target: 'http://127.0.0.1:54321', scope: 'isolated-loopback-only',
  });
  assert.equal(assertLocalSupabaseTarget({
    ...base,
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  }).scope, 'isolated-loopback-only');
});

test('rejects requests without explicit synthetic-only confirmation', () => {
  assert.throws(() => assertLocalSupabaseTarget({
    ...base, RISCK_LOCAL_TEST_CONFIRMATION: '',
  }), /confirmation/);
});

test('blocks the RISCK COMPLY production Supabase project', () => {
  assert.throws(() => assertLocalSupabaseTarget({
    ...base, NEXT_PUBLIC_SUPABASE_URL: 'https://tganhbbhfxcpblmgqprg.supabase.co',
  }), /Refusing/);
});

test('blocks other remote Supabase projects and lookalike hostnames', () => {
  for (const target of [
    'https://staging-ref.supabase.co',
    'http://localhost.evil.example:54321',
    'http://127.0.0.2:54321',
  ]) {
    assert.throws(() => assertLocalSupabaseTarget({
      ...base, NEXT_PUBLIC_SUPABASE_URL: target,
    }), /Refusing/);
  }
});

test('fails closed when public and server API URLs disagree', () => {
  assert.throws(() => assertLocalSupabaseTarget({
    ...base, SUPABASE_URL: 'http://localhost:54321',
  }), /disagree/);
  assert.throws(() => assertLocalSupabaseTarget({
    ...base, SUPABASE_URL: 'https://tganhbbhfxcpblmgqprg.supabase.co',
  }), /Refusing/);
});

test('blocks malformed URLs, credentials and unexpected ports', () => {
  for (const target of [
    'not-a-url',
    'http://127.0.0.1:54322',
    'http://user:pass@127.0.0.1:54321',
    'http://127.0.0.1:54321/rest/v1',
  ]) {
    assert.throws(() => assertLocalSupabaseTarget({
      ...base, NEXT_PUBLIC_SUPABASE_URL: target,
    }));
  }
});

test('rejects missing endpoints and invalid custom ports', () => {
  assert.throws(() => assertLocalSupabaseTarget({
    RISCK_LOCAL_TEST_CONFIRMATION: 'LOCAL_SYNTHETIC_ONLY',
  }), /missing/);
  assert.throws(() => assertLocalSupabaseTarget({
    ...base, SUPABASE_LOCAL_API_PORT: '0',
  }), /Invalid/);
});
