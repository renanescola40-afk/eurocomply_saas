#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveEvidenceShaBinding } from './evidence-sha-binding.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLOSURE_CONFIG = path.join(ROOT, 'config/enterprise-100-closure.json');
const FULL_SHA = /^[a-f0-9]{40}$/;

// Explicit semantic aliases only. Each source already has its own evidence contract
// elsewhere in the repository. Do not add aliases merely because filenames look similar.
const EXPLICIT_SOURCE_ALIASES = Object.freeze({
  'release-validation/repository-quality.json': [
    'artifacts/enterprise-readiness/github-checks-evidence.json',
  ],
  'release-validation/production-deployment.json': [
    'docs/security/evidence/runtime/deployment-smoke-validation.json',
  ],
  'release-validation/production-smoke.json': [
    'docs/security/evidence/runtime/authenticated-production-smoke.json',
  ],
  'release-validation/tenant-isolation-live.json': [
    'docs/security/evidence/runtime/supabase-live-rls-validation.json',
  ],
  'release-validation/backup-restore.json': [
    'recovery-source.json',
  ],
  'release-validation/rollback-rehearsal.json': [
    'rollback-source.json',
  ],
  'release-validation/observability-runtime.json': [
    'docs/security/evidence/runtime/observability-production-validation.json',
  ],
  'release-validation/billing-runtime.json': [
    'docs/security/evidence/runtime/stripe-billing-validation.json',
  ],
  'release-validation/final-go-no-go.json': [
    'docs/security/evidence/runtime/release-go-no-go.json',
  ],
});

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalisePath(value) {
  return value.split(path.sep).join('/');
}

function containsSensitiveValues(document) {
  return document?.evidenceIntegrity?.containsSensitiveValues === true
    || document?.containsSensitiveValues === true
    || document?.containsSecrets === true
    || document?.secretsRedacted === false;
}

async function walkJsonFiles(root) {
  const files = [];

  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') return;
      throw error;
    }

    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile() && entry.name.endsWith('.json')) files.push(absolute);
    }
  }

  await visit(root);
  return files.sort();
}

function candidatesForPath(candidates, requestedPath) {
  const requested = normalisePath(requestedPath);
  const basename = path.posix.basename(requested);
  const exactPathMatches = candidates.filter((candidate) =>
    candidate.relative === requested || candidate.relative.endsWith(`/${requested}`),
  );
  if (exactPathMatches.length > 0) return exactPathMatches;
  return candidates.filter((candidate) => candidate.basename === basename);
}

function candidatePoolForExpectedPath(candidates, expectedPath) {
  const direct = candidatesForPath(candidates, expectedPath);
  if (direct.length > 0) {
    return { pool: direct, matchedBy: 'declared_path', sourceAliases: [] };
  }

  const aliases = EXPLICIT_SOURCE_ALIASES[normalisePath(expectedPath)] ?? [];
  if (aliases.length === 0) return { pool: [], matchedBy: 'none', sourceAliases: [] };

  const aliasCandidates = [];
  for (const alias of aliases) {
    for (const candidate of candidatesForPath(candidates, alias)) {
      if (!aliasCandidates.some((item) => item.absolute === candidate.absolute)) aliasCandidates.push(candidate);
    }
  }
  return { pool: aliasCandidates, matchedBy: 'explicit_alias', sourceAliases: aliases };
}

