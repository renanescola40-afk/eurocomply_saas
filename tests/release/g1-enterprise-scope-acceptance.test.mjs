import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
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

const evidenceFiles = [
  'docs/enterprise/evidence/G1_OPS01_EXACT_PRODUCTION_DEPLOYMENT_IDENTITY_2026-10-22.json',
  'docs/enterprise/evidence/G1_BIL01_LIVE_PRICES_AND_PRODUCTION_ENV_2026-10-22.json',
];
function tamperEvidence(relativePath, change) {
  const root = mkdtempSync(join(tmpdir(), 'g1-evidence-negative-'));
  try {
    for (const ref of evidenceFiles) {
      const file = join(root, ref);
      mkdirSync(dirname(file), { recursive: true });
      copyFileSync(ref, file);
    }
    const path = join(root, relativePath);
    const obj = JSON.parse(readFileSync(path, 'utf8'));
    change(obj);
    writeFileSync(path, JSON.stringify(obj));
    return evaluateG1Scope(copy(), root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('OPS-01 cannot reuse evidence from an unrelated criterion', () => {
  const result = tamperEvidence(evidenceFiles[0], proof => { proof.subject = 'BIL-01'; });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(x => x.includes('OPS-01 (subject mismatch)')));
});

test('OPS-01 cannot pass on an unverified domain or foreign deployment SHA', () => {
  const result = tamperEvidence(evidenceFiles[0], proof => {
    proof.vercel.gitSha = 'f'.repeat(40);
    proof.vercel.domainVerified = false;
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(x => x.includes('OPS-01 (production source SHA mismatch)')));
  assert.ok(result.errors.some(x => x.includes('OPS-01 (verified custom domain missing)')));
});

test('BIL-01 cannot pass with wrong Stripe price or incomplete provider attestation', () => {
  const result = tamperEvidence(evidenceFiles[1], proof => {
    proof.rows[0].amountCents = 490000;
    proof.checks.allSixCanonicalProductionBindingsMatch = false;
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(x => x.includes('BIL-01 (price/catalog mismatch)')));
  assert.ok(result.errors.some(x => x.includes('BIL-01 (billing provider attestations incomplete)')));
});

test('BIL-01 cannot pass with duplicate or missing price rows', () => {
  const result = tamperEvidence(evidenceFiles[1], proof => {
    proof.rows[0] = structuredClone(proof.rows[1]);
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(x => x.includes('BIL-01 (duplicate billing row)')));
  assert.ok(result.errors.some(x => x.includes('BIL-01 (incomplete six-price coverage)')));
});

test('a prior provider observation cannot be silently re-attributed at a new date', () => {
  const result = tamperEvidence(evidenceFiles[0], proof => {
    proof.observedAt = '2026-10-21T10:00:00.000Z';
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(x => x.includes('PASS evidence acceptance timestamp mismatch: OPS-01')));
});

test('SEC-05 partial transport evidence cannot obtain a formal PASS', () => {
  const r = copy();
  const preacceptancePath = 'docs/enterprise/evidence/SEC05_PROVIDER_TRANSPORT_PREACCEPTANCE_2026-11-04.json';
  const proof = JSON.parse(readFileSync(preacceptancePath, 'utf8'));
  const sec = item(r, 'SEC-05');
  sec.status = 'PASS';
  sec.acceptedBy = 'Synthetic negative-test reviewer';
  sec.acceptedAt = proof.observedAt;
  sec.evidenceRefs = [preacceptancePath];
  const result = evaluateG1Scope(r);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(x => x.includes('SEC-05 (wrong criterion or proof schema)')));
  assert.ok(result.errors.some(x => x.includes('SEC-05 (actual browser bundle was not proven free of secrets)')));
  assert.ok(result.errors.some(x => x.includes('SEC-05 (missing PostgreSQL TLS enforcement or at-rest provider proof: production)')));
  assert.ok(result.errors.some(x => x.includes('SEC-05 (independent exact-SHA review missing)')));
});
