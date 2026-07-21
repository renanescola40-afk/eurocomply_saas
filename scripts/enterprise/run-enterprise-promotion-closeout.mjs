#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildManifest } from './build-enterprise-evidence-manifest.mjs';
import { buildScorecardBaselineEvidence } from './build-scorecard-baseline-evidence.mjs';
import { promote } from './promote-enterprise-scorecard.mjs';
import { EXPECTED_RUNTIME_LANES, RUNTIME_LANE_CONTRACTS } from './runtime-lane-contracts.mjs';
import { normalizeLaneEvidence } from './runtime-lane-evidence-normalizer.mjs';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[a-f0-9]{40}$/;
const FINAL_COHERENCE_CONTROL = 'REL-10';
const EXPECTED_LANES = EXPECTED_RUNTIME_LANES;

function fail(message) { throw new Error(message); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(value) { return createHash('sha256').update(value).digest('hex'); }

function validateCampaign(campaign, targetSha) {
  if (campaign?.schema_version !== 2) fail('unsupported runtime campaign schema');
  if (campaign.release_sha !== targetSha || campaign.release_branch !== 'main') fail('runtime campaign exact-SHA provenance mismatch');
  if (campaign.decision !== 'READY_FOR_EVIDENCE_PROMOTION') fail('runtime campaign is not ready for evidence promotion');
  if (!Array.isArray(campaign.results) || campaign.results.length !== EXPECTED_LANES.length) fail(`runtime campaign must contain all ${EXPECTED_LANES.length} lanes`);
  const byId = new Map();
  for (const result of campaign.results) {
    const contract = RUNTIME_LANE_CONTRACTS[result?.id];
    if (!contract || byId.has(result.id)) fail(`invalid or duplicate runtime lane: ${result?.id ?? 'missing'}`);
    if (result.workflow !== contract.workflow) fail(`runtime lane ${result.id} workflow mismatch`);
    if (result.status !== 'complete' || result.conclusion !== 'success') fail(`runtime lane ${result.id} is not complete/success`);
    if (!Number.isSafeInteger(result.run_id) || result.run_id <= 0) fail(`runtime lane ${result.id} has an invalid run_id`);
    if (!Number.isSafeInteger(result.artifact_count) || result.artifact_count <= 0) fail(`runtime lane ${result.id} has no retained artifact`);
    if (!Array.isArray(result.artifact_names) || result.artifact_names.length !== result.artifact_count) fail(`runtime lane ${result.id} artifact inventory mismatch`);
    if (!result.artifact_names.every((name) => String(name).startsWith(contract.artifactPrefix))) fail(`runtime lane ${result.id} artifact prefix mismatch`);
    byId.set(result.id, result);
  }
  for (const lane of EXPECTED_LANES) if (!byId.has(lane)) fail(`runtime lane ${lane} is missing`);
  return byId;
}

async function stageLaneEvidence({ runtimeRoot, stagingRoot, lane, campaignResult, targetSha, repository, generatedAt }) {
  const normalized = await normalizeLaneEvidence({ runtimeRoot, lane, campaignResult, targetSha, repository, generatedAt });
  const destination = path.join(stagingRoot, lane.toLowerCase());
  await mkdir(destination, { recursive: true });
  await writeFile(path.join(destination, '001.json'), `${JSON.stringify(normalized, null, 2)}\n`, { mode: 0o600 });
  return 1;
}

export function buildFinalCoherenceEvidence({ preliminaryPromotion, targetSha, repository, workflowRunId, generatedAt }) {
  const openControls = preliminaryPromotion.controls.filter((control) => control.status !== 'PASS').map((control) => control.id);
  const eligible = preliminaryPromotion.rejectedEvidence.length === 0
    && preliminaryPromotion.score.completePercent === 99
    && openControls.length === 1
    && openControls[0] === FINAL_COHERENCE_CONTROL;
  if (!eligible) return null;
  return {
    schema: 'risck-comply.final-evidence-coherence.v1',
    evidenceItem: 'final-evidence-bundle-coherence',
    status: 'Complete',
    outcome: 'passed',
    generatedAt,
    repository,
    branch: 'main',
    targetSha,
    observedSha: targetSha,
    runId: String(workflowRunId),
    controlsVerified: [FINAL_COHERENCE_CONTROL],
    checks: {
      preliminaryScoreIsNinetyNine: true,
      onlyCoherenceControlOpen: true,
      rejectedEvidenceCountIsZero: true,
      allRequiredLanesAccepted: true,
      exactShaBound: true,
    },
    preliminaryPromotionSha256: preliminaryPromotion.integrity.sha256,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawEvidenceStored: false,
      customerDataStored: false,
      exactShaBound: true,
      selfPromotionRestrictedToRel10: true,
    },
    evidenceBoundary: 'REL-10 is promoted only after the deterministic manifest has accepted every other control for the exact SHA with zero rejected evidence. This evidence cannot promote any other control.',
  };
}

