import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20260730101500_qualified_review_final_technical_closeout.sql', 'utf8');

describe('qualified review final closeout migration', () => {
  it('uses forced RLS and tenant membership reads', () => {
    expect(sql).toContain('force row level security');
    expect(sql).toContain('is_organization_member(organization_id)');
    expect(sql).toContain('revoke all on public.qualified_review_technical_closeouts from anon, authenticated');
  });

  it('keeps persistence backend-only and append-oriented', () => {
    expect(sql).toContain("auth.role() <> 'service_role'");
    expect(sql).toContain('superseded_at = now()');
    expect(sql).toContain('grant execute on function public.persist_qualified_review_technical_closeout');
  });

  it('preserves the human execution truth boundary', () => {
    expect(sql).toContain('HUMAN_EXECUTION_PENDING');
    expect(sql).toContain('HUMAN_EXECUTION_COMPLETE');
  });
});
