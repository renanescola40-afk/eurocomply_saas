#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateFinalRuntimeBundle } from './validate-final-runtime-assurance.mjs';

const root = process.env.FINAL_RUNTIME_ASSURANCE_ROOT || 'artifacts/final-runtime-assurance';
const expectedSha = String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
const report = evaluateFinalRuntimeBundle({ root, expectedSha });
const weightedCoverage = report.results.reduce((sum, item) => {
  const weight = item.workstreamId === 'READINESS-SCORING' ? 8 : 4;
  return sum + (item.state === 'accepted' ? weight : 0);
}, 0);
const summary = {
  ...report,
  promotedRuntimePoints: weightedCoverage,
  projectedRuntimeCoverage: 80 + weightedCoverage,
  remainingHumanReviewPoints: Math.max(0, 20 - weightedCoverage),
  decision: weightedCoverage === 16 ? 'FINAL_RUNTIME_ASSURANCE_GO' : 'FINAL_RUNTIME_ASSURANCE_NO_GO',
};
mkdirSync(root, { recursive: true });
writeFileSync(join(root, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if (!report.passed) process.exitCode = 1;
