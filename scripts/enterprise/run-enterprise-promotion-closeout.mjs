#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildManifest } from './build-enterprise-evidence-manifest.mjs';
import { buildScorecardBaselineEvidence } from './build-scorecard-baseline-evidence.mjs';
import { promote } from './promote-enterprise-scorecard.mjs';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[a-f0-9]{40}$/;
const MAX_FILES = 500;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const SENSITIVE_KEY = /(secret|token|password|credential|authorization|cookie|connection.?string|private.?key|signed.?url|database.?url)/i;
const EXPECTED_LANES = [
  'IAM-RBAC',
  'IAM-LIFECYCLE',
  'TEN-RLS',
  'PLATFORM',
  'DATA',
  'INCIDENT',
  'TRUST',
  'RECOVERY',
  'PRODUCTION',
  'STEP-UP',
];

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

function hasSensitiveShape(value) {
  if (Array.isArray(value)) return value.some(hasSensitiveShape);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => (
    (SENSITIVE_KEY.test(key) && item !== null && item !== '' && item !== false)
    || hasSensitiveShape(item)
  ));
}

async function walkJson(root, current = root, files = []) {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const entryPath = path.resolve(current, entry.name);
    if (entry.isDirectory()) await walkJson(root, entryPath, files);
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(entryPath);
    if (files.length > MAX_FILES) fail(`runtime evidence inventory exceeds ${MAX_FILES} JSON files`);
  }
  return files;
}

async function readBoundedJson(filePath) {
  const raw = await readFile(filePath);
  if (raw.byteLength === 0 || raw.byteLength > MAX_FILE_BYTES) fail(`evidence file size is invalid: ${path.basename(filePath)}`);
  return JSON.parse(raw.toString('utf8'));
}

function validateCampaign(campaign, targetSha) {
  if (campaign?.schema_version !== 1) fail('unsupported runtime campaign schema');
  if (campaign.release_sha !== targetSha || campaign.release_branch !== 'main') fail('runtime campaign exact-SHA provenance mismatch');
  if (campaign.decision !== 'READY_FOR_EVIDENCE_PROMOTION') fail('runtime campaign is not ready for evidence promotion');
  if (!Array.isArray(campaign.results) || campaign.results.length !== EXPECTED_LANES.length) fail('runtime campaign must contain all ten lanes');

  const byId = new Map();
  for (const result of campaign.results) {
    if (!EXPECTED_LANES.includes(result?.id) || byId.has(result.id)) fail(`invalid or duplicate runtime lane: ${result?.id ?? 'missing'}`);
    if (result.status !== 'complete' || result.conclusion !== 'success') fail(`runtime lane ${result.id} is not complete/success`);
    if (!Number.isSafeInteger(result.run_id) || result.run_id <= 0) fail(`runtime lane ${result.id} has an invalid run_id`);
    if (!Number.isSafeInteger(result.artifact_count) || result.artifact_count <= 0) fail(`runtime lane ${result.id} has no retained artifact`);
    byId.set(result.id, result);
  }
  for (const lane of EXPECTED_LANES) if (!byId.has(lane)) fail(`runtime lane ${lane} is missing`);
  return byId;
}

