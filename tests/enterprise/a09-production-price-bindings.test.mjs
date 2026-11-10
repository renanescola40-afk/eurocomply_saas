import assert from 'node:assert/strict';
import test from 'node:test';
import {
  A09_KEYS, expectedA09Prices, isExplicitProductionVariable,
  verifyA09ProductionBindings,
} from '../../scripts/enterprise-gates/verify-a09-production-price-bindings.mjs';

const projectId = 'prj_APpXAyQFy1Gie50xfbO45zjkyUSm';
const teamId = 'team_wu3LZI6ReFxO16xipv73GLwG';
const expected = A09_KEYS.map((key, i) => ({
  environmentVariable: key,
  environmentVariableTargets: ['production'],
  stripePriceId: `price_ABCDEF${i}GHIJK`,
  livemode: true,
  priceActive: true,
  productActive: true,
}));
const evidence = Object.freeze({
  schema: 'risck-comply.g1-billing-catalog-live-prices.v1',
  stripeMode: 'LIVE',
  productionProjectId: projectId,
  rows: expected,
});
const listRows = A09_KEYS.map((key, i) => ({
  id: `env_production_${i}`, key, target: ['production'], value: 'Encrypted',
}));
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'content-type': 'application/json' },
});
function provider(rows = listRows, pagination = null) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, init) => {
      const u = new URL(url);
      calls.push({ method: init.method, pathname: u.pathname,
        team: u.searchParams.get('teamId'), decrypt: u.searchParams.get('decrypt') });
      if (u.pathname.endsWith('/env')) return json({ envs: rows, ...(pagination ? { pagination } : {}) });
      const id = u.pathname.split('/').at(-1);
      const row = rows.find(r => r.id === id);
      return row
        ? json({ id: row.id, key: row.key, value: expected[A09_KEYS.indexOf(row.key)]?.stripePriceId })
        : json({}, 404);
    },
  };
}
const run = async (p = provider(), overrides = {}) => verifyA09ProductionBindings({
  evidence, token: 'synthetic-read-token', fetchImpl: p.fetchImpl, ...overrides,
});

test('source expects exactly six distinct LIVE canonical IDs, not arbitrary QA values', () => {
  assert.equal(expectedA09Prices(evidence).size, 6);
  assert.throws(() => expectedA09Prices({ ...evidence, rows: expected.slice(1) }), /a09_evidence_contract_invalid/);
  assert.throws(() => expectedA09Prices({ ...evidence, stripeMode: 'TEST' }), /a09_evidence_contract_invalid/);
});

test('only explicit built-in production target is eligible; QA and unknown are excluded', () => {
  const base = { id: 'env_a12345678', target: ['production'] };
  assert.equal(isExplicitProductionVariable(base), true);
  for (const row of [
    { ...base, target: [] }, { ...base, target: ['preview'] },
    { ...base, target: undefined },
    { ...base, target: ['production'], customEnvironmentIds: ['env_QA'] },
    { ...base, gitBranch: 'main' },
  ]) assert.equal(isExplicitProductionVariable(row), false);
});

test('six Production bindings match and no values or credentials appear in result', async () => {
  const p = provider();
  const result = await run(p);
  assert.equal(result.status, 'VERIFIED');
  assert.equal(result.formalGateAccepted, false);
  assert.equal(result.states.length, 6);
  assert.equal(p.calls.length, 7);
  assert.ok(p.calls.every(c => c.method === 'GET' && c.team === teamId));
  assert.equal(p.calls[0].decrypt, 'false');
  assert.equal(JSON.stringify(result).includes('price_ABCDEF'), false);
  assert.equal(JSON.stringify(result).includes('synthetic-read-token'), false);
});

test('missing token and wrong provider authority block before network requests', async () => {
  const p = provider();
  assert.equal((await run(p, { token: '' })).code, 'vercel_read_token_missing');
  assert.equal((await run(p, { teamId: 'team_wrong' })).code, 'target_authority_mismatch');
  assert.equal(p.calls.length, 0);
});

test('refuses QA-only variables even when all names and historical IDs match', async () => {
  const rows = listRows.map(r => ({ ...r, target: [], customEnvironmentIds: ['env_QA'] }));
  const result = await run(provider(rows));
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.states.every(s => s.reason === 'production_binding_missing_or_ambiguous'));
});

test('duplicate Production key blocks rather than choosing first', async () => {
  const result = await run(provider([...listRows, { ...listRows[0], id: 'env_duplicate_0' }]));
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.states[0].reason, 'production_binding_missing_or_ambiguous');
});

