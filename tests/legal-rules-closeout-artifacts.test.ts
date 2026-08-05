import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(path), 'utf8')) as T;
}

type LegalRulesEvidence = {
  schema: string;
  status: 'NOT_EXECUTED' | 'PASS';
  deploymentSha: string | null;
  deploymentUrl?: string | null;
  environment?: string;
  countsForRuntimeCoverage: boolean;
  blocker?: string;
  artifactSha256: string | null;
  testCases: Array<{ status: string }>;
  evidenceIntegrity: { placeholderOnly: boolean; runtimeProofInvented: boolean };
  evidenceBoundary: string;
};

describe('legal rules technical closeout artifacts', () => {
  it('accepts only a truthful non-creditable placeholder or validated exact-SHA PASS evidence', () => {
    const artifact = readJson<LegalRulesEvidence>('docs/security/evidence/runtime/legal-rules-validation.json');

    expect(artifact.schema).toBe('risck-comply.legal-rules-runtime-evidence.v1');
    expect(artifact.evidenceIntegrity.runtimeProofInvented).toBe(false);

    if (artifact.status === 'NOT_EXECUTED') {
      expect(artifact.deploymentSha).toBeNull();
      expect(artifact.countsForRuntimeCoverage).toBe(false);
      expect(artifact.artifactSha256).toBeNull();
      expect(artifact.testCases).toHaveLength(0);
      expect(artifact.evidenceIntegrity.placeholderOnly).toBe(true);
      expect(artifact.blocker).toContain('exact 40-character SHA');
      return;
    }

    expect(artifact.status).toBe('PASS');
    expect(artifact.deploymentSha).toMatch(/^[a-f0-9]{40}$/);
    expect(artifact.deploymentUrl).toMatch(/^https:\/\//);
    expect(artifact.environment).not.toBe('unknown');
    expect(artifact.countsForRuntimeCoverage).toBe(true);
    expect(artifact.artifactSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.testCases.length).toBeGreaterThanOrEqual(8);
    expect(artifact.testCases.every((testCase) => testCase.status === 'PASS')).toBe(true);
    expect(artifact.evidenceIntegrity.placeholderOnly).toBe(false);
    expect(artifact.evidenceBoundary.toLowerCase()).toContain('does not replace qualified legal review');
  });

  it('keeps scorecard dimensions separate and never infers human or customer compliance', () => {
    const artifact = readJson<LegalRulesEvidence>('docs/security/evidence/runtime/legal-rules-validation.json');
    const scorecard = readJson<{
      dimensions: Record<string, { acceptedPercent: number; status: string }>;
      overallMaturity: { percent: number; status: string };
      scoreBoundary: Record<string, boolean>;
    }>('docs/compliance/legal-rules-technical-scorecard.json');

    expect(Object.keys(scorecard.dimensions)).toEqual(expect.arrayContaining([
      'implementationCoverage',
      'testCoverage',
      'runtimeCoverage',
      'humanReviewCoverage',
      'operationalValidation',
    ]));
    expect(scorecard.dimensions.implementationCoverage.acceptedPercent).toBe(100);
    expect(scorecard.dimensions.humanReviewCoverage.acceptedPercent).toBe(0);
    expect(scorecard.scoreBoundary.customerSpecificCompliance).toBe(false);
    expect(scorecard.scoreBoundary.legalComplianceGuarantee).toBe(false);

    // Runtime proof cannot turn the overall scorecard into GO while human or
    // operational evidence remains incomplete.
    if (
      scorecard.dimensions.humanReviewCoverage.acceptedPercent < 100
      || scorecard.dimensions.operationalValidation.acceptedPercent < 100
    ) {
      expect(scorecard.overallMaturity.percent).toBeLessThan(100);
      expect(scorecard.overallMaturity.status).not.toMatch(/^(GO|PASS|COMPLETE)$/i);
    }

    if (artifact.status === 'NOT_EXECUTED') {
      expect(scorecard.dimensions.runtimeCoverage.acceptedPercent).toBe(0);
      expect(scorecard.overallMaturity).toMatchObject({ percent: 30, status: 'NO_GO' });
      expect(scorecard.scoreBoundary.technicalComplete).toBe(false);
      return;
    }

    // Evidence promotion is intentionally single-file. A derived scorecard may
    // remain conservative until its separate regeneration workflow completes.
    expect([0, 100]).toContain(scorecard.dimensions.runtimeCoverage.acceptedPercent);
    if (scorecard.dimensions.runtimeCoverage.acceptedPercent === 0) {
      expect(scorecard.scoreBoundary.technicalComplete).toBe(false);
    }
  });

  it('keeps consolidated production closeout blocked until all broader controls pass', () => {
    const closeout = readJson<{
      releaseDecision: string;
      technicalComplete: boolean;
      controls: Array<{ id: string; status: string }>;
      counts: { totalControls: number; exactShaRuntimePass: number; blocked: number; revalidationRequired: number };
    }>('docs/security/evidence/runtime/technical-closeout-consolidated.json');

    expect(closeout.releaseDecision).toBe('NO_GO');
    expect(closeout.technicalComplete).toBe(false);
    expect(closeout.controls).toHaveLength(closeout.counts.totalControls);
    expect(closeout.controls.filter((control) => control.status === 'BLOCKED')).toHaveLength(closeout.counts.blocked);
    expect(closeout.controls.filter((control) => control.status === 'REVALIDATION_REQUIRED')).toHaveLength(closeout.counts.revalidationRequired);
    expect(closeout.controls.map((control) => control.id)).toEqual(expect.arrayContaining([
      'migrations', 'rls', 'rpcs', 'cron', 'email', 'reviewer-invites', 'sessions',
      'attestations', 'submissions', 'decisions', 'evidence-package-export', 'final-closeout',
      'rate-limit', 'no-store', 'trusted-origin', 'sanitised-logs', 'sentry', 'backups',
      'restore', 'health', 'ready', 'deployment-sha', 'legal-rules-runtime', 'deployment-smoke',
    ]));
  });

  it('versions ADR, runbook, changelog and rollback plan', () => {
    for (const path of [
      'docs/architecture/decisions/2026-07-30-legal-rules-runtime-evidence.md',
      'docs/compliance/LEGAL_RULES_RUNTIME_VALIDATION_RUNBOOK.md',
      'docs/compliance/LEGAL_RULES_RUNTIME_CHANGELOG.md',
      'docs/compliance/LEGAL_RULES_RUNTIME_ROLLBACK_PLAN.md',
    ]) {
      expect(readFileSync(resolve(path), 'utf8').length).toBeGreaterThan(500);
    }
  });
});
