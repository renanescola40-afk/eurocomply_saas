import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/supabase-live-rls-validation.yml';

describe('Supabase live RLS workflow ai_assessments proof chain', () => {
  it('executes the ai_assessments live proof after the base tenant-isolation proof and before provenance stamping', () => {
    const workflow = readFileSync(workflowPath, 'utf8');
    const baseCommand = 'run: node scripts/security/run-supabase-live-tenant-isolation.mjs';
    const aiAssessmentsCommand = 'run: node scripts/security/run-supabase-live-ai-assessments-rls.mjs';
    const provenanceCommand = 'run: node scripts/security/stamp-supabase-live-rls-provenance.mjs';

    const baseIndex = workflow.indexOf(baseCommand);
    const aiAssessmentsIndex = workflow.indexOf(aiAssessmentsCommand);
    const provenanceIndex = workflow.indexOf(provenanceCommand);

    expect(baseIndex).toBeGreaterThanOrEqual(0);
    expect(aiAssessmentsIndex).toBeGreaterThan(baseIndex);
    expect(provenanceIndex).toBeGreaterThan(aiAssessmentsIndex);
  });

  it('binds the ai_assessments proof to the same protected Supabase credentials and cleanup boundary', () => {
    const workflow = readFileSync(workflowPath, 'utf8');
    const stepStart = workflow.indexOf('- name: Append live ai_assessments RLS proof');
    const stepEnd = workflow.indexOf('- name: Stamp GitHub Actions provenance');

    expect(stepStart).toBeGreaterThanOrEqual(0);
    expect(stepEnd).toBeGreaterThan(stepStart);

    const step = workflow.slice(stepStart, stepEnd);
    expect(step).toContain('NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}');
    expect(step).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}');
    expect(step).toContain('SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}');
    expect(step).toContain("RLS_LIVE_KEEP_FIXTURES: '0'");
    expect(step).toContain('run: node scripts/security/run-supabase-live-ai-assessments-rls.mjs');
  });

  it('keeps the proof workflow read-only at the repository boundary', () => {
    const workflow = readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('git push');
    expect(workflow).not.toContain('gh pr create');
    expect(workflow).not.toContain('pull_request_target');
  });
});
