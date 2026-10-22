import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { evaluateG1Scope } from '../../scripts/release/verify-g1-enterprise-scope.mjs';

const registry = JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
const copy = () => structuredClone(registry);
const item = (r,id) => r.mandatory.find(x => x.id === id);

test('live G1 evidence register is self-consistent, exactly 38 mandatory criteria', () => {
  const result = evaluateG1Scope(copy());
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
  assert.equal(result.denominator, 38);
  assert.ok(result.passIds.includes('OPS-01'));
  assert.equal(result.percent, Number((result.passed / 38 * 100).toFixed(2)));
  assert.equal(result.enterprise100, false, 'source-only evidence must never authorize Enterprise 100');
});

test('missing evidence file invalidates a superficially accepted criterion', () => {
  const r = copy();
  item(r,'OPS-01').evidenceRefs=['docs/enterprise/evidence/this-file-does-not-exist.json'];
  const result=evaluateG1Scope(r);
  assert.equal(result.valid,false);
  assert.ok(result.errors.some(x => x.startsWith('PASS evidence file missing: OPS-01')));
});

test('unknown criterion dependencies fail closed', () => {
  const r=copy();item(r,'OPS-01').dependencies=['NONEXISTENT-99'];
  const result=evaluateG1Scope(r);
  assert.equal(result.valid,false);
  assert.ok(result.errors.some(x=>x.includes('unknown dependency: OPS-01')));
});

test('PASS with unaccepted prerequisite fails closed', () => {
  const r=copy();
  const target=item(r,'OPS-03');
  target.status='PASS';
  target.acceptedAt=item(r,'OPS-01').acceptedAt;
  target.acceptedBy='Test reviewer';
  target.evidenceRefs=[...item(r,'OPS-01').evidenceRefs];
  const result=evaluateG1Scope(r);
  assert.equal(result.valid,false);
  assert.ok(result.errors.some(x=>x.includes('PASS dependency not accepted: OPS-03 -> QAT-02')));
});

test('PASS without reviewer or timestamp is not accepted', () => {
  const r=copy();item(r,'OPS-01').acceptedBy=null;item(r,'OPS-01').acceptedAt=null;
  const result=evaluateG1Scope(r);
  assert.equal(result.valid,false);
  assert.ok(result.errors.some(x=>x.includes('PASS missing approver: OPS-01')));
  assert.ok(result.errors.some(x=>x.includes('PASS invalid acceptance time: OPS-01')));
});

test('unaccepted criterion cannot quietly have acceptance attribution', () => {
  const r=copy();item(r,'SEC-01').acceptedBy='Fake reviewer';
  const result=evaluateG1Scope(r);
  assert.equal(result.valid,false);
  assert.ok(result.errors.some(x=>x.includes('non-PASS entry contains acceptedBy/acceptedAt: SEC-01')));
});

test('changed denominator cannot inflate reported closure', () => {
  const r=copy();r.scoring.denominator=1;
  const result=evaluateG1Scope(r);
  assert.equal(result.denominator,38);
  assert.equal(result.valid,false);
  assert.ok(result.errors.includes('denominator must be exactly 38'));
});

test('duplicate or removed criteria fail closed', () => {
  const r=copy();r.mandatory[0]=structuredClone(r.mandatory[1]);
  const result=evaluateG1Scope(r);
  assert.equal(result.valid,false);
  assert.ok(result.errors.includes('duplicate A criterion IDs'));
});

test('invalid baseline SHA fails closed', () => {
  const r=copy();r.sourceBaselineSha='main';
  const result=evaluateG1Scope(r);
  assert.equal(result.valid,false);
  assert.ok(result.errors.includes('invalid baseline SHA'));
});
