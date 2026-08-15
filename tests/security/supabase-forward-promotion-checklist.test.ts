import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const checklist = readFileSync('docs/runbooks/SUPABASE_FORWARD_PROMOTION_CHECKLIST.md', 'utf8');

describe('Supabase forward production promotion operator checklist', () => {
  it('requires protected governance and exact-SHA source proofs', () => {
    expect(checklist).toContain('administrator bypass disabled');
    expect(checklist).toContain('at least one required deployment reviewer');
    expect(checklist).toContain('protected-branches-only deployment policy');
    expect(checklist).toContain('Supabase Forward Reconciliation Rehearsal');
    expect(checklist).toContain('Supabase Forward Reconciliation Dry Run');
  });

  it('requires post-promotion exact-SHA runtime revalidation', () => {
    expect(checklist).toContain('Supabase live RLS validation');
    expect(checklist).toContain('Production Runtime Proof');
    expect(checklist).toContain('Enterprise Recovery Drill');
    expect(checklist).toContain('P0 Runtime Evidence');
    expect(checklist).toContain('Enterprise Production Gate');
    expect(checklist).toContain('Enterprise Readiness Scorecard');
  });
});
