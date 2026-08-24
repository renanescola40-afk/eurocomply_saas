import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { selectExactShaRun } from '../../scripts/enterprise/fetch-supabase-rls-evidence.mjs';

const SHA = 'a'.repeat(40);
const WORKFLOW_PATH = '.github/workflows/supabase-live-rls-validation.yml';

describe('Supabase RLS exact-SHA runtime evidence fetch', () => {
  it('selects only a successful exact-main-SHA canonical run', () => {
    const selected = selectExactShaRun([
      { id: 1, path: WORKFLOW_PATH, head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'failure', updated_at: '2026-08-24T18:00:00Z' },
      { id: 2, path: WORKFLOW_PATH, head_sha: SHA, head_branch: 'feature', status: 'completed', conclusion: 'success', updated_at: '2026-08-24T18:10:00Z' },
      { id: 3, path: WORKFLOW_PATH, head_sha: SHA, head_branch: 'main', status: 'completed', conclusion: 'success', updated_at: '2026-08-24T18:20:00Z' },
    ], SHA);
    expect(selected?.id).toBe(3);
  });

  it('keeps the fetcher bound to the canonical workflow and exact-SHA artifact', () => {
    const source = readFileSync('scripts/enterprise/fetch-supabase-rls-evidence.mjs', 'utf8');
    expect(source).toContain("const WORKFLOW_FILE = 'supabase-live-rls-validation.yml'");
    expect(source).toContain('run?.path === WORKFLOW_PATH');
    expect(source).toContain('supabase-live-rls-runtime-proof-${targetSha}');
    expect(source).toContain('normalizeSupabaseRlsEvidenceForRelease');
  });

  it('does not encode a forward package version or migration count', () => {
    const source = readFileSync('scripts/enterprise/fetch-supabase-rls-evidence.mjs', 'utf8');
    expect(source).not.toContain('selectedMigrationCount');
    expect(source).not.toContain('V20');
    expect(source).not.toContain('27/27');
  });
});
