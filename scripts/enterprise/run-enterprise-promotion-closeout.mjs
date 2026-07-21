#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildManifest } from './build-enterprise-evidence-manifest.mjs';
import { buildScorecardBaselineEvidence } from './build-scorecard-baseline-evidence.mjs';
import { promote } from './promote-enterprise-scorecard.mjs';
import { RUNTIME_LANE_CONTRACTS } from './runtime-lane-contracts.mjs';
import { normalizeLaneEvidence } from './runtime-lane-evidence-normalizer.mjs';
import {
  FULL_RUNTIME_PROFILE,
  PARTIAL_SAFE_PROMOTION_DECISION,
  SAFE_PROMOTION_DECISION,
  allowedPromotionDecisionsForProfile,
  expectedLanesForProfile,
  profileAllowsIncrementalPromotion,
  resolveRuntimeCampaignProfile,
} from './runtime-campaign-profiles.mjs';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[a-f0-9]{40}$/;
const FINAL_COHERENCE_CONTROL = 'REL-10';
const SAFE_CLOSEOUT_DECISIONS = Object.freeze(['SAFE_EVIDENCE_PROMOTED', 'PARTIAL_SAFE_EVIDENCE_PROMOTED']);

function fail(message) { throw new Error(message); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(value) { return createHash('sha256').update(value).digest('hex'); }

function validateCompleteLane(result, contract) {
  if (result.conclusion !== 'success') fail(`runtime lane ${result.id} is complete without success`);
  if (!Number.isSafeInteger(result.run_id) || result.run_id <= 0) fail(`runtime lane ${result.id} has an invalid run_id`);
  if (!Number.isSafeInteger(result.artifact_count) || result.artifact_count <= 0) fail(`runtime lane ${result.id} has no retained artifact`);
  if (!Array.isArray(result.artifact_names) || result.artifact_names.length !== result.artifact_count) fail(`runtime lane ${result.id} artifact inventory mismatch`);
  if (!result.artifact_names.every((name) => String(name).startsWith(contract.artifactPrefix))) fail(`runtime lane ${result.id} artifact prefix mismatch`);
}

function validateBlockedLane(result, contract) {
  if (result.status !== 'blocked') fail(`runtime lane ${result.id} has an unsupported non-complete status`);
  if (result.run_id !== null && (!Number.isSafeInteger(result.run_id) || result.run_id <= 0)) fail(`runtime lane ${result.id} has an invalid blocked run_id`);
  if (!Number.isSafeInteger(result.artifact_count) || result.artifact_count < 0) fail(`runtime lane ${result.id} has an invalid blocked artifact count`);
  if (!Array.isArray(result.artifact_names) || result.artifact_names.length !== result.artifact_count) fail(`runtime lane ${result.id} blocked artifact inventory mismatch`);
  if (!result.artifact_names.every((name) => String(name).startsWith(contract.artifactPrefix))) fail(`runtime lane ${result.id} blocked artifact prefix mismatch`);
  if (typeof result.reason !== 'string' || result.reason.length === 0 || result.reason.length > 240) fail(`runtime lane ${result.id} blocked reason is invalid`);
}

function validateCampaign(campaign, targetSha, profile) {
  const expectedLanes = expectedLanesForProfile(profile);
  const allowedDecisions = allowedPromotionDecisionsForProfile(profile);
  const incremental = profileAllowsIncrementalPromotion(profile);
  if (campaign?.schema_version !== 2) fail('unsupported runtime campaign schema');
  if (campaign.profile !== profile) fail('runtime campaign profile mismatch');
  if (campaign.release_sha !== targetSha || campaign.release_branch !== 'main') fail('runtime campaign exact-SHA provenance mismatch');
  if (!allowedDecisions.includes(campaign.decision)) fail(`runtime campaign is not ready for ${profile} evidence promotion`);
  if (!Array.isArray(campaign.results) || campaign.results.length !== expectedLanes.length) {
    fail(`runtime campaign must contain all ${expectedLanes.length} ${profile} lanes`);
  }
  const byId = new Map();
  const promotableLanes = [];
  const blockedLanes = [];
  for (const result of campaign.results) {
    const contract = RUNTIME_LANE_CONTRACTS[result?.id];
    if (!contract || byId.has(result.id)) fail(`invalid or duplicate runtime lane: ${result?.id ?? 'missing'}`);
    if (!expectedLanes.includes(result.id)) fail(`runtime lane ${result.id} is outside the ${profile} profile`);
    if (result.workflow !== contract.workflow) fail(`runtime lane ${result.id} workflow mismatch`);
    if (result.status === 'complete') {
      validateCompleteLane(result, contract);
      promotableLanes.push(result.id);
    } else {
      if (!incremental) fail(`runtime lane ${result.id} is not complete/success`);
      validateBlockedLane(result, contract);
      blockedLanes.push(result.id);
    }
    byId.set(result.id, result);
  }
  for (const lane of expectedLanes) if (!byId.has(lane)) fail(`runtime lane ${lane} is missing`);
  if (promotableLanes.length === 0) fail('runtime campaign contains no promotable lane');
  if (campaign.decision === SAFE_PROMOTION_DECISION && blockedLanes.length !== 0) fail('complete safe decision cannot contain blocked lanes');
  if (campaign.decision === PARTIAL_SAFE_PROMOTION_DECISION
    && (blockedLanes.length === 0 || promotableLanes.length === expectedLanes.length)) {
    fail('partial safe decision must contain both complete and blocked lanes');
  }
  return { byId, expectedLanes, promotableLanes, blockedLanes };
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

export async function runPromotionCloseout({ campaign, scorecard, runtimeRoot, stagingRoot, targetSha, repository, workflowRunId, profile = FULL_RUNTIME_PROFILE, generatedAt = new Date().toISOString() }) {
  const resolvedProfile = resolveRuntimeCampaignProfile(profile);
  if (!FULL_SHA.test(String(targetSha ?? ''))) fail('targetSha must be a full lowercase Git SHA');
  if (repository !== CANONICAL_REPOSITORY) fail('repository must be canonical');
  if (!/^\d+$/.test(String(workflowRunId ?? ''))) fail('workflowRunId must be numeric');
  const {
    byId: campaignsById,
    expectedLanes,
    promotableLanes,
    blockedLanes,
  } = validateCampaign(campaign, targetSha, resolvedProfile);
  await rm(stagingRoot, { recursive: true, force: true });
  await mkdir(path.join(stagingRoot, 'baseline'), { recursive: true });
  const baselineEvidence = buildScorecardBaselineEvidence({ scorecard, targetSha, repository, runId: workflowRunId, generatedAt });
  await writeFile(path.join(stagingRoot, 'baseline', 'canonical-scorecard-baseline.json'), `${JSON.stringify(baselineEvidence, null, 2)}\n`, { mode: 0o600 });
  const laneEvidenceCounts = Object.fromEntries(expectedLanes.map((lane) => [lane, 0]));
  for (const lane of promotableLanes) {
    laneEvidenceCounts[lane] = await stageLaneEvidence({ runtimeRoot, stagingRoot, lane, campaignResult: campaignsById.get(lane), targetSha, repository, generatedAt });
  }

  let manifest = buildManifest({ root: stagingRoot, targetSha, repository, generatedAt });
  if (manifest.summary.decision !== 'READY_FOR_PROMOTION') fail('assembled evidence manifest is not ready for promotion');
  const preliminaryPromotion = promote({ scorecard, evidenceManifest: manifest, targetSha, generatedAt });
  const coherenceEvidence = resolvedProfile === FULL_RUNTIME_PROFILE
    ? buildFinalCoherenceEvidence({ preliminaryPromotion, targetSha, repository, workflowRunId, generatedAt })
    : null;
  if (coherenceEvidence) {
    const finalization = path.join(stagingRoot, 'finalization');
    await mkdir(finalization, { recursive: true });
    await writeFile(path.join(finalization, 'final-evidence-coherence.json'), `${JSON.stringify(coherenceEvidence, null, 2)}\n`, { mode: 0o600 });
    manifest = buildManifest({ root: stagingRoot, targetSha, repository, generatedAt });
  }
  const promotion = promote({ scorecard, evidenceManifest: manifest, targetSha, generatedAt });
  if (resolvedProfile !== FULL_RUNTIME_PROFILE && coherenceEvidence) fail('safe promotion must never generate final coherence evidence');
  const closeoutDecision = resolvedProfile === FULL_RUNTIME_PROFILE
    ? promotion.releaseDecision
    : (promotion.rejectedEvidence.length === 0
      ? (blockedLanes.length === 0 ? 'SAFE_EVIDENCE_PROMOTED' : 'PARTIAL_SAFE_EVIDENCE_PROMOTED')
      : 'NO_GO');
  const closeout = {
    schema: 'risck-comply.enterprise-promotion-closeout.v5',
    generatedAt,
    repository,
    targetSha,
    workflowRunId: String(workflowRunId),
    profile: resolvedProfile,
    runtimeCampaignDecision: campaign.decision,
    evidenceManifestDecision: manifest.summary.decision,
    baseline: baselineEvidence.baseline,
    preliminary: preliminaryPromotion.score,
    coherencePromoted: Boolean(coherenceEvidence),
    promoted: promotion.score,
    promotedDeltaPercent: Number((promotion.score.completePercent - baselineEvidence.baseline.completedPercent).toFixed(1)),
    closeoutDecision,
    releaseDecision: promotion.releaseDecision,
    criticalOpen: promotion.criticalOpen,
    rejectedEvidence: promotion.rejectedEvidence.length,
    profileLaneCount: expectedLanes.length,
    promotedLaneCount: promotableLanes.length,
    promotedLanes: promotableLanes,
    blockedLaneCount: blockedLanes.length,
    blockedLanes,
    laneEvidenceCounts,
    integrity: {
      campaignSha256: digest(JSON.stringify(stable(campaign))),
      scorecardSha256: baselineEvidence.sourceDigests.scorecardSha256,
      preliminaryPromotionSha256: preliminaryPromotion.integrity.sha256,
      manifestSha256: manifest.integrity.sha256,
      promotionSha256: promotion.integrity.sha256,
    },
    evidenceBoundary: resolvedProfile === FULL_RUNTIME_PROFILE
      ? 'This closeout promotes exact-SHA repository, provider, storage, security-event, recovery and independently reviewed assurance evidence. REL-10 is generated only when all other 99 controls pass with zero rejected evidence.'
      : 'This safe closeout promotes only accepted exact-SHA evidence from completed non-destructive runtime lanes. Blocked lanes remain open. Recovery, external assurance and REL-10 remain excluded and cannot be inferred or self-promoted.',
  };
  return { manifest, preliminaryPromotion, promotion, coherenceEvidence, closeout };
}

function parseArgs(argv) { const options = {}; for (let index = 0; index < argv.length; index += 2) options[argv[index]?.replace(/^--/, '')] = argv[index + 1]; return options; }
async function main() {
  const options = parseArgs(process.argv.slice(2));
  const required = ['campaign', 'scorecard', 'runtime-root', 'staging-root', 'sha', 'repository', 'run', 'manifest-output', 'promotion-output', 'closeout-output'];
  for (const key of required) if (!options[key]) fail(`missing --${key}`);
  const profile = resolveRuntimeCampaignProfile(options.profile || FULL_RUNTIME_PROFILE);
  const closeoutOutput = path.resolve(options['closeout-output']);
  try {
    const campaign = JSON.parse(await readFile(path.resolve(options.campaign), 'utf8'));
    const scorecard = JSON.parse(await readFile(path.resolve(options.scorecard), 'utf8'));
    const result = await runPromotionCloseout({ campaign, scorecard, runtimeRoot: path.resolve(options['runtime-root']), stagingRoot: path.resolve(options['staging-root']), targetSha: options.sha, repository: options.repository, workflowRunId: options.run, profile });
    for (const [outputPath, document] of [[options['manifest-output'], result.manifest], [options['promotion-output'], result.promotion], [options['closeout-output'], result.closeout]]) {
      const absolute = path.resolve(outputPath); await mkdir(path.dirname(absolute), { recursive: true }); await writeFile(absolute, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 });
    }
    console.log(JSON.stringify({ profile, baseline: result.closeout.baseline, preliminary: result.closeout.preliminary, promoted: result.closeout.promoted, promotedLanes: result.closeout.promotedLanes, blockedLanes: result.closeout.blockedLanes, coherencePromoted: result.closeout.coherencePromoted, closeoutDecision: result.closeout.closeoutDecision, releaseDecision: result.closeout.releaseDecision }));
    if (profile === FULL_RUNTIME_PROFILE && result.closeout.releaseDecision !== 'GO') process.exitCode = 2;
    if (profile !== FULL_RUNTIME_PROFILE && !SAFE_CLOSEOUT_DECISIONS.includes(result.closeout.closeoutDecision)) process.exitCode = 2;
  } catch (error) {
    const failure = error instanceof Error ? error.message.slice(0, 300) : 'unknown_error';
    await mkdir(path.dirname(closeoutOutput), { recursive: true });
    await writeFile(closeoutOutput, `${JSON.stringify({ schema: 'risck-comply.enterprise-promotion-closeout.v5', generatedAt: new Date().toISOString(), repository: options.repository ?? null, targetSha: options.sha ?? null, profile, closeoutDecision: 'NO_GO', releaseDecision: 'NO_GO', failures: [failure], evidenceIntegrity: { containsSensitiveValues: false } }, null, 2)}\n`, { mode: 0o600 });
    console.error(failure); process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
