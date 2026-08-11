import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const policy = readFileSync('docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md', 'utf8');
const goNoGo = readFileSync('scripts/security/check-release-go-no-go.mjs', 'utf8');
const rlsGate = readFileSync('scripts/security/enforce-supabase-rls-live-complete.mjs', 'utf8');
const writer = readFileSync('scripts/release/write-enterprise-runtime-evidence.mjs', 'utf8');

describe('enterprise release runtime source-of-truth contract', () => {
  it('keeps the committed P0 register as policy metadata instead of mutable runtime state', () => {
    expect(policy).toContain('Policy metadata only');
    const dataRows = policy
      .split('\n')
      .filter((line) => line.startsWith('| ') && !line.includes('Evidence item') && !line.includes('---'));
    expect(dataRows).toHaveLength(16);
    expect(dataRows.every((line) => line.includes('| Open |'))).toBe(true);
  });

  it('does not require the policy markdown to claim live RLS completion', () => {
    for (const script of [goNoGo, rlsGate]) {
      expect(script).not.toContain('P0_RUNTIME_EVIDENCE_REGISTER.md');
      expect(script).not.toContain('registerMarksComplete');
      expect(script).not.toContain('registerMarksSupabaseComplete');
      expect(script).toContain('supabase-live-rls-validation.json');
      expect(script).toContain('githubActions');
      expect(script).toContain('RELEASE_COMMIT_SHA');
    }
  });

  it('uses the shared conflict-aware exact-SHA resolver for enterprise evidence binding', () => {
    expect(writer).toContain("import { resolveEvidenceShaBinding } from './evidence-sha-binding.mjs'");
    expect(writer).toContain('resolution.conflict');
    expect(writer).toContain('resolution.distinctValidShas');
    expect(writer).toContain('shaSource');
    expect(writer).toContain('shaConflict');
    expect(writer).not.toContain('function collectCommitShas');
  });
});
