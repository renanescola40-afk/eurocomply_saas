import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const dashboardQueryPath = path.join(process.cwd(), 'src/server/queries/organization-dashboard.ts');
const dashboardPagePath = path.join(process.cwd(), 'src/app/[locale]/dashboard/organizations/page.tsx');
const dashboardQuerySource = fs.readFileSync(dashboardQueryPath, 'utf8');
const dashboardPageSource = fs.readFileSync(dashboardPagePath, 'utf8');

describe('dashboard AI-system functional QA regressions', () => {
  it('counts canonical AI Act risk-level values', () => {
    expect(dashboardQuerySource).toContain(".eq('risk_level', 'high_risk_review')");
    expect(dashboardQuerySource).toContain(".eq('risk_level', 'prohibited_review')");
    expect(dashboardQuerySource).toContain(".eq('risk_level', 'limited_transparency')");
    expect(dashboardQuerySource).toContain(".eq('risk_level', 'minimal_or_low')");
    expect(dashboardQuerySource).not.toContain(".eq('risk_level', 'limited')");
  });

  it('derives activation risk classification from AI-system classification', () => {
    expect(dashboardPageSource).toContain('const hasClassifiedAiSystem = data.aiSystemSummary.previews.some');
    expect(dashboardPageSource).toContain('hasRiskClassification: hasClassifiedAiSystem');
    expect(dashboardPageSource).not.toContain('hasRiskClassification: data.summary.totals.risks > 0');
  });
});
