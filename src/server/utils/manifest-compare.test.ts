import { describe, expect, it } from 'vitest';
import { compareManifestSnapshots } from './manifest-compare';
import type { ManifestSnapshot } from './manifest-types';

function snapshot(id: string, entries: Array<[string, string]>): ManifestSnapshot {
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    entries: entries.map(([path, sha256]) => ({ path, sha256, sizeBytes: sha256.length })),
  };
}

describe('compareManifestSnapshots', () => {
  it('groups added, removed, changed and unchanged paths', () => {
    const before = snapshot('before', [
      ['a.md', '111'],
      ['b.md', '222'],
      ['c.md', '333'],
    ]);

    const after = snapshot('after', [
      ['a.md', '111'],
      ['b.md', '999'],
      ['d.md', '444'],
    ]);

    expect(compareManifestSnapshots(before, after)).toEqual({
      beforeId: 'before',
      afterId: 'after',
      added: ['d.md'],
      removed: ['c.md'],
      changed: ['b.md'],
      unchanged: ['a.md'],
    });
  });
});
