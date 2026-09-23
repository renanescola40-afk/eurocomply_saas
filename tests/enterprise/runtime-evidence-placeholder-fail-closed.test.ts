import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const authFetcher = readFileSync('scripts/enterprise/fetch-auth-rbac-evidence.mjs', 'utf8');
const rlsFetcher = readFileSync('scripts/enterprise/fetch-supabase-rls-evidence.mjs', 'utf8');

describe('runtime evidence hydration remains fail closed when exact-SHA producers are absent', () => {
  it('writes an Open Auth/RBAC placeholder instead of deleting the contract file', () => {
    expect(authFetcher).toContain('writeOpenAuthRbacPlaceholder(root, targetSha)');
    expect(authFetcher).toContain("status: 'Open'");
    expect(authFetcher).toContain("outcome: 'no_go'");
    expect(authFetcher).toContain('placeholderOnly: true');
    expect(authFetcher).toContain('realRuntimeEvidenceAttached: false');
  });

  it('writes an Open Supabase RLS placeholder without manufacturing live proof', () => {
    expect(rlsFetcher).toContain('writeOpenSupabaseRlsPlaceholder(root, targetSha, sourceContract)');
    expect(rlsFetcher).toContain("status: 'Open'");
    expect(rlsFetcher).toContain("outcome: 'no_go'");
    expect(rlsFetcher).toContain('placeholderOnly: true');
    expect(rlsFetcher).toContain('realRuntimeEvidenceAttached: false');
    expect(rlsFetcher).toContain('exactShaBound: false');
    expect(rlsFetcher).toContain('sourceRunBound: false');
  });

  it('keeps exact-SHA runtime evidence mandatory for a real Complete result', () => {
    expect(authFetcher).toContain("if (required) throw new Error('exact_sha_runtime_run_missing')");
    expect(rlsFetcher).toContain("if (required) throw new Error('exact_sha_runtime_run_missing')");
    expect(authFetcher).toContain("evidence?.status !== 'Complete'");
    expect(rlsFetcher).toContain('validateDownloadedEvidence');
  });
});
