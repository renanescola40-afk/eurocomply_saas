import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260906000000_reconcile_final_public_release_payment_storage_hardening.sql',
  'utf8',
);
const route = readFileSync('src/app/api/gap-analysis/route.ts', 'utf8');

describe('Gap Analysis active tenant membership boundary', () => {
  it('adds independent restrictive membership guards to the direct authenticated data plane', () => {
    expect(migration).toContain('restrict_gap_assessments_active_membership');
    expect(migration).toContain('restrict_gap_answers_active_membership');
    expect(migration).toContain('restrict_compliance_findings_active_membership');
    expect(migration).toContain('as restrictive');
    expect(migration).toContain('app_private.is_org_member(organization_id)');
    expect(migration).toContain('app_private.is_org_member(assessment.organization_id)');
    expect(migration).toContain(
      'assessment.organization_id = compliance_findings.organization_id',
    );
  });

  it('fails closed if existing Gap Analysis rows already violate tenant integrity', () => {
    expect(migration).toContain(
      'Existing gap assessment actor is outside active organization membership',
    );
    expect(migration).toContain(
      'Existing compliance finding actor is outside active organization membership',
    );
    expect(migration).toContain(
      'Existing compliance finding references a cross-organization assessment',
    );
  });

  it('keeps the canonical application write path server-authorized', () => {
    expect(route).toContain('getCurrentOrganizationForUser');
    expect(route).toContain('assertOrganizationPermission');
    expect(route).toContain('createAdminClient');
    expect(route).toContain(".from('gap_assessments')");
    expect(route).toContain(".from('compliance_findings')");
  });
});
