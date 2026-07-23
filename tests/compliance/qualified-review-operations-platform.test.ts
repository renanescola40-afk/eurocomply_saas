import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260723170000_qualified_review_operations_platform.sql', 'utf8');
const domain = readFileSync('src/server/ai-governance/qualified-review-operations.ts', 'utf8');
const workflow = readFileSync('.github/workflows/qualified-review-operations-platform.yml', 'utf8');

describe('qualified review operations platform contracts', () => {
  it('creates tenant-scoped operational records with forced RLS and backend-only writes', () => {
    for (const table of [
      'qualified_review_campaigns',
      'qualified_reviewers',
      'qualified_review_assignments',
      'qualified_review_submissions',
      'qualified_review_decisions',
      'qualified_review_events',
    ]) {
      expect(migration).toContain(`public.${table}`);
      expect(migration).toContain(`alter table public.${table} force row level security`);
      expect(migration).toContain(`create policy ${table}_insert_backend_only`);
      expect(migration).toContain(`create policy ${table}_update_backend_only`);
      expect(migration).toContain(`create policy ${table}_delete_backend_only`);
    }
    expect(migration).toContain('revoke all on public.qualified_review_campaigns');
    expect(migration).toContain('public.is_organization_member(organization_id)');
  });

  it('enforces tenant-matching references and a valid case-insensitive reviewer email index', () => {
    expect(migration).toContain('qualified_reviewers_org_email_unique');
    expect(migration).toContain('on public.qualified_reviewers (organization_id, lower(email))');
    expect(migration).toContain('foreign key (campaign_id, organization_id)');
    expect(migration).toContain('foreign key (reviewer_id, organization_id)');
    expect(migration).toContain('foreign key (assignment_id, organization_id)');
    expect(migration).toContain('foreign key (submission_id, organization_id)');
    expect(migration).not.toContain('unique (organization_id, lower(email))');
  });

  it('keeps the 51-point review boundary fail closed', () => {
    for (const token of [
      "'LEGAL-RULES': 4",
      "'PROHIBITED-PRACTICES': 7",
      "'ARTICLE-50': 8",
      'FRIA: 6',
      'DEPLOYER: 7',
      "'HIGH-RISK-PROVIDER': 9",
      'CONFORMITY: 5',
      'GPAI: 5',
      'target SHA mismatch',
      'declared conflict requires reassignment',
      'review is expired',
    ]) expect(domain).toContain(token);
  });

  it('uses a read-only exact-SHA workflow and retains reports', () => {
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('continue-on-error');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('retention-days: 90');
    expect(workflow).toContain('generate-qualified-review-operations-report.mjs');
    expect(workflow).toContain('qualified-review-operations-platform.test.ts');
  });
});
