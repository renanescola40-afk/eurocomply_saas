import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { evidenceSha256Hex, uploadImmutableEvidenceObject, verifyExistingEvidenceObject } from '../../src/lib/evidence/upload-recovery.ts';

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

test('successful upload never downloads or replaces private evidence', async () => {
  let reads = 0;
  await uploadImmutableEvidenceObject({ ...expected,
    upload: async () => ({ error: null }),
    download: async () => { reads++; return { data: original, error: null }; },
  });
  assert.equal(reads, 0);
});

test('duplicate provider response with matching private bytes is recovered', async () => {
  await uploadImmutableEvidenceObject({ ...expected,
    upload: async () => ({ error: new Error('409 duplicate') }),
    download: read(original),
  });
});

test('lost success response through a thrown network error is recovered', async () => {
  await uploadImmutableEvidenceObject({ ...expected,
    upload: async () => { throw new Error('response lost'); },
    download: read(original),
  });
});

test('upload error plus mismatched bytes preserves the original provider error', async () => {
  const providerError = new Error('409 duplicate object');
  const other = new Blob(['x'.repeat(original.size)]);
  await assert.rejects(uploadImmutableEvidenceObject({ ...expected,
    upload: async () => ({ error: providerError }), download: read(other),
  }), error => error === providerError);
});

test('transport failure plus inaccessible object preserves transport error', async () => {
  const providerError = new Error('transport failure');
  await assert.rejects(uploadImmutableEvidenceObject({ ...expected,
    upload: async () => { throw providerError; },
    download: async () => ({ data: null, error: new Error('RLS forbidden') }),
  }), error => error === providerError);
});

test('failed initial attempt permits safe retry of the same immutable bytes', async () => {
  const providerError = new Error('timeout');
  let attempts = 0;
  const object = { ...expected,
    upload: async () => { attempts += 1; return attempts === 1 ? { error: providerError } : { error: null }; },
    download: read(null),
  };
  await assert.rejects(uploadImmutableEvidenceObject(object), error => error === providerError);
  await uploadImmutableEvidenceObject(object);
  assert.equal(attempts, 2);
});

test('real upload wiring delegates to fail-closed recovery without overwrite', () => {
  const source = readFileSync('src/lib/evidence/storage.ts', 'utf8');
  assert.match(source, /uploadImmutableEvidenceObject\(\{/);
  assert.match(source, /\.download\(objectPath/);
  assert.match(source, /expectedSize: fileSizeBytes/);
  assert.match(source, /upsert: false/);
});