export async function runPromotionCloseout({ campaign, scorecard, runtimeRoot, stagingRoot, targetSha, repository, workflowRunId, generatedAt = new Date().toISOString() }) {
  if (!FULL_SHA.test(String(targetSha ?? ''))) fail('targetSha must be a full lowercase Git SHA');
  if (repository !== CANONICAL_REPOSITORY) fail('repository must be canonical');
  if (!/^\d+$/.test(String(workflowRunId ?? ''))) fail('workflowRunId must be numeric');
  const campaignsById = validateCampaign(campaign, targetSha);
  await rm(stagingRoot, { recursive: true, force: true });
  await mkdir(path.join(stagingRoot, 'baseline'), { recursive: true });
  const baselineEvidence = buildScorecardBaselineEvidence({ scorecard, targetSha, repository, runId: workflowRunId, generatedAt });
  await writeFile(path.join(stagingRoot, 'baseline', 'canonical-scorecard-baseline.json'), `${JSON.stringify(baselineEvidence, null, 2)}\n`, { mode: 0o600 });
  const laneEvidenceCounts = {};
  for (const lane of EXPECTED_LANES) {
    laneEvidenceCounts[lane] = await stageLaneEvidence({ runtimeRoot, stagingRoot, lane, campaignResult: campaignsById.get(lane), targetSha, repository, generatedAt });
  }

  let manifest = buildManifest({ root: stagingRoot, targetSha, repository, generatedAt });
  if (manifest.summary.decision !== 'READY_FOR_PROMOTION') fail('assembled evidence manifest is not ready for promotion');
  const preliminaryPromotion = promote({ scorecard, evidenceManifest: manifest, targetSha, generatedAt });
  const coherenceEvidence = buildFinalCoherenceEvidence({ preliminaryPromotion, targetSha, repository, workflowRunId, generatedAt });
  if (coherenceEvidence) {
    const finalization = path.join(stagingRoot, 'finalization');
    await mkdir(finalization, { recursive: true });
    await writeFile(path.join(finalization, 'final-evidence-coherence.json'), `${JSON.stringify(coherenceEvidence, null, 2)}\n`, { mode: 0o600 });
    manifest = buildManifest({ root: stagingRoot, targetSha, repository, generatedAt });
  }
  const promotion = promote({ scorecard, evidenceManifest: manifest, targetSha, generatedAt });
  const closeout = {
    schema: 'risck-comply.enterprise-promotion-closeout.v3',
    generatedAt,
    repository,
    targetSha,
    workflowRunId: String(workflowRunId),
    runtimeCampaignDecision: campaign.decision,
    evidenceManifestDecision: manifest.summary.decision,
    baseline: baselineEvidence.baseline,
    preliminary: preliminaryPromotion.score,
    coherencePromoted: Boolean(coherenceEvidence),
    promoted: promotion.score,
    promotedDeltaPercent: Number((promotion.score.completePercent - baselineEvidence.baseline.completedPercent).toFixed(1)),
    releaseDecision: promotion.releaseDecision,
    criticalOpen: promotion.criticalOpen,
    rejectedEvidence: promotion.rejectedEvidence.length,
    laneEvidenceCounts,
    integrity: {
      campaignSha256: digest(JSON.stringify(stable(campaign))),
      scorecardSha256: baselineEvidence.sourceDigests.scorecardSha256,
      preliminaryPromotionSha256: preliminaryPromotion.integrity.sha256,
      manifestSha256: manifest.integrity.sha256,
      promotionSha256: promotion.integrity.sha256,
    },
    evidenceBoundary: 'This closeout promotes exact-SHA repository, provider, storage, security-event, recovery and independently reviewed assurance evidence. REL-10 is generated only when all other 99 controls pass with zero rejected evidence.',
  };
  return { manifest, preliminaryPromotion, promotion, coherenceEvidence, closeout };
}

function parseArgs(argv) { const options = {}; for (let index = 0; index < argv.length; index += 2) options[argv[index]?.replace(/^--/, '')] = argv[index + 1]; return options; }
async function main() {
  const options = parseArgs(process.argv.slice(2));
  const required = ['campaign', 'scorecard', 'runtime-root', 'staging-root', 'sha', 'repository', 'run', 'manifest-output', 'promotion-output', 'closeout-output'];
  for (const key of required) if (!options[key]) fail(`missing --${key}`);
  const closeoutOutput = path.resolve(options['closeout-output']);
  try {
    const campaign = JSON.parse(await readFile(path.resolve(options.campaign), 'utf8'));
    const scorecard = JSON.parse(await readFile(path.resolve(options.scorecard), 'utf8'));
    const result = await runPromotionCloseout({ campaign, scorecard, runtimeRoot: path.resolve(options['runtime-root']), stagingRoot: path.resolve(options['staging-root']), targetSha: options.sha, repository: options.repository, workflowRunId: options.run });
    for (const [outputPath, document] of [[options['manifest-output'], result.manifest], [options['promotion-output'], result.promotion], [options['closeout-output'], result.closeout]]) {
      const absolute = path.resolve(outputPath); await mkdir(path.dirname(absolute), { recursive: true }); await writeFile(absolute, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 });
    }
    console.log(JSON.stringify({ baseline: result.closeout.baseline, preliminary: result.closeout.preliminary, promoted: result.closeout.promoted, coherencePromoted: result.closeout.coherencePromoted, releaseDecision: result.closeout.releaseDecision }));
    if (result.closeout.releaseDecision !== 'GO') process.exitCode = 2;
  } catch (error) {
    const failure = error instanceof Error ? error.message.slice(0, 300) : 'unknown_error';
    await mkdir(path.dirname(closeoutOutput), { recursive: true });
    await writeFile(closeoutOutput, `${JSON.stringify({ schema: 'risck-comply.enterprise-promotion-closeout.v3', generatedAt: new Date().toISOString(), repository: options.repository ?? null, targetSha: options.sha ?? null, releaseDecision: 'NO_GO', failures: [failure], evidenceIntegrity: { containsSensitiveValues: false } }, null, 2)}\n`, { mode: 0o600 });
    console.error(failure); process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
