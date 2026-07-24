import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260724001000_qualified_review_decision_controls.sql'),
  'utf8',
);

describe('qualified review decision controls migration', () => {
  it('enforces service-role-only atomic transitions', () => {
    expect(migration).toContain('security definer');
    expect(migration).toContain('for update');
    expect(migration).toContain('version_conflict');
    expect(migration).toContain('grant execute on function public.transition_qualified_review_assignment');
    expect(migration).toContain('to service_role');
  });

  it('enforces separation of duties and valid evidence', () => {
    expect(migration).toContain('separation_of_duties_violation');
    expect(migration).toContain('valid_submission_required');
    expect(migration).toContain("p_next_status in ('accepted','rejected','changes_requested')");
    expect(migration).toContain("s.valid_until > now()");
  });

  it('writes an append-only audit event', () => {
    expect(migration).toContain('insert into public.qualified_review_events');
    expect(migration).toContain("'assignment_status_changed'");
  });
});
