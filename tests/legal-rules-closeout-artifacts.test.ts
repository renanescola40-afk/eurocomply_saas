import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(path), 'utf8')) as T;
}

describe('legal rules technical closeout artifacts', () => {
  it('keeps the canonical runtime evidence placeholder non-creditable', () => {
    const artifact = readJson<{
      schema: string;
      status: string;
      deploymentSha: string | null;
      countsForRuntimeCoverage: boolean;
      blocker: string;
    }>('docs/security/evidence/runtime/legal-rules-validation.json');

    expect(artifact.schema).toBe('risck-comply.legal-rules-runtime-evidence.v1');
    expect(artifact.status).toBe('NOT_EXECUTED');
    expect(artifact.deploymentSha).toBeNull();
    expect(artifact.countsForRuntimeCoverage).toBe(false);
    expect(artifact.blocker).toContain('exact 40-character SHA');
  });

  it('separates all scorecard dimensions and remains NO_GO without accepted proof', () => {
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
    expect(scorecard.dimensions.runtimeCoverage.acceptedPercent).toBe(0);
    expect(scorecard.dimensions.humanReviewCoverage.acceptedPercent).toBe(0);
    expect(scorecard.overallMaturity).toMatchObject({ percent: 30, status: 'NO_GO' });
    expect(scorecard.scoreBoundary.technicalComplete).toBe(false);
    expect(scorecard.scoreBoundary.customerSpecificCompliance).toBe(false);
  });

  it('keeps consolidated production closeout blocked until one exact SHA passes', () => {
    const closeout = readJson<{
      releaseDecision: string;
      technicalComplete: boolean;
      controls: Array<{ id: string; status: string }>;
      counts: { totalControls: number; exactShaRuntimePass: number; blocked: number; revalidationRequired: number };
    }>('docs/security/evidence/runtime/technical-closeout-consolidated.json');

    expect(closeout.releaseDecision).toBe('NO_GO');
    expect(closeout.technicalComplete).toBe(false);
    expect(closeout.controls).toHaveLength(closeout.counts.totalControls);
    expect(closeout.counts.exactShaRuntimePass).toBe(0);
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
