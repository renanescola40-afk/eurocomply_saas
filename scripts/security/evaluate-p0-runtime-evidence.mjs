import fs from 'node:fs';
import path from 'node:path';
import { activeP0RuntimeEvidenceItems } from './p0-runtime-evidence-catalog.mjs';

export const DEFAULT_P0_REGISTER_PATH = path.join(
  'docs',
  'security',
  'P0_RUNTIME_EVIDENCE_REGISTER.md',
);
export const DEFAULT_P0_RUNTIME_DIR = path.join(
  'docs',
  'security',
  'evidence',
  'runtime',
);

export function normalizeP0Item(item) {
  return String(item ?? '').replace(/`/g, '').trim();
}

export function parseP0RegisterRows(source) {
  return String(source ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && !line.includes('---'))
    .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean))
    .filter((cells) => cells.length >= 4 && cells[0] !== 'Evidence item')
    .map(([item, status, requiredEvidence, owner, nextAction = '']) => ({
      item,
      status: String(status ?? '').replace(/`/g, ''),
      requiredEvidence,
      owner,
      nextAction,
    }));
}

export function resolveP0ExpectedCommitSha(env = process.env) {
  return [env.RELEASE_COMMIT_SHA, env.GITHUB_SHA]
    .map((value) => String(value ?? '').trim().toLowerCase())
    .find((value) => /^[a-f0-9]{40}$/.test(value)) ?? null;
}

function validatorFailuresFor(validator, evidence, context) {
  if (typeof validator !== 'function') {
    return ['canonical validator is missing'];
  }

  try {
    const result = validator(evidence, context);
    return Array.isArray(result)
      ? result
      : ['canonical validator returned a non-array result'];
  } catch (error) {
    return [
      `canonical validator threw: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
}

function readRuntimeEvidence({ root, runtimeDir, entry, context }) {
  const evidencePath = path.join(root, runtimeDir, entry.file);
  const displayPath = path.join(runtimeDir, entry.file);

  if (!fs.existsSync(evidencePath)) {
    return {
      evidencePath: displayPath,
      evidenceFileExists: false,
      evidenceStatus: 'missing',
      evidenceOutcome: 'missing',
      placeholderOnly: false,
      evidenceSatisfied: false,
      validatorFailures: ['evidence file is missing'],
    };
  }

  try {
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    const evidenceStatus = String(evidence.status ?? 'missing');
    const evidenceOutcome = evidence.outcome === undefined
      ? 'not_recorded'
      : String(evidence.outcome);
    const placeholderOnly = evidence.placeholderOnly === true
      || evidence.evidenceIntegrity?.placeholderOnly === true;
    const validatorFailures = validatorFailuresFor(entry.validator, evidence, context);
    const evidenceSatisfied = evidenceStatus === 'Complete'
      && (evidence.outcome === undefined || evidenceOutcome === 'passed')
      && !placeholderOnly
      && validatorFailures.length === 0;

    return {
      evidencePath: displayPath,
      evidenceFileExists: true,
      evidenceStatus,
      evidenceOutcome,
      placeholderOnly,
      evidenceSatisfied,
      validatorFailures,
    };
  } catch (error) {
    return {
      evidencePath: displayPath,
      evidenceFileExists: true,
      evidenceStatus: 'invalid_json',
      evidenceOutcome: 'invalid_json',
      placeholderOnly: false,
      evidenceSatisfied: false,
      validatorFailures: ['evidence JSON could not be parsed'],
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}

function registerStatusFor(entry, statusByItem) {
  const names = [entry.item, ...(entry.aliases ?? [])].map(normalizeP0Item);
  for (const name of names) {
    const status = statusByItem.get(name);
    if (status) return status;
  }
  return 'Missing from register';
}

export function evaluateP0RuntimeEvidence({
  root = process.cwd(),
  registerPath = DEFAULT_P0_REGISTER_PATH,
  runtimeDir = DEFAULT_P0_RUNTIME_DIR,
  finalValidationInProgress = false,
  expectedRepository = 'renanescola40-afk/eurocomply_saas',
  expectedBranch = 'main',
  expectedCommitSha = resolveP0ExpectedCommitSha(),
  now = new Date(),
  catalogItems = activeP0RuntimeEvidenceItems({ finalValidationInProgress }),
  requireRegisterStatus = false,
} = {}) {
  const absoluteRegisterPath = path.join(root, registerPath);
  if (!fs.existsSync(absoluteRegisterPath)) {
    throw new Error(`missing register policy: ${registerPath}`);
  }

  const registerRows = parseP0RegisterRows(
    fs.readFileSync(absoluteRegisterPath, 'utf8'),
  );
  const statusByItem = new Map(
    registerRows.map((row) => [normalizeP0Item(row.item), row.status]),
  );
  const context = {
    now,
    expectedBranch,
    expectedRepository,
    expectedCommitSha,
  };

  const results = catalogItems.map((entry) => {
    const registerStatus = registerStatusFor(entry, statusByItem);
    const evidence = readRuntimeEvidence({ root, runtimeDir, entry, context });
    const registerStatusSatisfied = registerStatus === 'Complete';
    const derivedStatus = evidence.evidenceSatisfied ? 'Complete' : 'Open';
    const registerDrift = registerStatus !== derivedStatus;
    const satisfied = evidence.evidenceSatisfied
      && (!requireRegisterStatus || registerStatusSatisfied);

    return {
      item: entry.item,
      registerStatus,
      derivedStatus,
      registerDrift,
      evidenceFile: evidence.evidencePath,
      evidenceFileExists: evidence.evidenceFileExists,
      evidenceStatus: evidence.evidenceStatus,
      evidenceOutcome: evidence.evidenceOutcome,
      placeholderOnly: evidence.placeholderOnly,
      validatorFailures: evidence.validatorFailures,
      parseError: evidence.parseError,
      registerStatusSatisfied,
      evidenceSatisfied: evidence.evidenceSatisfied,
      satisfied,
    };
  });

  return {
    expectedRepository,
    expectedBranch,
    expectedCommitSha,
    validationClock: now.toISOString(),
    registerPath,
    runtimeDir,
    registerStatusRequired: requireRegisterStatus,
    registerRows,
    results,
    registerDrift: results.filter((entry) => entry.registerDrift),
    missing: results.filter((entry) => !entry.satisfied),
  };
}
