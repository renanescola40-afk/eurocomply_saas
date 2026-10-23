import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { evaluateProductReady } from '../../scripts/release/score-g1-product-ready.mjs';

const registry = JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
const projection = JSON.parse(readFileSync('config/g1-product-ready-24-gates.json','utf8'));
const cases = () => [structuredClone(registry), structuredClone(projection)];
const check = (r,p) => evaluateProductReady(r,p);

test('owner-defined 24 A gates are backed by all 38 existing mandatory atomic checks', () => {
 const [r,p] = cases(); const v = check(r,p);
 assert.deepEqual(v.errors,[]);
 assert.equal(v.valid,true);
 assert.equal(v.A_TOTAL,24);
 assert.equal(v.atomicRequired,38);
 assert.equal(v.A_PASS,2);
 assert.equal(v.ENTERPRISE_PRODUCT_READY_PERCENT,8.33);
 assert.equal(v.OVERALL_SCOPE_TOTAL,38);
 assert.equal(v.OVERALL_SCOPE_CLOSED,2);
 assert.equal(v.OVERALL_SCOPE_COMPLETION_PERCENT,5.26);
 assert.equal(v.enterprise100,false);
 assert.equal(v.productionReleaseAuthorized,false);
 assert.deepEqual(v.groupStates.filter(g=>g.status==='PASS').map(g=>g.id), ['A-09','A-18']);
});

test('cannot game the score by dropping old mandatory atomic checks', () => {
 const [r,p] = cases(); p.groups[0].atomicCriteria.pop();
 const v=check(r,p);assert.equal(v.valid,false);
 assert.ok(v.errors.includes('mandatory atomic scope dropped or invented'));
 assert.equal(v.A_PASS,0);
});

test('cannot quietly duplicate an accepted atomic check for two A gates', () => {
 const [r,p] = cases();p.groups[0].atomicCriteria.push('BIL-01');
 const v=check(r,p);assert.equal(v.valid,false);
 assert.ok(v.errors.includes('atomic requirement assigned more than once'));
 assert.equal(v.A_PASS,0);
});

test('cannot report product ready at 24 A when category totals change', () => {
 const [r,p] = cases();p.scoringContract.A_MANDATORY=23;
 const v=check(r,p);assert.equal(v.valid,false);
 assert.ok(v.errors.includes('invalid scoring count: A_MANDATORY'));
});

test('customer-specific B remains nonblocking without signed applicability', () => {
 const [r,p] = cases();
 assert.equal(p.nonBlocking.B.includes('signed'),true);
 assert.equal(check(r,p).A_PASS,2);
});

test('any material unaccepted atomic requirement prevents its A group PASS', () => {
 const [r,p] = cases();r.mandatory.find(x=>x.id==='BIL-01').status='BLOCKED';
 r.mandatory.find(x=>x.id==='BIL-01').acceptedBy=null;
 r.mandatory.find(x=>x.id==='BIL-01').acceptedAt=null;
 const v=check(r,p);assert.equal(v.valid,true);
 assert.equal(v.A_PASS,1);assert.equal(v.A_BLOCKED>=1,true);
});

test('provider source identity or evidence corruption fails closed', () => {
 const [r,p] = cases();p.referenceRegistrySourceBaselineSha='bad-sha';
 const v=check(r,p);assert.equal(v.valid,false);assert.equal(v.A_PASS,0);
 assert.ok(v.errors.includes('source baseline SHA mismatch'));
});

test('all A gates must be present and individually classified A', () => {
 const [r,p] = cases();p.groups[12].category='C';
 const v=check(r,p);assert.equal(v.valid,false);
 assert.ok(v.errors.some(e=>e.includes('invalid A group definition')));
});

test('all source B/C/D categories remain preserved exactly', () => {
 const [r,p] = cases();r.categories.B.pop();
 const v=check(r,p);assert.equal(v.valid,false);
 assert.ok(v.errors.includes('source category B changed without reviewed reclassification'));
});
