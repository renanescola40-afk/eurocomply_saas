import assert from 'node:assert/strict';
import test from 'node:test';

import { compareWithLiveCatalog, extractObjects } from './build-migration-object-evidence.mjs';

test('extracts tables, functions, policies and indexes deterministically', () => {
  const objects = extractObjects(`
    create table public.accounts(id uuid);
    create index accounts_id_idx on public.accounts(id);
    create or replace function public.touch_accounts() returns trigger language plpgsql as $$ begin return new; end $$;
    create policy "tenant read" on public.accounts for select using (true);
  `);
  assert.deepEqual(objects, [
    { kind: 'FUNCTION', name: 'public.touch_accounts' },
    { kind: 'INDEX', name: 'accounts_id_idx' },
    { kind: 'POLICY', name: 'public.accounts' },
    { kind: 'TABLE', name: 'public.accounts' },
  ]);
});

test('object presence remains non-crediting supporting evidence', () => {
  const [result] = compareWithLiveCatalog([
    { filename: 'x.sql', sha256: 'a'.repeat(64), version: '20260731000000', objects: [{ kind: 'TABLE', name: 'public.accounts' }] },
  ], { objects: [{ kind: 'TABLE', name: 'public.accounts' }] });
  assert.equal(result.allExtractedObjectsPresent, true);
  assert.equal(result.automaticClassification, null);
  assert.equal(result.reviewRequired, true);
});

test('missing live objects stay visible', () => {
  const [result] = compareWithLiveCatalog([
    { filename: 'x.sql', sha256: 'a'.repeat(64), version: '20260731000000', objects: [{ kind: 'FUNCTION', name: 'public.missing' }] },
  ], { objects: [] });
  assert.equal(result.objects[0].presentInLiveCatalog, false);
  assert.equal(result.allExtractedObjectsPresent, false);
});
