#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { p0EvidenceCatalog } from './p0-runtime-evidence-catalog.mjs';
import {
  DEFAULT_P0_REGISTER_PATH,
  evaluateP0RuntimeEvidence,
  parseP0RegisterRows,
  resolveP0ExpectedCommitSha,
} from './evaluate-p0-runtime-evidence.mjs';

const FULL_SHA = /^[a-f0-9]{40}$/;
const DEFAULT_OUTPUT_DIR = path.join('artifacts', 'p0-runtime-evidence-register');
const ALLOWED_METADATA_STATUSES = new Set(['Open', 'Complete', 'Exception']);
const FORBIDDEN_DEPENDENCY_SPEC = /^(?:\*|latest|next|beta|canary|https?:|git(?:\+|:)|github:|file:|link:)/i;

function safeText(value, maxLength = 300) {
  return String(value ?? '')
    .replace(/[\r\n|]/g, ' ')
    .replace(/`/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function readJson(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return { path: relativePath, exists: false, parseable: false, value: null };
  }
  try {
    return {
      path: relativePath,
      exists: true,
      parseable: true,
      value: JSON.parse(fs.readFileSync(absolutePath, 'utf8')),
    };
  } catch {
    return { path: relativePath, exists: true, parseable: false, value: null };
  }
}

function repositoryResult(entry, evidenceFile, failures) {
  const satisfied = failures.length === 0;
  return {
    item: entry.item,
    kind: 'repository',
    status: satisfied ? 'Complete' : 'Open',
    satisfied,
    evidenceFile,
    evidenceStatus: satisfied ? 'verified' : 'invalid',
    evidenceOutcome: satisfied ? 'passed' : 'blocked',
    validatorFailures: failures,
    registerStatus: null,
    registerDrift: null,
  };
}

function repositoryControlResult(entry, root) {
  if (entry.item === 'Deterministic npm lockfile committed') {
    const manifest = readJson(root, 'package.json');
    const lockfile = readJson(root, 'package-lock.json');
    const failures = [];
    if (!manifest.exists || !manifest.parseable) failures.push('package_json_missing_or_invalid');
    if (!lockfile.exists || !lockfile.parseable) failures.push('package_lock_missing_or_invalid');
    if (lockfile.parseable && Number(lockfile.value?.lockfileVersion) < 3) failures.push('lockfile_version_below_3');
    if (lockfile.parseable && !lockfile.value?.packages?.['']) failures.push('lockfile_root_package_missing');
    if (manifest.parseable && !/^npm@\d+\.\d+\.\d+$/.test(String(manifest.value?.packageManager || ''))) {
      failures.push('npm_package_manager_not_pinned');
    }
    if (
      manifest.parseable
      && lockfile.parseable
      && lockfile.value?.packages?.['']?.name
      && manifest.value?.name !== lockfile.value.packages[''].name
    ) failures.push('manifest_lockfile_name_mismatch');
    return repositoryResult(entry, 'package-lock.json', failures);
  }

  if (entry.item === 'Floating dependency specs removed') {
    const manifest = readJson(root, 'package.json');
    const failures = [];
    const forbidden = [];
    if (!manifest.exists || !manifest.parseable) failures.push('package_json_missing_or_invalid');
    if (manifest.parseable) {
      for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'overrides', 'resolutions']) {
        for (const [name, spec] of Object.entries(manifest.value?.[section] || {})) {
          if (typeof spec === 'string' && FORBIDDEN_DEPENDENCY_SPEC.test(spec.trim())) {
            forbidden.push(`${section}:${name}`);
          }
        }
      }
    }
    if (forbidden.length > 0) failures.push(`forbidden_dependency_specs:${forbidden.sort().join(',')}`);
    return repositoryResult(entry, 'package.json', failures);
  }

  return repositoryResult(entry, null, ['repository_control_verifier_missing']);
}

function metadataByItem(root, registerPath) {
  const absolutePath = path.join(root, registerPath);
  if (!fs.existsSync(absolutePath)) throw new Error(`register_policy_missing:${registerPath}`);
  const rows = parseP0RegisterRows(fs.readFileSync(absolutePath, 'utf8'));
  return new Map(rows.map((row) => [row.item.replace(/`/g, '').trim(), row]));
}

