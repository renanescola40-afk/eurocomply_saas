import { describe, expect, it } from 'vitest';
import { compareManifestSnapshots } from './manifest-compare';
import type { ManifestSnapshot } from './manifest-types';

function snapshot(entries: Array<[string, string]>): ManifestSnapshot {
  return {
    generatedAt: '2026-01-01T00:00:00.000Z',
    totalEntries: entries.length,
    entries: entries.map(([path, digest]) => ({ path, digest, bytes: digest.length })),
  };
}

describe('compareManifestSnapshots', () => {
  it('groups added, removed, changed and unchanged paths', () => {
    const before = snapshot([
      ['a.md', '111'],
      ['b.md', '222'],
      ['c.md', '333'],
    ]);

    const after = snapshot([
      ['a.md', '111'],
      ['b.md', '999'],
      ['d.md', '444'],
    ]);

    expect(compareManifestSnapshots(before, after)).toEqual({
      added: ['d.md'],
      removed: ['c.md'],
      changed: ['b.md'],
      unchanged: ['a.md'],
    });
  });
});
