import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildGatePacket } from '../../scripts/agents/enterprise-gate-packet.mjs';

const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const scope = read('config/g1-enterprise-scope-v1.json');
const groups = read('config/g1-product-ready-24-gates.json');
const sha = 'a'.repeat(40);

test('A-18 returns advisory source only', () => {
  const p = buildGatePacket(scope, groups, {gateId:'A-18', headSha:sha});
  assert.ok(p.controls.some(c => c.id === 'OPS-01'));
  assert.equal(p.authority, 'ADVISORY_SOURCE_ONLY_NOT_GATE_ACCEPTANCE');
  assert.equal(p.checkout_head_sha, sha);
});
test('A-10 includes signed webhook and Checkout dependencies', () => {
  const p = buildGatePacket(scope, groups, {gateId:'A-10', headSha:sha});
  assert.deepEqual(p.controls.map(c => c.id), ['BIL-02', 'BIL-03']);
});
test('rejects unknown gates, non-SHA refs, and altered scope', () => {
  assert.throws(() => buildGatePacket(scope, groups, {gateId:'A-25',headSha:sha}), /gate_id_required/);
  assert.throws(() => buildGatePacket(scope, groups, {gateId:'A-18',headSha:'main'}), /exact_head_sha_required/);
  assert.throws(() => buildGatePacket({...scope,mandatory:scope.mandatory.slice(1)}, groups, {gateId:'A-18',headSha:sha}), /canonical_24_38_scope_required/);
});
test('all 24 canonical gates map to known atomic controls and never claim accepted', () => {
  for (const group of groups.groups) {
    const p = buildGatePacket(scope, groups, {gateId:group.id,headSha:sha});
    assert.ok(p.controls.length);
    assert.equal(p.scope_gate_total,24);
    assert.equal(p.scope_atomic_total,38);
    assert.match(p.source_freshness,/UNVERIFIED/);
  }
});
