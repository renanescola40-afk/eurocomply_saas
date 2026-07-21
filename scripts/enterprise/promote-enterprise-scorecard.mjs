#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const FULL_SHA = /^[a-f0-9]{40}$/;
const VALID_STATUS = new Set(['PASS', 'PARTIAL', 'NOT_VERIFIED', 'BLOCKED', 'FAIL']);
const SENSITIVE_KEY = /(secret|token|password|credential|authorization|cookie|connection.?string|private.?key|signed.?url)/i;

function fail(message) { throw new Error(message); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function hasSensitiveShape(value) {
  if (Array.isArray(value)) return value.some(hasSensitiveShape);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => (SENSITIVE_KEY.test(key) && item !== null && item !== '' && item !== false) || hasSensitiveShape(item));
}
function evidenceFailures(item, targetSha) {
  const failures = [];
  if (!item || typeof item !== 'object') return ['evidence is not an object'];
  if (item.targetSha !== targetSha || item.observedSha !== targetSha) failures.push('exact-SHA provenance mismatch');
  if (item.status !== 'Complete' || item.outcome !== 'passed') failures.push('evidence is not complete/passed');
  if (!item.generatedAt || Number.isNaN(Date.parse(item.generatedAt))) failures.push('invalid generatedAt');
  if (!item.repository || !item.runId) failures.push('repository/run provenance missing');
  if (!Array.isArray(item.controlsVerified) || item.controlsVerified.length === 0) failures.push('controlsVerified missing');
  if (item.evidenceIntegrity?.containsSensitiveValues !== false) failures.push('sensitive-value assertion missing');
  if (hasSensitiveShape(item)) failures.push('sensitive key/value shape detected');
  return failures;
}

export function promote({ scorecard, evidenceManifest, targetSha, generatedAt = new Date().toISOString() }) {
  if (!FULL_SHA.test(targetSha)) fail('targetSha must be a full lowercase Git SHA');
  if (!Array.isArray(scorecard?.controls)) fail('scorecard.controls must be an array');
  if (!Array.isArray(evidenceManifest?.items)) fail('evidenceManifest.items must be an array');
  if (scorecard.controls.length !== 100) fail(`Canonical scorecard must contain exactly 100 controls; found ${scorecard.controls.length}`);

  const ids = [];
  for (const control of scorecard.controls) {
    if (!/^[A-Z0-9][A-Z0-9._-]{1,79}$/.test(String(control?.id ?? ''))) fail(`Invalid control id: ${control?.id}`);
    if (!VALID_STATUS.has(control.status)) fail(`Invalid status for ${control.id}`);
    if (typeof control.critical !== 'boolean') fail(`Control ${control.id} must declare critical`);
    ids.push(control.id);
  }
  if (new Set(ids).size !== ids.length) fail('Duplicate control IDs are forbidden');

  const acceptedByControl = new Map();
  const rejectedEvidence = [];
  for (const item of evidenceManifest.items) {
    const failures = evidenceFailures(item, targetSha);
    if (failures.length) { rejectedEvidence.push({ evidenceItem: item?.evidenceItem ?? 'unknown', failures }); continue; }
    for (const controlId of item.controlsVerified) {
      if (!ids.includes(controlId)) { rejectedEvidence.push({ evidenceItem: item.evidenceItem, failures: [`unknown control ${controlId}`] }); continue; }
      acceptedByControl.set(controlId, [...(acceptedByControl.get(controlId) ?? []), { evidenceItem: item.evidenceItem, runId: String(item.runId), generatedAt: item.generatedAt }]);
    }
  }

  const controls = scorecard.controls.map((control) => {
    const evidence = acceptedByControl.get(control.id) ?? [];
    const status = evidence.length ? 'PASS' : control.status === 'PASS' ? 'NOT_VERIFIED' : control.status;
    return { ...control, status, evidence };
  });
  const counts = controls.reduce((acc, control) => ({ ...acc, [control.status]: (acc[control.status] ?? 0) + 1 }), {});
  const completePercent = counts.PASS ?? 0;
  const criticalOpen = controls.filter((control) => control.critical && control.status !== 'PASS').map((control) => control.id);
  const releaseDecision = completePercent === 100 && criticalOpen.length === 0 && rejectedEvidence.length === 0 ? 'GO' : 'NO_GO';
  const report = { schema: 'risck-comply.enterprise-scorecard-promotion.v1', generatedAt, targetSha, score: { completePercent, remainingPercent: 100 - completePercent }, counts, releaseDecision, criticalOpen, rejectedEvidence, controls };
  return { ...report, integrity: { sha256: createHash('sha256').update(JSON.stringify(stable(report))).digest('hex') } };
}

function args(argv) { const output = {}; for (let index = 0; index < argv.length; index += 2) output[argv[index]?.replace(/^--/, '')] = argv[index + 1]; return output; }
function main() {
  const options = args(process.argv.slice(2));
  if (!options.scorecard || !options.evidence || !options.sha || !options.output) fail('Required: --scorecard --evidence --sha --output');
  const report = promote({ scorecard: JSON.parse(readFileSync(resolve(options.scorecard), 'utf8')), evidenceManifest: JSON.parse(readFileSync(resolve(options.evidence), 'utf8')), targetSha: options.sha });
  const output = resolve(options.output);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ score: report.score, releaseDecision: report.releaseDecision, criticalOpen: report.criticalOpen.length, rejectedEvidence: report.rejectedEvidence.length }));
  if (report.releaseDecision !== 'GO') process.exitCode = 2;
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) main();
