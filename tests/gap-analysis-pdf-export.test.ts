import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync('src/app/[locale]/dashboard/gap-analysis/page.tsx', 'utf8');
const route = readFileSync('src/app/api/gap-analysis/report/route.ts', 'utf8');

describe('gap analysis corporate PDF export', () => {
  it('removes the TXT customer-facing export', () => {
    expect(page).not.toContain('text/plain;charset=utf-8');
    expect(page).not.toContain('risck-comply-gap-analysis.txt');
    expect(page).toContain('/api/gap-analysis/report');
    expect(page).toContain("String.fromCharCode(...header) !== '%PDF'");
  });

  it('returns a real PDF attachment with a deterministic filename', () => {
    expect(route).toContain("'Content-Type': 'application/pdf'");
    expect(route).toContain('RISCK-COMPLY_Gap-Analysis_');
    expect(route).toContain("Buffer.from('%PDF-1.4");
  });

  it('keeps report reads tenant and user scoped', () => {
    expect(route).toContain(".eq('organization_id', organization.id)");
    expect(route).toContain(".eq('user_id', user.id)");
    expect(route).toContain("permission: 'read_ai_governance'");
  });

  it('uses the saved assessment as the PDF source of truth', () => {
    expect(page).toContain('assessmentResult.assessmentId');
    expect(route).toContain(".from('gap_assessments')");
    expect(route).toContain(".from('gap_answers')");
    expect(route).toContain(".eq('assessment_id', assessment.id)");
  });

  it('contains corporate readiness disclaimers and PDF metadata', () => {
    expect(route).toContain('not a certification');
    expect(route).toContain('não é uma certificação');
    expect(route).toContain('/Title (RISCK COMPLY - EU AI Act Gap Analysis Report)');
    expect(route).toContain('/Author (RISCK COMPLY)');
  });
});
