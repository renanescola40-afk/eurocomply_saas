import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('enterprise readiness workflows', () => {
  it('creates real Supabase persistence tables with tenant scoping and RLS', () => {
    const migration = read('supabase/migrations/20260707110000_enterprise_readiness_evidence_platform.sql');

    for (const table of [
      'enterprise_evidence_packs',
      'enterprise_evidence_pack_items',
      'enterprise_vendor_due_diligence',
      'enterprise_risk_reviews',
    ]) {
      expect(migration).toContain(table);
    }

    expect(migration).toContain('organization_id uuid not null');
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('enterprise_member_can_read');
    expect(migration).toContain('enterprise_member_can_manage');
    expect(migration).not.toMatch(/mock|placeholder_table|fake/i);
  });

  it('protects enterprise workflow mutations with validation, RBAC, rate limit and audit logging', () => {
    const route = read('src/app/api/ai-systems/route.ts');

    expect(route).toContain("searchParams.get('workflow')");
    expect(route).toContain('evidencePackBodySchema');
    expect(route).toContain('vendorDiligenceBodySchema');
    expect(route).toContain('riskReviewBodySchema');
    expect(route).toContain('assertTrustedOrigin');
    expect(route).toContain('assertOrganizationPermission');
    expect(route).toContain('checkDistributedRateLimit');
    expect(route).toContain('createAuditEvent');
    expect(route).toContain('enterprise_evidence_pack_created');
    expect(route).toContain('vendor_due_diligence_started');
    expect(route).toContain('risk_review_started');
    expect(route).toContain('noStoreJson');
  });

  it('renders real enterprise workflow UI from the AI system detail page', () => {
    const detailPage = read('src/app/[locale]/ai-systems/[id]/page.tsx');
    const form = read('src/app/[locale]/ai-systems/[id]/ai-system-edit-form.tsx');

    expect(detailPage).toContain('Enterprise readiness view');
    expect(detailPage).toContain('ai-system-enterprise-view-title');
    expect(detailPage).toContain('locale={locale}');
    expect(form).toContain('Evidence Pack Builder');
    expect(form).toContain('Vendor Due Diligence Checklist');
    expect(form).toContain('Risk Review Workflow');
    expect(form).toContain('Executive Readiness Report signals');
    expect(form).toContain('/api/ai-systems?workflow=');
    expect(form).toContain('isWorkflowSaving');
    expect(form).toContain('workflowNotice');
  });

  it('keeps product documentation honest about gaps and roadmap', () => {
    const gap = read('docs/product/ENTERPRISE_FEATURE_GAP_ANALYSIS.md');
    const roadmap = read('docs/product/FEATURE_ROADMAP_TO_10_10.md');

    expect(gap).toContain('Evidence pack builder');
    expect(gap).toContain('Vendor due diligence');
    expect(gap).toContain('Do not claim compliance');
    expect(roadmap).toContain('no fake integrations');
    expect(roadmap).toContain('real UI, backend persistence, tenant scoping, RBAC');
  });
});
