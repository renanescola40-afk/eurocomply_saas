import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20261009210000_harden_active_membership_governance_read.sql',
  'utf8',
);

const affectedPolicies = [
  ['ai_annex_iv_changes', 'ai_annex_iv_changes_member_select'],
  ['ai_annex_iv_decisions', 'ai_annex_iv_decisions_member_select'],
  ['ai_annex_iv_evidence', 'ai_annex_iv_evidence_member_select'],
  ['ai_annex_iv_packages', 'ai_annex_iv_packages_member_select'],
  ['ai_annex_iv_sections', 'ai_annex_iv_sections_member_select'],
  ['ai_article50_assessments', 'article50_assessments_member_read'],
  ['ai_article50_events', 'article50_events_member_read'],
  ['ai_article50_evidence', 'article50_evidence_member_read'],
  ['ai_qms_audits', 'ai_qms_audits_member_select'],
  ['ai_qms_controls', 'ai_qms_controls_member_select'],
  ['ai_qms_decisions', 'ai_qms_decisions_member_select'],
  ['ai_qms_management_reviews', 'ai_qms_management_reviews_member_select'],
  ['ai_qms_nonconformities', 'ai_qms_nonconformities_member_select'],
  ['ai_qms_systems', 'ai_qms_systems_member_select'],
] as const;

describe('active membership governance read hardening', () => {
  it('rewrites every affected read policy to the canonical membership authority', () => {
    for (const [table, policy] of affectedPolicies) {
      expect(migration).toContain(`alter policy ${policy}\non public.${table}`);
    }

    expect(
      migration.match(/using \(app_private\.is_org_member\(organization_id\)\);/g),
    ).toHaveLength(affectedPolicies.length);
  });

  it('does not alter grants, write policies, or the RLS enablement state', () => {
    expect(migration).not.toMatch(/\bgrant\b/i);
    expect(migration).not.toMatch(/\brevoke\b/i);
    expect(migration).not.toMatch(/for\s+(insert|update|delete|all)\b/i);
    expect(migration).not.toMatch(/row\s+level\s+security/i);
  });

  it('does not retain raw membership-row existence authorization', () => {
    expect(migration).not.toContain('member.user_id = auth.uid()');
    expect(migration).not.toContain('from public.organization_members');
  });
});
