#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLOSURE_CONFIG = path.join(ROOT, 'config/enterprise-100-closure.json');
const FULL_SHA = /^[a-f0-9]{40}$/;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalisePath(value) {
  return value.split(path.sep).join('/');
}

function evidenceSha(document) {
  const candidates = [
    document?.targetSha,
    document?.observedSha,
    document?.commitSha,
    document?.commit_sha,
    document?.releaseSha,
    document?.release_sha,
    document?.deploymentSha,
    document?.deployment_sha,
    document?.sourceSha,
    document?.source_sha,
    document?.productSha,
    document?.product_sha,
    document?.buildSha,
    document?.build_sha,
    document?.sha,
    document?.provenance?.commitSha,
    document?.reviewBinding?.productSha,
  ];
  return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() ?? null;
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

    candidates.push({
      absolute,
      relative: normalisePath(path.relative(sourceRoot, absolute)),
      basename: path.basename(absolute),
      document,
      sha: evidenceSha(document),
      digest: sha256(bytes),
      sensitive: containsSensitiveValues(document),
    });
  }

  await mkdir(outputRoot, { recursive: true });
  const results = [];

  for (const expectedPath of expectedPaths) {
    const expectedNormalised = normalisePath(expectedPath);
    const expectedBasename = path.posix.basename(expectedNormalised);
    const pathMatches = candidates.filter((candidate) =>
      candidate.relative === expectedNormalised
      || candidate.relative.endsWith(`/${expectedNormalised}`),
    );
    const pool = pathMatches.length > 0
      ? pathMatches
      : candidates.filter((candidate) => candidate.basename === expectedBasename);
    const exact = pool.filter((candidate) => candidate.sha === targetSha && !candidate.sensitive);
    const sensitive = pool.filter((candidate) => candidate.sha === targetSha && candidate.sensitive);
    const stale = pool.filter((candidate) => candidate.sha && candidate.sha !== targetSha);

    if (exact.length === 0) {
      results.push({
        path: expectedPath,
        status: sensitive.length > 0 ? 'REJECTED_SENSITIVE' : stale.length > 0 ? 'STALE' : 'MISSING',
        candidateCount: pool.length,
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
      source: selected.relative,
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
    ambiguousEvidence: results.filter((item) => item.status === 'AMBIGUOUS').length,
    rejectedSensitiveEvidence: results.filter((item) => item.status === 'REJECTED_SENSITIVE').length,
    staleEvidence: results.filter((item) => item.status === 'STALE').length,
    missingEvidence: results.filter((item) => item.status === 'MISSING').length,
    invalidJsonFiles,
    results,
    truthBoundary: 'Hydration only restores retained JSON evidence that is explicitly bound to the exact target SHA. It does not award PASS, approve human review, or convert missing, stale, ambiguous or sensitive evidence into closure credit.',
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
    ambiguousEvidence: manifest.ambiguousEvidence,
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
