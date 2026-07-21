#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[a-f0-9]{40}$/;
const CONTROL_ID = /^[A-Z0-9][A-Z0-9._-]{1,79}$/;
const VALID_STATUS = new Set(['PASS', 'PARTIAL', 'FAIL', 'BLOCKED', 'NOT_VERIFIED', 'NOT_APPLICABLE']);

function fail(message) {
  throw new Error(message);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function buildScorecardBaselineEvidence({
  scorecard,
  targetSha,
  repository,
  runId,
  generatedAt = new Date().toISOString(),
}) {
  if (!FULL_SHA.test(String(targetSha ?? ''))) fail('targetSha must be a full lowercase Git SHA');
  if (repository !== CANONICAL_REPOSITORY) fail('repository must be the canonical repository');
  if (!/^\d+$/.test(String(runId ?? ''))) fail('runId must be numeric');
  if (scorecard?.schema !== 'risck-comply.enterprise-readiness-scorecard.v1') fail('unsupported scorecard schema');
  if (scorecard?.generatedFromRealEvidence !== true) fail('scorecard must declare generatedFromRealEvidence');
  if (!Array.isArray(scorecard?.controls) || scorecard.controls.length !== 100) {
    fail('scorecard must contain exactly 100 controls');
  }

  const seen = new Set();
  const passControls = [];
  for (const control of scorecard.controls) {
    const id = String(control?.id ?? '');
    if (!CONTROL_ID.test(id)) fail(`invalid control id: ${id || 'missing'}`);
    if (seen.has(id)) fail(`duplicate control id: ${id}`);
    seen.add(id);
    if (typeof control.critical !== 'boolean') fail(`control ${id} must declare critical`);
    if (!VALID_STATUS.has(control.status)) fail(`invalid status for ${id}`);

    if (control.status === 'PASS') {
      if (!String(control.evidencePath ?? '').trim()) fail(`PASS control ${id} is missing evidencePath`);
      const reason = String(control.reason ?? '');
      if (!reason || /(missing|mismatch|invalid|not_verified)/i.test(reason)) {
        fail(`PASS control ${id} has an ineligible evidence reason`);
      }
      passControls.push(id);
    }
  }

  if (passControls.length === 0) fail('baseline scorecard contains no PASS controls');
  const scorePercent = Number(scorecard.scorePercent);
  if (!Number.isFinite(scorePercent) || scorePercent < 0 || scorePercent > 100) fail('invalid scorePercent');
  if (Math.abs(scorePercent - passControls.length) > 0.0001) {
    fail('baseline score must equal the PASS control count for the canonical 100-control model');
  }

  return {
    schema: 'risck-comply.enterprise-scorecard-baseline-evidence.v1',
    evidenceItem: 'canonical-scorecard-baseline',
    status: 'Complete',
    outcome: 'passed',
    generatedAt,
    repository,
    targetSha,
    observedSha: targetSha,
    runId: String(runId),
    controlsVerified: passControls.sort(),
    baseline: {
      completedPercent: scorePercent,
      remainingPercent: Number((100 - scorePercent).toFixed(1)),
      releaseDecision: scorecard.releaseDecision,
      criticalOpen: scorecard.criticalOpen,
    },
    sourceDigests: {
      scorecardSha256: digest(JSON.stringify(stable(scorecard))),
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      exactShaBound: true,
      rawProviderPayloadsStored: false,
      customerDataStored: false,
    },
    evidenceBoundary: 'Promotes only controls already reported PASS by the canonical exact-SHA scorecard. It does not infer runtime, provider, human, legal or external-assurance controls.',
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    options[argv[index]?.replace(/^--/, '')] = argv[index + 1];
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.scorecard || !options.sha || !options.repository || !options.run || !options.output) {
    fail('Required: --scorecard --sha --repository --run --output');
  }
  const scorecard = JSON.parse(readFileSync(resolve(options.scorecard), 'utf8'));
  const evidence = buildScorecardBaselineEvidence({
    scorecard,
    targetSha: options.sha,
    repository: options.repository,
    runId: options.run,
  });
  const output = resolve(options.output);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ controlsVerified: evidence.controlsVerified.length, baseline: evidence.baseline }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
