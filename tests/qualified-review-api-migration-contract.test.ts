import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const sql = fs.readFileSync('supabase/migrations/20260724103000_qualified_review_api_operations.sql', 'utf8');

describe('qualified review API migration', () => {
  it('enforces one current submission per assignment', () => {
    expect(sql).toContain('qualified_review_submissions_one_current');
    expect(sql).toContain('where superseded_at is null');
  });

  it('makes the review event stream append-only', () => {
    expect(sql).toContain('qualified_review_events_append_only');
    expect(sql).toContain('before update or delete');
    expect(sql).toContain('qualified_review_events_append_only');
  });

  it('provides a service-role-only expiry sweep', () => {
    expect(sql).toContain('expire_qualified_review_assignments');
    expect(sql).toContain('for update');
    expect(sql).toContain("set status = 'expired'");
    expect(sql).toContain("'assignment_expired'");
    expect(sql).toContain('grant execute on function public.expire_qualified_review_assignments');
    expect(sql).toContain('to service_role');
  });
});
