#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const input = process.argv[2] || 'artifacts/enterprise-readiness/enterprise-readiness-scorecard.json';
const output = process.argv[3] || 'artifacts/enterprise-readiness/enterprise-closeout-plan.json';
const scorecard = JSON.parse(readFileSync(input, 'utf8'));

if (!Array.isArray(scorecard.controls)) {
  throw new Error('Enterprise scorecard must contain a controls array');
}

const rank = { FAIL: 0, BLOCKED: 1, NOT_VERIFIED: 2, PARTIAL: 3, PASS: 9, NOT_APPLICABLE: 10 };
const openControls = scorecard.controls
  .filter((control) => !['PASS', 'NOT_APPLICABLE'].includes(control.status))
  .map((control) => ({
    id: control.id,
    domain: control.domain,
    title: control.title,
    status: control.status,
    critical: Boolean(control.critical),
    evidencePath: control.evidencePath || null,
    evidenceCheck: control.evidenceCheck || null,
    reason: control.reason || null,
    nextAction: control.status === 'FAIL'
      ? 'fix_failed_control_and_regenerate_exact_sha_evidence'
      : control.status === 'BLOCKED'
        ? 'remove_runtime_or_configuration_blocker'
        : control.status === 'PARTIAL'
          ? 'complete_partial_control_and_revalidate'
          : 'execute_or_import_required_evidence',
  }))
  .sort((a, b) => Number(b.critical) - Number(a.critical) || (rank[a.status] ?? 8) - (rank[b.status] ?? 8) || a.id.localeCompare(b.id));

const current = Number(scorecard.scorePercent ?? scorecard.completedPercent ?? 0);
const plan = {
  schema: 'risck-comply.enterprise-closeout-plan.v1',
  generatedAt: new Date().toISOString(),
  currentScorePercent: current,
  remainingPercent: Number(Math.max(0, 100 - current).toFixed(1)),
  releaseDecision: scorecard.releaseDecision || 'NO_GO',
  criticalOpen: openControls.filter((control) => control.critical).length,
  openControlCount: openControls.length,
  openControls,
  acceptanceGate: {
    scorePercent: 100,
    criticalOpen: 0,
    releaseDecision: 'GO',
    exactShaEvidenceRequired: true,
    runtimeEvidenceRequired: true,
    independentEvidenceRequiredWhereApplicable: true,
  },
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(plan, null, 2)}\n`);
console.log(`${plan.currentScorePercent}% complete / ${plan.remainingPercent}% remaining; ${plan.openControlCount} controls open.`);
if (plan.openControlCount > 0) process.exitCode = 2;
