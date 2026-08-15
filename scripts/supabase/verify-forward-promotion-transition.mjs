#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const FULL_SHA = /^[a-f0-9]{40}$/;
const VERSION = /^\d{14}$/;
const MANIFEST_SCHEMA = 'risck-comply.supabase-forward-reconciliation-manifest.v1';
const EVIDENCE_SCHEMA = 'risck-comply.supabase-forward-reconciliation-promotion.v1';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeSha(value) {
  const sha = String(value ?? '').trim().toLowerCase();
  assert(FULL_SHA.test(sha), 'expected SHA must be a lowercase 40-character Git SHA');
  return sha;
}

function normalizeVersions(value, label) {
  assert(Array.isArray(value), `${label} must be an array`);
  const versions = value.map((item) => String(item ?? '').trim());
  for (const version of versions) assert(VERSION.test(version), `${label} contains invalid migration version ${version}`);
  assert(new Set(versions).size === versions.length, `${label} contains duplicate migration versions`);
  return [...versions].sort();
}

function selectedVersionsFromManifest(manifest, expectedSha) {
  assert(manifest?.schema === MANIFEST_SCHEMA, 'manifest schema is invalid');
  assert(manifest?.targetSha === expectedSha, 'manifest target SHA mismatch');
  assert(typeof manifest?.selectionDigest === 'string' && /^sha256:[a-f0-9]{64}$/.test(manifest.selectionDigest), 'manifest selection digest is invalid');
  assert(Array.isArray(manifest?.migrations) && manifest.migrations.length > 0, 'manifest selected migration set is empty');
  assert(manifest?.checks?.productionWriteAuthorized === false, 'manifest must remain non-authorizing');
  assert(manifest?.checks?.migrationHistoryRepairAuthorized === false, 'manifest must forbid migration-history repair');
  assert(manifest?.checks?.unrestrictedDbPushAuthorized === false, 'manifest must forbid unrestricted db push');
  return normalizeVersions(manifest.migrations.map((migration) => migration?.version), 'selected migration versions');
}

export function verifyForwardPromotionTransition({ manifest, remoteBefore, remoteAfter, expectedSha, generatedAt = new Date().toISOString() }) {
  const targetSha = normalizeSha(expectedSha);
  const selected = selectedVersionsFromManifest(manifest, targetSha);
  const before = normalizeVersions(remoteBefore, 'remote-before migration versions');
  const after = normalizeVersions(remoteAfter, 'remote-after migration versions');
  const beforeSet = new Set(before);

  for (const version of selected) {
    assert(!beforeSet.has(version), `selected migration was already present before promotion: ${version}`);
  }

  const expectedAfter = [...new Set([...before, ...selected])].sort();
  assert(expectedAfter.length === before.length + selected.length, 'remote-before and selected migration sets overlap');
  assert(JSON.stringify(after) === JSON.stringify(expectedAfter), 'remote-after migration history is not exactly remote-before plus the selected set');

  const added = after.filter((version) => !beforeSet.has(version));
  assert(JSON.stringify(added) === JSON.stringify(selected), 'applied migration versions are not exactly the selected set');

  return {
    schema: EVIDENCE_SCHEMA,
    evidenceItem: 'supabase-forward-reconciliation-production-promotion',
    status: 'Complete',
    outcome: 'passed',
    generatedAt,
    targetSha,
    selectionDigest: manifest.selectionDigest,
    changeSet: manifest.changeSet,
    remoteBeforeCount: before.length,
    selectedMigrationCount: selected.length,
    remoteAfterCount: after.length,
    appliedVersions: added,
    checks: {
      exactShaBound: true,
      selectedMigrationsAbsentBeforePromotion: true,
      remoteHistoryPreserved: true,
      appliedSetEqualsSelectedSet: true,
      remoteAfterEqualsBeforePlusSelected: true,
      unauthorizedMigrationApplied: false,
      migrationHistoryRepairPerformed: false,
      unrestrictedDbPushPerformed: false,
    },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      databaseUrlsStored: false,
      rowDataStored: false,
    },
    truthBoundary: 'Complete proves only that the remote migration ledger changed from the captured pre-promotion history to exactly that history plus the exact-SHA selected forward reconciliation set. Live schema postconditions must pass separately; this evidence never authorizes migration-history repair or unrestricted db push.',
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

async function main(argv) {
  const [manifestPath, beforePath, afterPath, outputPath, expectedSha] = argv;
  assert(manifestPath && beforePath && afterPath && outputPath && expectedSha, 'usage: verify-forward-promotion-transition.mjs <manifest.json> <remote-before.json> <remote-after.json> <output.json> <expected-sha>');
  const evidence = verifyForwardPromotionTransition({
    manifest: await readJson(manifestPath),
    remoteBefore: await readJson(beforePath),
    remoteAfter: await readJson(afterPath),
    expectedSha,
  });
  await writeJson(outputPath, evidence);
  process.stdout.write(`${JSON.stringify({ status: evidence.status, targetSha: evidence.targetSha, selectedMigrationCount: evidence.selectedMigrationCount })}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
