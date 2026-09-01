import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const packageMigration = readFileSync(
  'supabase/migrations/20260901004000_legal_assurance_package_and_information_atomic.sql',
  'utf8',
);
const decisionMigration = readFileSync(
  'supabase/migrations/20260901004100_legal_assurance_decision_and_remediation_atomic.sql',
  'utf8',
);

describe('Legal Assurance atomic professional lifecycle', () => {
  it('creates immutable package versions only after accepted engagement', () => {
    expect(packageMigration).toContain('create or replace function public.create_legal_review_package_atomic');
    expect(packageMigration).toContain("current_row.engagement_status <> 'ACCEPTED'");
    expect(packageMigration).toContain("current_row.status not in ('ACCEPTED_FOR_REVIEW', 'PACKAGE_PREPARING', 'RESUBMITTED')");
    expect(packageMigration).toContain('select coalesce(max(p.package_version), 0) + 1');
    expect(packageMigration).toContain('set finalized_at = now()');
    expect(packageMigration).toContain("set status = 'READY_FOR_REVIEW'");
    expect(packageMigration).toContain("p_package_manifest_digest, '') !~ '^[a-f0-9]{64}$'");
  });

  it('keeps information requests matter-scoped and structured', () => {
    expect(packageMigration).toContain('create or replace function public.request_legal_review_information_atomic');
    expect(packageMigration).toContain("lag.grant_scope = 'REVIEW'");
    expect(packageMigration).toContain("set status = 'INFORMATION_REQUESTED'");
    expect(packageMigration).toContain('create or replace function public.respond_legal_review_information_atomic');
    expect(packageMigration).toContain('and organization_id = p_organization_id');
    expect(packageMigration).toContain("ir.status = 'OPEN'");
    expect(packageMigration).toContain("set status = 'ANSWERED', answered_at = now()");
  });

  it('binds professional decisions to verified Counsel and latest frozen package', () => {
    expect(decisionMigration).toContain('create or replace function public.issue_legal_review_decision_atomic');
    expect(decisionMigration).toContain("cp.verification_status = 'VERIFIED'");
    expect(decisionMigration).toContain('cp.active = true');
    expect(decisionMigration).toContain("lag.grant_scope = 'REVIEW'");
    expect(decisionMigration).toContain('and p.finalized_at is not null');
    expect(decisionMigration).toContain('order by p.package_version desc');
    expect(decisionMigration).toContain('supersedes_decision_id');
    expect(decisionMigration).toContain("p_decision_digest, '') !~ '^[a-f0-9]{64}$'");
  });

  it('requires explicit remediation before resubmission', () => {
    expect(decisionMigration).toContain("p_decision = 'REMEDIATION_REQUIRED' and jsonb_array_length(p_remediation_items) = 0");
    expect(decisionMigration).toContain("status = 'READY_FOR_RESUBMISSION'");
    expect(decisionMigration).toContain('create or replace function public.resubmit_legal_review_atomic');
    expect(decisionMigration).toContain("r.status not in ('READY_FOR_RESUBMISSION', 'ACCEPTED', 'CLOSED')");
    expect(decisionMigration).toContain("set status = 'RESUBMITTED'");
  });

  it('keeps every professional lifecycle mutation backend-only', () => {
    for (const migration of [packageMigration, decisionMigration]) {
      expect(migration).toContain('from public, anon, authenticated;');
      expect(migration).toContain('to service_role;');
      expect(migration).toContain("has_function_privilege(\n       'authenticated'");
      expect(migration).not.toContain('forbidden:');
    }
  });
});
