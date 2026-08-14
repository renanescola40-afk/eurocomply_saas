#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const VERSION = /^\d{14}$/;
const SHA = /^[a-f0-9]{40}$/;
const SCHEMA = 'risck-comply.supabase-forward-version-order-proof.v1';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeVersions(values, label) {
  assert(Array.isArray(values), `${label} must be an array`);
  const normalized = values.map((value) => String(value ?? '').trim());
  for (const value of normalized) assert(VERSION.test(value), `${label} contains invalid migration version ${value}`);
  assert(new Set(normalized).size === normalized.length, `${label} contains duplicate migration versions`);
  return normalized.sort();
}

export function verifyForwardVersionOrder({ manifest, remoteVersions, expectedSha }) {
  const targetSha = String(expectedSha ?? '').trim().toLowerCase();
  assert(SHA.test(targetSha), 'expected SHA must be a lowercase 40-character Git SHA');
  assert(manifest?.schema === 'risck-comply.supabase-forward-reconciliation-manifest.v1', 'manifest schema is invalid');
  assert(manifest?.targetSha === targetSha, 'manifest target SHA mismatch');

  const selected = normalizeVersions(
    (manifest?.migrations ?? []).map((migration) => migration?.version),
    'selected migration versions',
  );
  const remote = normalizeVersions(remoteVersions, 'remote migration versions');
  assert(selected.length > 0, 'selected migration set is empty');

  const remoteHeadVersion = remote.length > 0 ? remote.at(-1) : null;
  const earliestSelectedVersion = selected[0];
  if (remoteHeadVersion) {
    for (const version of selected) {
      assert(
        version > remoteHeadVersion,
        `selected migration ${version} is not forward of remote head ${remoteHeadVersion}`,
      );
    }
  }

  return {
    schema: SCHEMA,
    evidenceItem: 'supabase-forward-version-order-proof',
    status: 'PASS',
    outcome: 'passed',
    targetSha,
    remoteHeadVersion,
    earliestSelectedVersion,
    selectedMigrationCount: selected.length,
    checks: {
      selectedSetNonEmpty: true,
      allSelectedVersionsAfterRemoteHead: true,
      outOfOrderMigrationRequired: false,
      includeAllRequired: false,
      migrationHistoryRepairRequired: false,
    },
    truthBoundary: 'PASS proves only that every selected reconciliation version is strictly later than the observed remote migration head. It does not classify migrations, authorize a production write, or mutate migration history.',
  };
}

async function main() {
  const [manifestPath, remoteVersionsPath, outputPath, expectedSha] = process.argv.slice(2);
  assert(manifestPath && remoteVersionsPath && outputPath && expectedSha, 'usage: verify-forward-version-order <manifest.json> <remote-versions.json> <output.json> <expected-sha>');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const remoteVersions = JSON.parse(await readFile(remoteVersionsPath, 'utf8'));
  const proof = verifyForwardVersionOrder({ manifest, remoteVersions, expectedSha });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(proof, null, 2)}\n`, { mode: 0o600 });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'forward version-order verification failed');
    process.exit(1);
  });
}
