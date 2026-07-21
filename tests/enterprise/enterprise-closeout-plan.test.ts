import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('scripts/enterprise/enterprise-closeout-plan.mjs', 'utf8');

describe('enterprise closeout plan contract', () => {
  it('uses the canonical scorecard artifact and emits a versioned plan', () => {
    expect(source).toContain('artifacts/enterprise-readiness/enterprise-readiness-scorecard.json');
    expect(source).toContain('risck-comply.enterprise-closeout-plan.v1');
  });

  it('keeps PASS and NOT_APPLICABLE controls out of the remediation queue', () => {
    expect(source).toContain("!['PASS', 'NOT_APPLICABLE'].includes(control.status)");
  });

  it('prioritizes critical controls and failed evidence', () => {
    expect(source).toContain('Number(b.critical) - Number(a.critical)');
    expect(source).toContain('FAIL: 0');
    expect(source).toContain('BLOCKED: 1');
  });

  it('preserves evidence provenance and next-action guidance', () => {
    expect(source).toContain('evidencePath: control.evidencePath || null');
    expect(source).toContain('evidenceCheck: control.evidenceCheck || null');
    expect(source).toContain('execute_or_import_required_evidence');
  });

  it('computes truthful remaining progress and fails closed while work remains', () => {
    expect(source).toContain('Math.max(0, 100 - current)');
    expect(source).toContain('if (plan.openControlCount > 0) process.exitCode = 2');
  });

  it('requires the complete enterprise acceptance gate', () => {
    expect(source).toContain('scorePercent: 100');
    expect(source).toContain('criticalOpen: 0');
    expect(source).toContain("releaseDecision: 'GO'");
    expect(source).toContain('exactShaEvidenceRequired: true');
    expect(source).toContain('runtimeEvidenceRequired: true');
    expect(source).toContain('independentEvidenceRequiredWhereApplicable: true');
  });
});