function sanitizeRuntimeEvidence(document, { targetSha, repository, expectedRunId, lane }) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) return null;
  if (!Array.isArray(document.controlsVerified) || document.controlsVerified.length === 0) return null;
  if (hasSensitiveShape(document)) fail(`runtime lane ${lane} contains secret-shaped evidence metadata`);

  const runId = String(document.runId ?? document.githubRunId ?? '').trim();
  if (runId !== String(expectedRunId)) fail(`runtime lane ${lane} evidence run ID mismatch`);
  if (document.targetSha !== targetSha || document.observedSha !== targetSha) fail(`runtime lane ${lane} evidence SHA mismatch`);
  if (document.repository !== repository) fail(`runtime lane ${lane} evidence repository mismatch`);
  if (document.status !== 'Complete' || document.outcome !== 'passed') fail(`runtime lane ${lane} evidence is not Complete/passed`);
  if (!document.generatedAt || Number.isNaN(Date.parse(document.generatedAt))) fail(`runtime lane ${lane} evidence generatedAt is invalid`);
  if (document.evidenceIntegrity?.containsSensitiveValues !== false) fail(`runtime lane ${lane} evidence sensitive-value assertion is missing`);

  const evidenceItem = String(document.evidenceItem ?? document.schema ?? '').trim();
  if (!evidenceItem) fail(`runtime lane ${lane} evidenceItem is missing`);
  const controlsVerified = [...new Set(document.controlsVerified.map(String).map((value) => value.trim()).filter(Boolean))].sort();
  if (controlsVerified.length === 0) fail(`runtime lane ${lane} controlsVerified is empty`);

  return {
    evidenceItem,
    status: 'Complete',
    outcome: 'passed',
    generatedAt: document.generatedAt,
    repository,
    targetSha,
    observedSha: targetSha,
    runId,
    controlsVerified,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      exactShaBound: true,
      rawProviderPayloadsStored: false,
      customerDataStored: false,
    },
    sourceDigest: digest(JSON.stringify(stable(document))),
    evidenceBoundary: String(document.evidenceBoundary ?? document.limitations?.[0] ?? 'Scorecard-readable runtime evidence only.'),
  };
}

