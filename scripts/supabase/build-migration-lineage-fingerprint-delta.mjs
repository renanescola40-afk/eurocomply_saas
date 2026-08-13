#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const INVENTORY_SCHEMA = 'risck-comply.supabase-migration-reconciliation-inventory.v1';
const RECORD_SET_SCHEMA = 'risck-comply.supabase-migration-owner-review-records.v1';
const OUTPUT_SCHEMA = 'risck-comply.supabase-migration-lineage-fingerprint-delta.v1';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const isDigest = (value) => /^[a-f0-9]{64}$/i.test(String(value ?? ''));

function indexInventory(inventory, label, blockers) {
  if (inventory?.schema !== INVENTORY_SCHEMA || !Array.isArray(inventory?.items)) {
    blockers.push(`${label} inventory is invalid`);
    return new Map();
  }
  const index = new Map();
  for (const item of inventory.items) {
    if (!item?.filename || !isDigest(item.sha256)) {
      blockers.push(`${label} inventory contains an invalid fingerprint`);
      continue;
    }
    if (index.has(item.filename)) {
      blockers.push(`${label} inventory contains duplicate filename: ${item.filename}`);
      continue;
    }
    index.set(item.filename, item);
  }
  return index;
}

export function buildMigrationLineageFingerprintDelta({ sourceInventory, sourceInventorySha256, targetInventory, targetInventorySha256, recordSet }) {
  const blockers = [];
  if (!isDigest(sourceInventorySha256)) blockers.push('source inventory digest is invalid');
  if (!isDigest(targetInventorySha256)) blockers.push('target inventory digest is invalid');
  const source = indexInventory(sourceInventory, 'source', blockers);
  const target = indexInventory(targetInventory, 'target', blockers);
  if (recordSet?.schema !== RECORD_SET_SCHEMA || !Array.isArray(recordSet?.records)) blockers.push('historical fingerprint record set is invalid');
  if (!isDigest(recordSet?.inventorySha256)) blockers.push('historical fingerprint record set digest is invalid');
  else if (recordSet.inventorySha256.toLowerCase() !== String(sourceInventorySha256).toLowerCase()) blockers.push('historical fingerprint record set is not bound to the source inventory');

  const historical = new Map();
  let duplicateHistoricalRows = 0;
  for (const record of Array.isArray(recordSet?.records) ? recordSet.records : []) {
    if (!record?.filename || !isDigest(record.sha256)) {
      blockers.push('historical fingerprint record is invalid');
      continue;
    }
    const sourceItem = source.get(record.filename);
    if (!sourceItem) {
      blockers.push(`historical fingerprint missing from source inventory: ${record.filename}`);
      continue;
    }
    if (String(sourceItem.sha256).toLowerCase() !== record.sha256.toLowerCase()) {
      blockers.push(`historical fingerprint differs from reviewed source bytes: ${record.filename}`);
      continue;
    }
    const existing = historical.get(record.filename);
    if (existing) {
      if (existing.toLowerCase() !== record.sha256.toLowerCase()) blockers.push(`historical fingerprint conflict: ${record.filename}`);
      else duplicateHistoricalRows += 1;
      continue;
    }
    historical.set(record.filename, record.sha256);
  }

  const exactMatches = [];
  const changedMatches = [];
  const removedHistorical = [];
  const exactNames = new Set();
  for (const [filename, historicalSha] of historical.entries()) {
    const current = target.get(filename);
    if (!current) {
      removedHistorical.push({ filename, historicalSha256: historicalSha });
      continue;
    }
    if (String(current.sha256).toLowerCase() !== historicalSha.toLowerCase()) {
      changedMatches.push({ filename, historicalSha256: historicalSha, currentSha256: current.sha256 });
      continue;
    }
    exactNames.add(filename);
    exactMatches.push({ filename, version: current.version ?? null, sha256: current.sha256 });
  }

  const currentUnmatched = [...target.values()]
    .filter((item) => !exactNames.has(item.filename))
    .map((item) => ({ filename: item.filename, version: item.version ?? null, sha256: item.sha256, classificationReasons: item.classificationReasons ?? [] }));
  const byFilename = (a, b) => a.filename.localeCompare(b.filename);
  exactMatches.sort(byFilename);
  changedMatches.sort(byFilename);
  removedHistorical.sort(byFilename);
  currentUnmatched.sort(byFilename);

  return {
    schema: OUTPUT_SCHEMA,
    generatedAt: new Date().toISOString(),
    status: blockers.length ? 'BLOCKED' : 'FINGERPRINT_DELTA_READY',
    sourceInventorySha256,
    targetInventorySha256,
    counts: {
      sourceInventoryItems: source.size,
      targetInventoryItems: target.size,
      historicalRows: Array.isArray(recordSet?.records) ? recordSet.records.length : 0,
      historicalUniqueFingerprints: historical.size,
      duplicateHistoricalRows,
      exactMatches: exactMatches.length,
      changedMatches: changedMatches.length,
      removedHistorical: removedHistorical.length,
      currentUnmatched: currentUnmatched.length,
    },
    blockers,
    exactMatches,
    changedMatches,
    removedHistorical,
    currentUnmatched,
    safety: {
      historicalRecordSetCreditedToTarget: false,
      automaticDecisionAllowed: false,
      stagingAuthorized: false,
      migrationExecutionAuthorized: false,
      productionWriteAuthorized: false,
    },
    notice: 'This output proves fingerprint identity only. It does not transfer a historical decision to the target inventory or authorize database execution.',
  };
}

async function main() {
  const [sourcePath, targetPath, recordsPath, outputPath = 'artifacts/supabase-migration-lineage-fingerprint-delta/delta.json'] = process.argv.slice(2);
  if (!sourcePath || !targetPath || !recordsPath) throw new Error('usage: source-inventory.json target-inventory.json historical-records.json [output.json]');
  const sourceBytes = await readFile(sourcePath);
  const targetBytes = await readFile(targetPath);
  const recordBytes = await readFile(recordsPath);
  const result = buildMigrationLineageFingerprintDelta({
    sourceInventory: JSON.parse(sourceBytes.toString('utf8')),
    sourceInventorySha256: sha256(sourceBytes),
    targetInventory: JSON.parse(targetBytes.toString('utf8')),
    targetInventorySha256: sha256(targetBytes),
    recordSet: JSON.parse(recordBytes.toString('utf8')),
  });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ status: result.status, counts: result.counts, blockers: result.blockers }, null, 2)}\n`);
  if (result.status === 'BLOCKED') process.exitCode = 2;
}
const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