function metadataFor(entry, metadata) {
  const names = [entry.item, ...(entry.aliases || [])].map((item) => item.replace(/`/g, '').trim());
  const row = names.map((name) => metadata.get(name)).find(Boolean);
  if (!row) {
    return {
      requiredEvidence: entry.file ? `Canonical evidence: docs/security/evidence/runtime/${entry.file}` : 'Canonical repository verification',
      owner: 'Release owner',
      nextAction: 'Provide and validate the missing canonical evidence',
      legacyStatus: 'Missing from policy',
    };
  }
  return {
    requiredEvidence: row.requiredEvidence,
    owner: row.owner,
    nextAction: row.nextAction,
    legacyStatus: ALLOWED_METADATA_STATUSES.has(row.status) ? row.status : 'Invalid',
  };
}

export function buildP0EvidenceRegister({
  root = process.cwd(),
  expectedRepository = 'renanescola40-afk/eurocomply_saas',
  expectedBranch = 'main',
  expectedCommitSha = resolveP0ExpectedCommitSha(),
  now = new Date(),
  registerPath = DEFAULT_P0_REGISTER_PATH,
  finalValidationInProgress = false,
} = {}) {
  const normalizedSha = String(expectedCommitSha || '').trim().toLowerCase();
  if (!FULL_SHA.test(normalizedSha)) throw new Error('expected_commit_sha_invalid');

  const metadata = metadataByItem(root, registerPath);
  const runtime = evaluateP0RuntimeEvidence({
    root,
    registerPath,
    finalValidationInProgress,
    expectedRepository,
    expectedBranch,
    expectedCommitSha: normalizedSha,
    now,
    requireRegisterStatus: false,
  });
  const runtimeByItem = new Map(runtime.results.map((result) => [result.item, result]));

  const controls = p0EvidenceCatalog
    .filter((entry) => !(finalValidationInProgress && entry.skipWhenFinalValidationInProgress))
    .map((entry) => {
      const result = entry.kind === 'runtime'
        ? runtimeByItem.get(entry.item)
        : repositoryControlResult(entry, root);
      const policy = metadataFor(entry, metadata);
      if (!result) throw new Error(`runtime_result_missing:${entry.item}`);
      const status = result.satisfied ? 'Complete' : 'Open';
      const legacyRegisterStatus = result.registerStatus ?? policy.legacyStatus;
      return {
        item: entry.item,
        kind: entry.kind,
        status,
        satisfied: result.satisfied,
        evidenceFile: result.evidenceFile,
        evidenceStatus: result.evidenceStatus,
        evidenceOutcome: result.evidenceOutcome,
        validatorFailures: result.validatorFailures || [],
        owner: policy.owner,
        requiredEvidence: policy.requiredEvidence,
        nextAction: status === 'Complete'
          ? 'Retain exact-SHA evidence and revalidate on the next release SHA'
          : policy.nextAction,
        legacyRegisterStatus,
        legacyRegisterDrift: result.registerDrift ?? (legacyRegisterStatus !== status),
      };
    });

  const completed = controls.filter((control) => control.status === 'Complete').length;
  const blocked = controls.length - completed;
  const decision = blocked === 0 ? 'GO' : 'NO_GO';
  const result = {
    schema: 'risck-comply.p0-runtime-evidence-register.v1',
    repository: expectedRepository,
    branch: expectedBranch,
    commitSha: normalizedSha,
    generatedAt: now.toISOString(),
    decision,
    status: blocked === 0 ? 'Complete' : 'Open',
    completed,
    blocked,
    total: controls.length,
    completionPercent: Math.round((completed / controls.length) * 100),
    controls,
    sourceOfTruth: {
      catalog: 'scripts/security/p0-runtime-evidence-catalog.mjs',
      evaluator: 'scripts/security/evaluate-p0-runtime-evidence.mjs',
      policyMetadata: registerPath,
      statusRule: 'Status is derived from canonical validators and repository checks; legacy Markdown statuses are advisory only.',
    },
    noSecretsStored: true,
    truthBoundary: blocked === 0
      ? 'Every canonical P0 control passed for the exact assessed SHA.'
      : 'Open or invalid evidence remains blocking. Generated diagnostics do not promote missing evidence or replace external review.',
  };
  return {
    ...result,
    sha256: createHash('sha256').update(JSON.stringify(result)).digest('hex'),
  };
}

export function renderP0EvidenceRegisterMarkdown(register) {
  const lines = [
    '# Generated P0 Runtime Evidence Register',
    '',
    '> Generated artifact. Do not edit statuses manually. The policy metadata lives in `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md`.',
    '',
    `- Repository: \`${safeText(register.repository)}\``,
    `- Branch: \`${safeText(register.branch)}\``,
    `- Exact SHA: \`${safeText(register.commitSha)}\``,
    `- Generated at: \`${safeText(register.generatedAt)}\``,
    `- Decision: **${safeText(register.decision)}**`,
    `- Completion: **${register.completed}/${register.total} (${register.completionPercent}%)**`,
    '',
    '| Evidence item | Kind | Derived status | Evidence | Owner | Next action |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const control of register.controls) {
    const evidence = control.evidenceFile
      ? `\`${safeText(control.evidenceFile)}\` — ${safeText(control.evidenceStatus)}/${safeText(control.evidenceOutcome)}`
      : safeText(control.requiredEvidence);
    const failures = control.validatorFailures.length > 0
      ? ` Blockers: ${control.validatorFailures.map((failure) => safeText(failure, 120)).join('; ')}`
      : '';
    lines.push(`| ${safeText(control.item)} | ${safeText(control.kind)} | ${safeText(control.status)} | ${evidence}${failures} | ${safeText(control.owner)} | ${safeText(control.nextAction)} |`);
  }

  lines.push(
    '',
    '## Truth boundary',
    '',
    register.truthBoundary,
    '',
    `Integrity digest: \`${register.sha256}\``,
    '',
  );
  return lines.join('\n');
}

function parseArg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) || null;
}

function runCli() {
  const outputDir = parseArg('output-dir') || process.env.P0_REGISTER_OUTPUT_DIR || DEFAULT_OUTPUT_DIR;
  const expectedCommitSha = parseArg('sha') || resolveP0ExpectedCommitSha();
  const register = buildP0EvidenceRegister({ expectedCommitSha });
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'p0-runtime-evidence-register.json');
  const markdownPath = path.join(outputDir, 'p0-runtime-evidence-register.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(register, null, 2)}\n`, { mode: 0o600 });
  fs.writeFileSync(markdownPath, `${renderP0EvidenceRegisterMarkdown(register)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify(register, null, 2)}\n`);
  if (process.argv.includes('--strict') && register.decision !== 'GO') process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
