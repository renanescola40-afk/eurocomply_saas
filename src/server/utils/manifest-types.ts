export type ManifestEntry = {
  path: string;
  bytes: number;
  digest: string;
};

export type ManifestSnapshot = {
  generatedAt: string;
  totalEntries: number;
  entries: ManifestEntry[];
};

export type SnapshotComparison = {
  added: string[];
  removed: string[];
  changed: string[];
  unchanged: string[];
};
