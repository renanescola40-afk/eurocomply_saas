import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { RUNTIME_LANE_CONTRACTS } from './runtime-lane-contracts.mjs';

const MAX_FILES = 500;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const SENSITIVE_KEY = /(secret|token|password|credential|authorization|cookie|connection.?string|private.?key|signed.?url|database.?url)/i;
const SAFE_LABEL_MAP_KEYS = new Set(['accepted_status_check_aliases', 'matchedRequiredChecks']);

function fail(message) {
  throw new Error(message);
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isStringArrayMap(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.values(value).every((aliases) => (
      Array.isArray(aliases)
      && aliases.every((alias) => typeof alias === 'string')
    ));
}

function hasSensitiveShape(value) {
  if (Array.isArray(value)) return value.some(hasSensitiveShape);
  if (!value || typeof value !== 'object') return false;

  return Object.entries(value).some(([key, item]) => {
    // These two fields are trusted metadata maps whose object keys are human-readable
    // GitHub status-check labels. Some valid labels contain words such as "Secret" or
    // "token" and must not be mistaken for credential field names. The exception is
    // deliberately narrow: values must remain a flat map of string arrays. Any nested
    // object or non-string-array value falls back to the fail-closed sensitive scan.
    if (SAFE_LABEL_MAP_KEYS.has(key) && isStringArrayMap(item)) return false;

    return (SENSITIVE_KEY.test(key) && item !== null && item !== '' && item !== false)
      || hasSensitiveShape(item);
  });
}

async function walkJson(root, current = root, files = []) {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const filePath = path.resolve(current, entry.name);
    if (entry.isDirectory()) await walkJson(root, filePath, files);
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(filePath);
    if (files.length > MAX_FILES) fail(`runtime evidence inventory exceeds ${MAX_FILES} JSON files`);
  }
  return files;
}

async function readBoundedJson(filePath) {
  const raw = await readFile(filePath);
  if (raw.byteLength === 0 || raw.byteLength > MAX_FILE_BYTES) {
    fail(`evidence file size is invalid: ${path.basename(filePath)}`);
  }
  return { document: JSON.parse(raw.toString('utf8')), raw };
}

function sourceRunId(document) {
  const value = document.runId
    ?? document.githubRunId
    ?? document.workflowRunId
    ?? document.provenance?.runId
    ?? document.sourceDetails?.runId
    ?? document.sourceWorkflow?.runId;
  return value === undefined || value === null || value === '' ? null : String(value);
}

function sourceShaValues(document) {
  return [
    document.targetSha,
    document.observedSha,
    document.releaseSha,
    document.commitSha,
    document.checkedOutSha,
    document.currentMainSha,
  ]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map((value) => String(value).toLowerCase());
}

function validateLegacySourceDocument(document, {
  targetSha,
  repository,
  expectedRunId,
  lane,
  fileName,
}) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    fail(`runtime lane ${lane} source ${fileName} is not an object`);
  }
  if (hasSensitiveShape(document)) {
    fail(`runtime lane ${lane} source ${fileName} contains secret-shaped evidence metadata`);
  }
  if (document.status !== 'Complete' || document.outcome !== 'passed') {
    fail(`runtime lane ${lane} source ${fileName} is not Complete/passed`);
  }
  if (!document.generatedAt || Number.isNaN(Date.parse(document.generatedAt))) {
    fail(`runtime lane ${lane} source ${fileName} generatedAt is invalid`);
  }
  if (document.repository && document.repository !== repository) {
    fail(`runtime lane ${lane} source ${fileName} repository mismatch`);
  }
  const runId = sourceRunId(document);
  if (runId && runId !== String(expectedRunId)) {
    fail(`runtime lane ${lane} source ${fileName} run ID mismatch`);
  }
  const shaValues = sourceShaValues(document);
  if (shaValues.some((value) => value !== targetSha)) {
    fail(`runtime lane ${lane} source ${fileName} SHA mismatch`);
  }
  return shaValues.includes(targetSha);
}

export async function normalizeLaneEvidence({
  runtimeRoot,
  lane,
  campaignResult,
  targetSha,
  repository,
  generatedAt = new Date().toISOString(),
}) {
  const contract = RUNTIME_LANE_CONTRACTS[lane];
  if (!contract) fail(`runtime lane contract is missing: ${lane}`);

  const laneRoot = path.join(runtimeRoot, lane.toLowerCase());
  let files;
  try {
    files = await walkJson(laneRoot);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      fail(`runtime lane ${lane} artifact directory is missing`);
    }
    throw error;
  }

  if (files.length === 0) fail(`runtime lane ${lane} has no JSON evidence`);

  const byBaseName = new Map();
  for (const filePath of files.sort()) {
    const fileName = path.basename(filePath);
    if (byBaseName.has(fileName)) {
      fail(`runtime lane ${lane} contains duplicate evidence filename ${fileName}`);
    }

    let parsed;
    try {
      parsed = await readBoundedJson(filePath);
    } catch {
      fail(`runtime lane ${lane} contains invalid JSON evidence`);
    }

    if (hasSensitiveShape(parsed.document)) {
      fail(`runtime lane ${lane} contains secret-shaped JSON evidence`);
    }
    byBaseName.set(fileName, { filePath, ...parsed });
  }

  const sourceDigests = [];
  const sourceSchemas = [];
  let exactShaObserved = false;

  for (const requiredFile of contract.requiredEvidenceFiles) {
    const source = byBaseName.get(requiredFile);
    if (!source) fail(`runtime lane ${lane} required evidence file is missing: ${requiredFile}`);

    exactShaObserved = validateLegacySourceDocument(source.document, {
      targetSha,
      repository,
      expectedRunId: campaignResult.run_id,
      lane,
      fileName: requiredFile,
    }) || exactShaObserved;

    sourceDigests.push({ file: requiredFile, sha256: digest(source.raw) });
    sourceSchemas.push(String(source.document.schema ?? source.document.evidenceItem ?? requiredFile));
  }

  if (!exactShaObserved) fail(`runtime lane ${lane} required evidence is not exact-SHA bound`);

  return {
    evidenceItem: `runtime-lane-${lane.toLowerCase()}`,
    status: 'Complete',
    outcome: 'passed',
    generatedAt,
    repository,
    targetSha,
    observedSha: targetSha,
    runId: String(campaignResult.run_id),
    controlsVerified: [...contract.controlsVerified],
    evidenceIntegrity: {
      containsSensitiveValues: false,
      exactShaBound: true,
      rawProviderPayloadsStored: false,
      customerDataStored: false,
      normalizedFromValidatedChildArtifact: true,
    },
    sourceDigests,
    sourceSchemas: [...new Set(sourceSchemas)].sort(),
    evidenceBoundary: `Normalized from the protected ${lane} child workflow after its domain validator passed on the exact release SHA.`,
  };
}