test('pagination cursor, truncation and malformed provider responses fail closed', async () => {
  assert.equal((await run(provider(listRows, { count: 100, next: 1794000000000 }))).code,
    'vercel_environment_listing_incomplete');
  assert.equal((await run({ fetchImpl: async () => json({ envs: listRows, truncated: true }) })).code,
    'vercel_environment_listing_incomplete');
  assert.equal((await run({ fetchImpl: async () => json({ wrong: 'shape' }) })).code,
    'vercel_environment_listing_invalid');
  assert.equal((await run({ fetchImpl: async () => json({ error: 'forbidden' }, 403) })).code,
    'vercel_environment_listing_unavailable');
});

test('wrong decrypted value or provider identity cannot grant verification', async () => {
  const p = provider();
  const wrongValue = async (url, init) => {
    const response = await p.fetchImpl(url, init);
    if (new URL(url).pathname.endsWith('/env')) return response;
    return json({ ...(await response.json()), value: 'price_DIFFERENT' });
  };
  assert.equal((await run({ fetchImpl: wrongValue })).status, 'BLOCKED');
  const wrongId = async (url, init) => {
    const response = await p.fetchImpl(url, init);
    if (new URL(url).pathname.endsWith('/env')) return response;
    return json({ ...(await response.json()), id: 'env_lying_record' });
  };
  assert.equal((await run({ fetchImpl: wrongId })).status, 'BLOCKED');
});

test('missing decrypted value is never verified', async () => {
  const p = provider();
  const unavailable = async (url, init) => new URL(url).pathname.endsWith('/env')
    ? p.fetchImpl(url, init) : json({ error: 'denied' }, 403);
  const result = await run({ fetchImpl: unavailable });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.states.every(s => s.reason === 'provider_binding_value_unavailable'));
});


test('two-page Vercel metadata list verifies all six bindings only after cursor completion', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const u = new URL(url);
    calls.push({ path: u.pathname, until: u.searchParams.get('until'), method: init.method });
    if (u.pathname.endsWith('/env')) {
      if (u.searchParams.has('until')) {
        assert.equal(u.searchParams.get('until'), '1700000000000');
        return json({ envs: listRows.slice(4), pagination: { count: 2, next: null } });
      }
      return json({ envs: listRows.slice(0, 4), pagination: { count: 4, next: 1700000000000 } });
    }
    const row = listRows.find(r => r.id === u.pathname.split('/').at(-1));
    return row ? json({ id: row.id, key: row.key, value: expected[A09_KEYS.indexOf(row.key)].stripePriceId }) : json({}, 404);
  };
  const result = await run({ fetchImpl });
  assert.equal(result.status, 'VERIFIED');
  assert.equal(result.states.length, 6);
  assert.equal(calls.filter(c => c.path.endsWith('/env')).length, 2);
  assert.equal(calls.length, 8);
  assert.ok(calls.every(c => c.method === 'GET'));
  assert.ok(!JSON.stringify(result).includes('price_ABCDEF'));
});

test('repeated provider page, stagnant cursor, malformed cursor block A-09', async () => {
  assert.equal((await run({
    fetchImpl: async () => json({ envs: listRows, pagination: { next: 1700000000000 } }),
  })).code, 'vercel_environment_listing_incomplete');
  assert.equal((await run({
    fetchImpl: async (url) => json({
      envs: new URL(url).searchParams.has('until') ? listRows.slice(3) : listRows.slice(0, 3),
      pagination: { next: 1700000000000 },
    }),
  })).code, 'vercel_environment_listing_incomplete');
  for (const next of ['cursor-string', -1, 1.5, Number.MAX_SAFE_INTEGER + 2]) {
    assert.equal((await run({
      fetchImpl: async () => json({ envs: listRows, pagination: { next } }),
    })).code, 'vercel_environment_listing_incomplete');
  }
});

test('any truncated subsequent page or duplicate provider ID blocks A-09', async () => {
  for (const second of [
    { envs: listRows.slice(3), truncated: true },
    { envs: listRows.slice(3), truncation: { arrays: 1 } },
    { envs: listRows.slice(2) },
  ]) {
    const result = await run({
      fetchImpl: async (url) => json(
        new URL(url).searchParams.has('until')
          ? second
          : { envs: listRows.slice(0, 3), pagination: { next: 1700000000000 } },
      ),
    });
    assert.equal(result.code, 'vercel_environment_listing_incomplete');
  }
});

test('pagination is bounded to eight pages and never follows unlimited cursors', async () => {
  let count = 0;
  const result = await run({
    fetchImpl: async () => json({
      envs: [{ id: 'env_case_' + (++count), key: 'IRRELEVANT', target: ['preview'] }],
      pagination: { next: 1700000000000 - count * 1000 },
    }),
  });
  assert.equal(count, 8);
  assert.equal(result.code, 'vercel_environment_listing_incomplete');
});