export async function hydrateEnterpriseClosureEvidence({
  sourceRoot,
  outputRoot,
  targetSha,
  closureConfig,
}) {
  if (!FULL_SHA.test(targetSha ?? '')) {
    throw new Error('targetSha must be a lowercase 40-character Git SHA');
  }
  if (!closureConfig || !Array.isArray(closureConfig.controls)) {
    throw new Error('closureConfig.controls must be an array');
  }

  const expectedPaths = [...new Set(
    closureConfig.controls
      .map((control) => control?.evidence)
      .filter((value) => typeof value === 'string' && value.trim()),
  )].sort();
  const sourceFiles = await walkJsonFiles(sourceRoot);
  const candidates = [];
  let invalidJsonFiles = 0;

  for (const absolute of sourceFiles) {
    const bytes = await readFile(absolute);
    let document;
    try {
      document = JSON.parse(bytes.toString('utf8'));
    } catch {
      invalidJsonFiles += 1;
      continue;
    }

    const shaBinding = resolveEvidenceShaBinding(document);
    candidates.push({
      absolute,
      relative: normalisePath(path.relative(sourceRoot, absolute)),
      basename: path.basename(absolute),
      document,
      sha: shaBinding.sha,
      shaSource: shaBinding.source,
      shaConflict: shaBinding.conflict,
      digest: sha256(bytes),
      sensitive: containsSensitiveValues(document),
    });
  }

  await mkdir(outputRoot, { recursive: true });
  const results = [];

  for (const expectedPath of expectedPaths) {
    const { pool, matchedBy, sourceAliases } = candidatePoolForExpectedPath(candidates, expectedPath);
    const conflicts = pool.filter((candidate) => candidate.shaConflict);
    const exact = pool.filter((candidate) =>
      !candidate.shaConflict && candidate.sha === targetSha && !candidate.sensitive,
    );
    const sensitive = pool.filter((candidate) =>
      !candidate.shaConflict && candidate.sha === targetSha && candidate.sensitive,
    );
    const stale = pool.filter((candidate) =>
      !candidate.shaConflict && candidate.sha && candidate.sha !== targetSha,
    );

    if (exact.length === 0) {
      results.push({
        path: expectedPath,
        status: conflicts.length > 0
          ? 'SHA_CONFLICT'
          : sensitive.length > 0
            ? 'REJECTED_SENSITIVE'
            : stale.length > 0
              ? 'STALE'
              : 'MISSING',
        matchedBy,
        sourceAliases,
        candidateCount: pool.length,
        conflictingShaCandidateCount: conflicts.length,
        staleShaCount: stale.length,
        sensitiveCandidateCount: sensitive.length,
      });
      continue;
    }

    const digests = new Set(exact.map((candidate) => candidate.digest));
    if (digests.size > 1) {
      results.push({
        path: expectedPath,
        status: 'AMBIGUOUS',
        matchedBy,
        sourceAliases,
        candidateCount: exact.length,
        digests: [...digests].sort(),
      });
      continue;
    }

    const selected = [...exact].sort((a, b) => a.relative.localeCompare(b.relative))[0];
    const destination = path.join(outputRoot, expectedPath);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(selected.absolute, destination);
    results.push({
      path: expectedPath,
      status: 'HYDRATED',
      matchedBy,
      sourceAliases,
      source: selected.relative,
      shaSource: selected.shaSource,
      digest: `sha256:${selected.digest}`,
      targetSha,
      equivalentCandidateCount: exact.length,
    });
  }

  const manifest = {
    schema: 'risck-comply.enterprise-100-evidence-hydration.v1',
    generatedAt: new Date().toISOString(),
    targetSha,
    expectedEvidence: expectedPaths.length,
    hydratedEvidence: results.filter((item) => item.status === 'HYDRATED').length,
    aliasedEvidence: results.filter((item) => item.status === 'HYDRATED' && item.matchedBy === 'explicit_alias').length,
    ambiguousEvidence: results.filter((item) => item.status === 'AMBIGUOUS').length,
    conflictingShaEvidence: results.filter((item) => item.status === 'SHA_CONFLICT').length,
    rejectedSensitiveEvidence: results.filter((item) => item.status === 'REJECTED_SENSITIVE').length,
    staleEvidence: results.filter((item) => item.status === 'STALE').length,
    missingEvidence: results.filter((item) => item.status === 'MISSING').length,
    invalidJsonFiles,
    results,
    truthBoundary: 'Hydration restores only exact-SHA evidence by declared path or a small explicit semantic alias allowlist. Known nested SHA provenance such as runtimeContext.commitSha is accepted, but conflicting SHA bindings are rejected. Hydration does not award PASS, approve human review, infer equivalence by filename similarity, or convert missing, stale, ambiguous, conflicting or sensitive evidence into closure credit.',
  };

  await writeFile(
    path.join(outputRoot, 'enterprise-100-evidence-hydration.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return manifest;
}

async function main() {
  const [sourceRootArg, outputRootArg, targetSha] = process.argv.slice(2);
  if (!sourceRootArg || !outputRootArg || !targetSha) {
    throw new Error('usage: source-root output-root target-sha');
  }

  const closureConfig = JSON.parse(await readFile(CLOSURE_CONFIG, 'utf8'));
  const manifest = await hydrateEnterpriseClosureEvidence({
    sourceRoot: path.resolve(sourceRootArg),
    outputRoot: path.resolve(outputRootArg),
    targetSha,
    closureConfig,
  });

  console.log(JSON.stringify({
    targetSha: manifest.targetSha,
    expectedEvidence: manifest.expectedEvidence,
    hydratedEvidence: manifest.hydratedEvidence,
    aliasedEvidence: manifest.aliasedEvidence,
    ambiguousEvidence: manifest.ambiguousEvidence,
    conflictingShaEvidence: manifest.conflictingShaEvidence,
    staleEvidence: manifest.staleEvidence,
    missingEvidence: manifest.missingEvidence,
    rejectedSensitiveEvidence: manifest.rejectedSensitiveEvidence,
  }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
