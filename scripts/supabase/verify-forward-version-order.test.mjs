import assert from 'node:assert/strict';
import test from 'node:test';

import { verifyForwardVersionOrder } from './verify-forward-version-order.mjs';

const SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function manifest(versions) {
  return {
    schema: 'risck-comply.supabase-forward-reconciliation-manifest.v1',
    targetSha: SHA,
    migrations: versions.map((version) => ({ version })),
  };
}

test('passes when every selected migration is strictly after the remote head', () => {
  const proof = verifyForwardVersionOrder({
    manifest: manifest(['20260813175000', '20260814101500']),
    remoteVersions: ['20260812160405', '20260813124224'],
    expectedSha: SHA,
  });

  assert.equal(proof.status, 'PASS');
  assert.equal(proof.remoteHeadVersion, '20260813124224');
  assert.equal(proof.earliestSelectedVersion, '20260813175000');
  assert.equal(proof.checks.allSelectedVersionsAfterRemoteHead, true);
  assert.equal(proof.checks.includeAllRequired, false);
});

test('fails closed when a selected migration predates the remote head', () => {
  assert.throws(
    () => verifyForwardVersionOrder({
      manifest: manifest(['20260809135000', '20260814101500']),
      remoteVersions: ['20260813124224'],
      expectedSha: SHA,
    }),
    /selected migration 20260809135000 is not forward of remote head 20260813124224/,
  );
});

test('fails closed when a selected migration equals the remote head', () => {
  assert.throws(
    () => verifyForwardVersionOrder({
      manifest: manifest(['20260813124224']),
      remoteVersions: ['20260813124224'],
      expectedSha: SHA,
    }),
    /not forward of remote head/,
  );
});

test('does not require include-all when remote history is empty', () => {
  const proof = verifyForwardVersionOrder({
    manifest: manifest(['20260814101500']),
    remoteVersions: [],
    expectedSha: SHA,
  });

  assert.equal(proof.remoteHeadVersion, null);
  assert.equal(proof.checks.includeAllRequired, false);
});
