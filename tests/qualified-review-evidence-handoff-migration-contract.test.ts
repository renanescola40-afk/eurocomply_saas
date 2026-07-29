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

  it('builds the handoff from canonical assignment workstreams', () => {
    expect(migration).toContain('from public.qualified_review_assignments a');
    expect(migration).toContain('a.workstream_id');
    expect(migration).toContain('a.weight');
    expect(migration).not.toContain('public.qualified_review_workstreams');
  });

  it('only pairs an accepted decision with its tenant-bound submission', () => {
    expect(migration).toContain('d.submission_id = s.id');
    expect(migration).toContain('d.organization_id = a.organization_id');
    expect(migration).toContain("d.decision = 'accepted'");
  });

  it('atomically persists a human decision for the current submission', () => {
    expect(migration).toContain('create or replace function public.transition_qualified_review_assignment');
    expect(migration).toContain('select s.id into v_submission_id');
    expect(migration).toContain('insert into public.qualified_review_decisions');
    expect(migration).toContain('v_submission_id, p_next_status, trim(p_reason), p_actor_id');
  });
});
