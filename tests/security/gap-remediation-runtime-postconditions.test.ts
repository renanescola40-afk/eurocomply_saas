import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const postconditions = readFileSync(
  'scripts/supabase/verify-forward-reconciliation-postconditions.sql',
  'utf8',
);
const finalSharedValidator = readFileSync(
  'scripts/security/validate-live-rls-inventory-helper-boundary.sql',
  'utf8',
);
const gapRuntime = readFileSync(
  'scripts/security/validate-gap-remediation-runtime.sql',
  'utf8',
);

describe('gap/remediation reconciliation runtime postconditions', () => {
  it('chains the gap runtime proof through the shared rehearsal/promotion postcondition runner', () => {
    expect(postconditions).toContain('\\ir ../security/validate-live-rls-inventory-helper-boundary.sql');
    expect(finalSharedValidator).toContain('\\ir validate-gap-remediation-runtime.sql');
  });

  it('fails closed when the reconciled runtime or tenant scope is incomplete', () => {
    for (const table of [
      'gap_assessments',
      'gap_answers',
      'compliance_findings',
      'compliance_tasks',
      'evidence_items',
      'compliance_evidence',
    ]) {
      expect(gapRuntime).toContain(`'${table}'`);
    }
    expect(gapRuntime).toContain('gap/remediation RLS/FORCE RLS posture is incomplete');
    expect(gapRuntime).toContain('compliance_tasks.organization_id must remain nullable');
    expect(gapRuntime).toContain('compliance_tasks_requires_tenant_scope');
    expect(gapRuntime).toContain('legacy workspace_id foreign key is present');
    expect(gapRuntime).toContain('authenticated compliance_tasks organization mutation boundary is not backend-only');
    expect(gapRuntime).toContain('restrictive personal compliance_tasks insert guard is missing');
    expect(gapRuntime).toContain('transitional compliance_tasks insert guard was not retired');
    expect(gapRuntime).toContain('authenticated compliance_tasks permanent update/delete guard is incomplete');
    expect(gapRuntime).toContain('canonical organization compliance_tasks read policy was not preserved');
    expect(gapRuntime).toContain('direct compliance_tasks mutation policy unexpectedly remains active');
  });

  it('proves browser denial and private evidence storage ownership boundaries', () => {
    expect(gapRuntime).toContain("grantee = 'anon'");
    expect(gapRuntime).toContain('anon unexpectedly retains gap/remediation table privileges');
    expect(gapRuntime).toContain("id = 'compliance-evidence'");
    expect(gapRuntime).toContain('and public = false');
    expect(gapRuntime).toContain('compliance-evidence storage ownership policy set is incomplete');
    expect(gapRuntime).toContain("select 'gap_remediation_runtime_validation_passed' as status");
  });
});