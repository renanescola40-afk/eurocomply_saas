import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260728103000_qualified_review_evidence_handoff.sql'), 'utf8');

describe('qualified review evidence handoff migration', () => {
  it('forces RLS and blocks anonymous access', () => {
    expect(migration).toContain('force row level security');
    expect(migration).toContain('revoke all on public.qualified_review_evidence_packages from anon, authenticated');
    expect(migration).toContain('security_invoker = true');
  });

  it('requires exact complete package before persistence', () => {
    expect(migration).toContain('p_accepted_points <> 51');
    expect(migration).toContain('p_review_count <> 8');
    expect(migration).toContain("raise exception 'evidence_package_incomplete'");
  });

  it('keeps only one current package per campaign', () => {
    expect(migration).toContain('qualified_review_evidence_packages_current_idx');
    expect(migration).toContain('where superseded_at is null');
  });
});