async function stageLaneEvidence({ runtimeRoot, stagingRoot, lane, campaignResult, targetSha, repository }) {
  const laneRoot = path.join(runtimeRoot, lane.toLowerCase());
  let files;
  try {
    files = await walkJson(laneRoot);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') fail(`runtime lane ${lane} artifact directory is missing`);
    throw error;
  }

  const accepted = [];
  for (const filePath of files.sort()) {
    let parsed;
    try {
      parsed = await readBoundedJson(filePath);
    } catch {
      fail(`runtime lane ${lane} contains invalid JSON evidence`);
    }
    const documents = Array.isArray(parsed) ? parsed : [parsed];
    for (const document of documents) {
      const sanitized = sanitizeRuntimeEvidence(document, {
        targetSha,
        repository,
        expectedRunId: campaignResult.run_id,
        lane,
      });
      if (sanitized) accepted.push(sanitized);
    }
  }

  if (accepted.length === 0) fail(`runtime lane ${lane} has no scorecard-readable evidence`);
  const destination = path.join(stagingRoot, lane.toLowerCase());
  await mkdir(destination, { recursive: true });
  for (const [index, evidence] of accepted.entries()) {
    await writeFile(path.join(destination, `${String(index + 1).padStart(3, '0')}.json`), `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  }
  return accepted.length;
}

export async function runPromotionCloseout({
  campaign,
  scorecard,
  runtimeRoot,
  stagingRoot,
  targetSha,
  repository,
  workflowRunId,
  generatedAt = new Date().toISOString(),
}) {
  if (!FULL_SHA.test(String(targetSha ?? ''))) fail('targetSha must be a full lowercase Git SHA');
  if (repository !== CANONICAL_REPOSITORY) fail('repository must be canonical');
  if (!/^\d+$/.test(String(workflowRunId ?? ''))) fail('workflowRunId must be numeric');
  const campaignsById = validateCampaign(campaign, targetSha);

  await rm(stagingRoot, { recursive: true, force: true });
  await mkdir(path.join(stagingRoot, 'baseline'), { recursive: true });
  const baselineEvidence = buildScorecardBaselineEvidence({
    scorecard,
    targetSha,
    repository,
    runId: workflowRunId,
    generatedAt,
  });
  await writeFile(
    path.join(stagingRoot, 'baseline', 'canonical-scorecard-baseline.json'),
    `${JSON.stringify(baselineEvidence, null, 2)}\n`,
    { mode: 0o600 },
  );

  const laneEvidenceCounts = {};
  for (const lane of EXPECTED_LANES) {
    laneEvidenceCounts[lane] = await stageLaneEvidence({
      runtimeRoot,
      stagingRoot,
      lane,
      campaignResult: campaignsById.get(lane),
      targetSha,
      repository,
    });
  }

  const manifest = buildManifest({ root: stagingRoot, targetSha, repository, generatedAt });
  if (manifest.summary.decision !== 'READY_FOR_PROMOTION') fail('assembled evidence manifest is not ready for promotion');
  const promotion = promote({ scorecard, evidenceManifest: manifest, targetSha, generatedAt });
  const closeout = {
    schema: 'risck-comply.enterprise-promotion-closeout.v1',
    generatedAt,
    repository,
    targetSha,
    workflowRunId: String(workflowRunId),
    runtimeCampaignDecision: campaign.decision,
    evidenceManifestDecision: manifest.summary.decision,
    baseline: baselineEvidence.baseline,
    promoted: promotion.score,
    promotedDeltaPercent: Number((promotion.score.completePercent - baselineEvidence.baseline.completedPercent).toFixed(1)),
    releaseDecision: promotion.releaseDecision,
    criticalOpen: promotion.criticalOpen,
    rejectedEvidence: promotion.rejectedEvidence.length,
    laneEvidenceCounts,
    integrity: {
      campaignSha256: digest(JSON.stringify(stable(campaign))),
      scorecardSha256: baselineEvidence.sourceDigests.scorecardSha256,
      manifestSha256: manifest.integrity.sha256,
      promotionSha256: promotion.integrity.sha256,
    },
    evidenceBoundary: 'This closeout promotes only exact-SHA repository and runtime evidence. Human acceptance, legal review, external assurance and customer interoperability remain separate controls unless represented by independently accepted evidence.',
  };
  return { manifest, promotion, closeout };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) options[argv[index]?.replace(/^--/, '')] = argv[index + 1];
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const required = ['campaign', 'scorecard', 'runtime-root', 'staging-root', 'sha', 'repository', 'run', 'manifest-output', 'promotion-output', 'closeout-output'];
  for (const key of required) if (!options[key]) fail(`missing --${key}`);

  const closeoutOutput = path.resolve(options['closeout-output']);
  try {
    const campaign = JSON.parse(await readFile(path.resolve(options.campaign), 'utf8'));
    const scorecard = JSON.parse(await readFile(path.resolve(options.scorecard), 'utf8'));
    const result = await runPromotionCloseout({
      campaign,
      scorecard,
      runtimeRoot: path.resolve(options['runtime-root']),
      stagingRoot: path.resolve(options['staging-root']),
      targetSha: options.sha,
      repository: options.repository,
      workflowRunId: options.run,
    });
    const outputs = [
      [options['manifest-output'], result.manifest],
      [options['promotion-output'], result.promotion],
      [options['closeout-output'], result.closeout],
    ];
    for (const [outputPath, document] of outputs) {
      const absolute = path.resolve(outputPath);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 });
    }
    console.log(JSON.stringify({ baseline: result.closeout.baseline, promoted: result.closeout.promoted, releaseDecision: result.closeout.releaseDecision }));
    if (result.closeout.releaseDecision !== 'GO') process.exitCode = 2;
  } catch (error) {
    const failure = error instanceof Error ? error.message.slice(0, 300) : 'unknown_error';
    await mkdir(path.dirname(closeoutOutput), { recursive: true });
    await writeFile(closeoutOutput, `${JSON.stringify({
      schema: 'risck-comply.enterprise-promotion-closeout.v1',
      generatedAt: new Date().toISOString(),
      repository: options.repository ?? null,
      targetSha: options.sha ?? null,
      releaseDecision: 'NO_GO',
      failures: [failure],
      evidenceIntegrity: { containsSensitiveValues: false },
    }, null, 2)}\n`, { mode: 0o600 });
    console.error(failure);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
