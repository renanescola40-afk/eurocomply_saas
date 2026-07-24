import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  'supabase/migrations/20260723170000_qualified_review_operations_platform.sql',
  'utf8',
);

const tables = [
  'qualified_review_campaigns',
  'qualified_reviewers',
  'qualified_review_assignments',
  'qualified_review_submissions',
  'qualified_review_decisions',
  'qualified_review_events',
];

describe('qualified review operations migration contract', () => {
  it('creates canonical tenant-scoped tables with forced RLS', () => {
    for (const table of tables) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`alter table public.${table} force row level security`);
    }
  });

  it('enforces tenant matching through composite foreign keys', () => {
    expect(sql).toContain('foreign key (campaign_id, organization_id)');
    expect(sql).toContain('references public.qualified_review_campaigns(id, organization_id)');
    expect(sql).toContain('foreign key (reviewer_id, organization_id)');
    expect(sql).toContain('references public.qualified_reviewers(id, organization_id)');
    expect(sql).toContain('foreign key (assignment_id, organization_id)');
    expect(sql).toContain('references public.qualified_review_assignments(id, organization_id)');
    expect(sql).toContain('foreign key (submission_id, organization_id)');
    expect(sql).toContain('references public.qualified_review_submissions(id, organization_id)');
  });

  it('keeps authenticated writes fail-closed and reads organization-scoped', () => {
    expect(sql).toContain('revoke all on public.qualified_review_campaigns');
    expect(sql).toContain('grant select on public.qualified_review_campaigns');
    expect(sql).toContain('using (public.is_organization_member(organization_id))');
    expect(sql).toContain('for insert to authenticated with check (false)');
    expect(sql).toContain('for update to authenticated using (false) with check (false)');
    expect(sql).toContain('for delete to authenticated using (false)');
  });

  it('binds evidence to exact SHA and integrity digests', () => {
    expect(sql).toContain("target_sha ~ '^[a-f0-9]{40}$'");
    expect(sql).toContain("integrity_sha256 ~ '^[a-f0-9]{64}$'");
    expect(sql).toContain('qualified_reviewers_org_email_unique');
    expect(sql).toContain('(organization_id, lower(email))');
  });
});
