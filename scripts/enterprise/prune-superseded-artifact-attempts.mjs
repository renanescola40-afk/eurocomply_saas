#!/usr/bin/env node

import { access, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MANIFEST_NAME = 'github-exact-sha-artifact-collection.json';

function safeSegment(value) {
  return String(value).replace(/[^A-Za-z0-9._-]+/g, '_');
}

function artifactKey(artifact) {
  return `${artifact.producerWorkflow}\u0000${artifact.artifactName}`;
}

export async function pruneSupersededArtifactAttempts({ root }) {
  const manifestPath = path.join(root, MANIFEST_NAME);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest?.status !== 'Complete' || !Array.isArray(manifest?.artifacts)) {
    throw new Error('artifact collection manifest must be Complete with an artifacts array');
  }

  const groups = new Map();
  for (const artifact of manifest.artifacts) {
    if (!Number.isSafeInteger(artifact?.artifactId) || artifact.artifactId <= 0) {
      throw new Error('artifact manifest contains invalid artifactId');
    }
    if (typeof artifact?.artifactName !== 'string' || !artifact.artifactName) {
      throw new Error('artifact manifest contains invalid artifactName');
    }
    if (typeof artifact?.producerWorkflow !== 'string' || !artifact.producerWorkflow) {
      throw new Error('artifact manifest contains invalid producerWorkflow');
    }
    const key = artifactKey(artifact);
    const group = groups.get(key) ?? [];
    group.push(artifact);
    groups.set(key, group);
  }

  const removed = [];
  const retained = [];
  for (const attempts of groups.values()) {
    const ordered = [...attempts].sort((a, b) => b.artifactId - a.artifactId);
    const newest = ordered[0];
    retained.push({
      producerWorkflow: newest.producerWorkflow,
      artifactName: newest.artifactName,
      artifactId: newest.artifactId,
    });

    for (const superseded of ordered.slice(1)) {
      const destination = path.join(
        root,
        `${superseded.artifactId}-${safeSegment(superseded.artifactName)}`,
      );
      try {
        await access(destination);
      } catch {
        throw new Error(`superseded artifact directory missing: ${superseded.artifactId}`);
      }
      await rm(destination, { recursive: true, force: false });
      removed.push({
        producerWorkflow: superseded.producerWorkflow,
        artifactName: superseded.artifactName,
        artifactId: superseded.artifactId,
      });
    }
  }

  return {
    status: 'Complete',
    retainedArtifactAttempts: retained.length,
    removedSupersededAttempts: removed.length,
    retained,
    removed,
    truthBoundary: 'Only older GitHub artifact attempts sharing the same producer workflow and artifact name are removed. The newest selected artifact directory remains complete, so all conflicting documents within that attempt remain visible to fail-closed hydration. Identically named artifacts from different producers are never collapsed.',
  };
}

async function main() {
  const [rootArg] = process.argv.slice(2);
  if (!rootArg) throw new Error('usage: prune-superseded-artifact-attempts.mjs <artifact-root>');
  const result = await pruneSupersededArtifactAttempts({ root: path.resolve(ROOT, rootArg) });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
