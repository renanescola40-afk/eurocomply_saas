import type { ManifestSnapshot, SnapshotComparison } from './manifest-types';

export function compareManifestSnapshots(
  before: ManifestSnapshot,
  after: ManifestSnapshot,
): SnapshotComparison {
  const beforeEntries = new Map(before.entries.map((entry) => [entry.path, entry]));
  const afterEntries = new Map(after.entries.map((entry) => [entry.path, entry]));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  const unchanged: string[] = [];

  for (const [path, entry] of afterEntries) {
    const previous = beforeEntries.get(path);
    if (!previous) {
      added.push(path);
      continue;
    }

    if (previous.sha256 === entry.sha256) {
      unchanged.push(path);
    } else {
      changed.push(path);
    }
  }

  for (const path of beforeEntries.keys()) {
    if (!afterEntries.has(path)) {
      removed.push(path);
    }
  }

  return {
    beforeId: before.id,
    afterId: after.id,
    added: added.sort(),
    removed: removed.sort(),
    changed: changed.sort(),
    unchanged: unchanged.sort(),
  };
}
