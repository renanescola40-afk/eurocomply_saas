import assert from 'node:assert/strict';
import test from 'node:test';

import { parseLiveCatalogTsv } from './normalize-live-schema-catalog.mjs';

const SHA = '323d43470091bbb7dcd1908bf629e33e5f6bfb52';
const CAPTURED_AT = '2026-08-05T21:00:00.000Z';

test('normalizes catalog rows deterministically and ignores psql transaction tags', () => {
  const result = parseLiveCatalogTsv([
    'BEGIN',
    'TABLE\t"public"."Organizations"',
    'FUNCTION\t"public"."Current_User_Org"',
    'POLICY\t"public"."organizations"',
    'COMMIT',
    '',
  ].join('\n'), { releaseSha: SHA, capturedAt: CAPTURED_AT });

  assert.deepEqual(result, {
    schema: 'risck-comply.supabase-live-schema-catalog.v1',
    releaseSha: SHA,
    capturedAt: CAPTURED_AT,
    transactionMode: 'READ ONLY',
    objects: [
      { kind: 'FUNCTION', name: 'public.current_user_org' },
      { kind: 'POLICY', name: 'public.organizations' },
      { kind: 'TABLE', name: 'public.organizations' },
    ],
  });
});

test('rejects unexpected non-TSV output instead of producing partial evidence', () => {
  assert.throws(
    () => parseLiveCatalogTsv('TABLE\tpublic.organizations\nNOTICE unexpected', { releaseSha: SHA }),
    /live_catalog_row_invalid:2/,
  );
});

test('rejects unknown object kinds', () => {
  assert.throws(
    () => parseLiveCatalogTsv('SEQUENCE\tpublic.example', { releaseSha: SHA }),
    /live_catalog_kind_invalid:1/,
  );
});

test('rejects empty catalogs and invalid release SHAs', () => {
  assert.throws(() => parseLiveCatalogTsv('BEGIN\nCOMMIT\n', { releaseSha: SHA }), /live_catalog_empty/);
  assert.throws(() => parseLiveCatalogTsv('TABLE\tpublic.example', { releaseSha: 'abc' }), /release_sha_invalid/);
});
