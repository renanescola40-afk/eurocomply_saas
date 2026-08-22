import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const exercise = fs.readFileSync('scripts/recovery/run-backup-restore-exercise.mjs', 'utf8');

describe('database-only recovery storage boundary', () => {
  it('excludes the Supabase-managed Storage schema from the data restore while keeping application/auth recovery evidence explicit', () => {
    expect(exercise).toContain("'storage.buckets_vectors'");
    expect(exercise).toContain("'storage.vector_indexes'");
    expect(exercise).toContain("'storage.*'");
    expect(exercise).toContain("'--exclude', SUPABASE_MANAGED_DATA_EXCLUDES[2]");
    expect(exercise).toContain('Supabase-managed Storage rows are excluded from this database-only recovery target');
    expect(exercise).toContain('Storage schema, bucket and tenant-boundary behavior remains a separate selected-migration/runtime acceptance control');
  });
});
