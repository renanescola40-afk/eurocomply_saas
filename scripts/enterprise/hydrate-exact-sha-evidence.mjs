#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PRODUCT_REGISTRY = path.join(ROOT, 'docs/compliance/eu-ai-act-product-coverage-registry.json');
const FULL_SHA = /^[a-f0-9]{40}$/;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function evidenceSha(document) {
  const candidates = [
    document?.targetSha,
    document?.observedSha,
    document?.commitSha,
    document?.releaseSha,
    document?.release_sha,
    document?.deploymentSha,
    document?.deployment_sha,
    document?.sourceSha,
    document?.source_sha,
    document?.productSha,
    document?.product_sha,
    document?.sha,
    document?.provenance?.commitSha,
    document?.reviewBinding?.productSha,
  ];
  return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() ?? null;
}

async function walkJsonFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(absolute);
      }
    }
  }
  await visit(root);
  return files.sort();
}

function normalisePath(value) {
  return value.split(path.sep).join('/');
}

export async function hydrateExactShaEvidence({
  sourceRoot,
  outputRoot,
  targetSha,
  productRegistry,
}) {
  if (!FULL_SHA.test(targetSha ?? '')) throw new Error('targetSha must be a lowercase 40-character Git SHA');

  const expectedPaths = [...new Set(
    productRegistry.workstreams.flatMap((workstream) => workstream.runtimeEvidence ?? []),
  )].sort();
  const sourceFiles = await walkJsonFiles(sourceRoot);
  const candidates = [];

  for (const absolute of sourceFiles) {
    const bytes = await readFile(absolute);
    let document;
    try {
      document = JSON.parse(bytes.toString('utf8'));
    } catch {
      candidates.push({ absolute, relative: normalisePath(path.relative(sourceRoot, absolute)), invalid: true });
      continue;
    }
    candidates.push({
      absolute,
      relative: normalisePath(path.relative(sourceRoot, absolute)),
      basename: path.basename(absolute),
      document,
      sha: evidenceSha(document),
      digest: sha256(bytes),
      sensitive: document?.evidenceIntegrity?.containsSensitiveValues === true
        || document?.containsSensitiveValues === true,
    });
  }

  const results = [];
  await mkdir(outputRoot, { recursive: true });

  for (const expectedPath of expectedPaths) {
    const expectedNormalised = normalisePath(expectedPath);
    const expectedBasename = path.posix.basename(expectedNormalised);
    const pathMatches = candidates.filter((candidate) =>
      !candidate.invalid
      && (candidate.relative === expectedNormalised || candidate.relative.endsWith(`/${expectedNormalised}`)),
    );
    const pool = pathMatches.length > 0
      ? pathMatches
      : candidates.filter((candidate) => !candidate.invalid && candidate.basename === expectedBasename);
    const exactSha = pool.filter((candidate) => candidate.sha === targetSha && !candidate.sensitive);
    const sensitive = pool.filter((candidate) => candidate.sha === targetSha && candidate.sensitive);
    const stale = pool.filter((candidate) => candidate.sha && candidate.sha !== targetSha);

    if (exactSha.length === 0) {
      results.push({
        path: expectedPath,
        status: sensitive.length > 0 ? 'REJECTED_SENSITIVE' : stale.length > 0 ? 'STALE' : 'MISSING',
        candidateCount: pool.length,
        staleShaCount: stale.length,
      });
      continue;
    }

    const digests = new Set(exactSha.map((candidate) => candidate.digest));
    if (digests.size > 1) {
      results.push({
        path: expectedPath,
        status: 'AMBIGUOUS',
        candidateCount: exactSha.length,
        digests: [...digests].sort(),
      });
      continue;
    }

    const selected = [...exactSha].sort((a, b) => a.relative.localeCompare(b.relative))[0];
    const destination = path.join(outputRoot, expectedPath);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(selected.absolute, destination);
    results.push({
      path: expectedPath,
      status: 'HYDRATED',
      source: selected.relative,
      digest: `sha256:${selected.digest}`,
      targetSha,
      equivalentCandidateCount: exactSha.length,
    });
  }

  const manifest = {
    schema: 'risck-comply.exact-sha-evidence-hydration.v1',
    generatedAt: new Date().toISOString(),
    targetSha,
    expectedEvidence: expectedPaths.length,
    hydratedEvidence: results.filter((item) => item.status === 'HYDRATED').length,
    ambiguousEvidence: results.filter((item) => item.status === 'AMBIGUOUS').length,
    rejectedSensitiveEvidence: results.filter((item) => item.status === 'REJECTED_SENSITIVE').length,
    staleEvidence: results.filter((item) => item.status === 'STALE').length,
    missingEvidence: results.filter((item) => item.status === 'MISSING').length,
    results,
    truthBoundary: 'Only retained JSON evidence explicitly bound to the exact target SHA is hydrated. Missing, stale, ambiguous, sensitive-marked or malformed evidence is never converted into PASS.',
  };
  await writeFile(path.join(outputRoot, 'exact-sha-evidence-hydration.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function main() {
  const [sourceRootArg, outputRootArg, targetSha] = process.argv.slice(2);
  if (!sourceRootArg || !outputRootArg || !targetSha) {
    throw new Error('usage: source-root output-root target-sha');
  }
  const productRegistry = JSON.parse(await readFile(PRODUCT_REGISTRY, 'utf8'));
  const manifest = await hydrateExactShaEvidence({
    sourceRoot: path.resolve(sourceRootArg),
    outputRoot: path.resolve(outputRootArg),
    targetSha,
    productRegistry,
  });
  console.log(JSON.stringify({
    targetSha: manifest.targetSha,
    expectedEvidence: manifest.expectedEvidence,
    hydratedEvidence: manifest.hydratedEvidence,
    ambiguousEvidence: manifest.ambiguousEvidence,
    staleEvidence: manifest.staleEvidence,
    missingEvidence: manifest.missingEvidence,
  }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
