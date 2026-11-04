import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { evidenceSha256Hex, verifyExistingEvidenceObject } from '../../src/lib/evidence/upload-recovery.ts';

const original = new Blob(['tenant-bound immutable evidence payload'], { type: 'text/plain' });
const EXPECTED_HASH = await evidenceSha256Hex(original);
const expected = { expectedSize: original.size, expectedSha256: EXPECTED_HASH };
const read = data => async () => ({ data, error: null });

test('reconciles duplicate response only when downloaded private object bytes match evidence', async () => {
  assert.equal(await verifyExistingEvidenceObject({ ...expected, download: read(original) }), true);
});

test('rejects different tenant object contents even with same length', async () => {
  const other = new Blob(['x'.repeat(original.size)], { type: 'text/plain' });
  assert.equal(other.size, original.size);
  assert.equal(await verifyExistingEvidenceObject({ ...expected, download: read(other) }), false);
});

test('rejects truncated existing object', async () => {
  assert.equal(await verifyExistingEvidenceObject({ ...expected, download: read(new Blob(['too short'])) }), false);
});

test('fails closed when Storage SELECT is denied', async () => {
  const download = async () => ({ data: null, error: new Error('RLS denied') });
  assert.equal(await verifyExistingEvidenceObject({ ...expected, download }), false);
});

test('fails closed when provider readback throws', async () => {
  assert.equal(await verifyExistingEvidenceObject({
    ...expected, download: async () => { throw new Error('transport failure'); },
  }), false);
});

test('fails closed for missing object and impossible expected digest', async () => {
  assert.equal(await verifyExistingEvidenceObject({ ...expected, download: read(null) }), false);
  assert.equal(await verifyExistingEvidenceObject({
    ...expected, expectedSha256: 'invalid', download: read(original),
  }), false);
});

test('real upload wiring reads the private object after a failure and never overwrites', () => {
  const source = readFileSync('src/lib/evidence/storage.ts', 'utf8');
  assert.match(source, /if \(uploadError\) \{/);
  assert.match(source, /verifyExistingEvidenceObject\(\{/);
  assert.match(source, /\.download\(objectPath/);
  assert.match(source, /if \(!recovered\) throw uploadError/);
  assert.match(source, /upsert: false/);
});
