#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const IDENT = String.raw`(?:"[^"]+"|[a-zA-Z_][\w$]*)`;
const QUALIFIED = new RegExp(`(${IDENT})(?:\.(${IDENT}))?`, 'g');
const OBJECT_PATTERNS = [
  ['TABLE', /\b(?:create|alter|drop)\s+table(?:\s+if\s+(?:not\s+)?exists)?\s+([^\s(;]+)/ig],
  ['INDEX', /\b(?:create(?:\s+unique)?|drop)\s+index(?:\s+if\s+(?:not\s+)?exists)?\s+([^\s(;]+)/ig],
  ['FUNCTION', /\b(?:create(?:\s+or\s+replace)?|alter|drop)\s+function\s+([^\s(]+)/ig],
  ['VIEW', /\b(?:create(?:\s+or\s+replace)?|alter|drop)\s+(?:materialized\s+)?view\s+([^\s(;]+)/ig],
  ['TYPE', /\b(?:create|alter|drop)\s+type\s+([^\s(;]+)/ig],
  ['POLICY', /\b(?:create|alter|drop)\s+policy\s+(?:"[^"]+"|[^\s]+)\s+on\s+([^\s(;]+)/ig],
  ['TRIGGER', /\b(?:create|drop)\s+trigger\s+(?:"[^"]+"|[^\s]+)\s+on\s+([^\s(;]+)/ig],
];

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const clean = (value) => value.replace(/[;,]$/, '').replaceAll('"', '').toLowerCase();

export function extractObjects(sql) {
  const objects = new Map();
  for (const [kind, pattern] of OBJECT_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of sql.matchAll(pattern)) {
      const name = clean(match[1]);
      if (!name || !QUALIFIED.test(name)) continue;
      QUALIFIED.lastIndex = 0;
      objects.set(`${kind}:${name}`, { kind, name });
    }
  }
  return [...objects.values()].sort((a, b) => `${a.kind}:${a.name}`.localeCompare(`${b.kind}:${b.name}`));
}

export function compareWithLiveCatalog(migrations, catalog) {
  const live = new Set((catalog.objects ?? []).map((item) => `${item.kind}:${item.name}`));
  return migrations.map((migration) => ({
    ...migration,
    objects: migration.objects.map((object) => ({
      ...object,
      presentInLiveCatalog: live.has(`${object.kind}:${object.name}`),
    })),
    allExtractedObjectsPresent: migration.objects.length > 0 && migration.objects.every((object) => live.has(`${object.kind}:${object.name}`)),
    automaticClassification: null,
    reviewRequired: true,
  }));
}

async function main() {
  const [inventoryPath, catalogPath, outputDir = 'artifacts/supabase-schema-evidence'] = process.argv.slice(2);
  if (!inventoryPath || !catalogPath) throw new Error('usage: inventory.json live-catalog.json [output-dir]');
  const inventoryBytes = await readFile(inventoryPath);
  const inventory = JSON.parse(inventoryBytes);
  const catalogBytes = await readFile(catalogPath);
  const catalog = JSON.parse(catalogBytes);
  if (inventory.schema !== 'risck-comply.supabase-migration-reconciliation-inventory.v1') throw new Error('unsupported inventory schema');
  if (catalog.schema !== 'risck-comply.supabase-live-schema-catalog.v1') throw new Error('unsupported live catalog schema');

  const migrations = [];
  for (const item of inventory.items) {
    const sqlPath = path.join('supabase/migrations', item.filename);
    const bytes = await readFile(sqlPath);
    if (sha256(bytes) !== item.sha256) throw new Error(`digest mismatch: ${item.filename}`);
    migrations.push({ filename: item.filename, sha256: item.sha256, version: item.version, objects: extractObjects(bytes.toString('utf8')) });
  }

  const report = {
    schema: 'risck-comply.supabase-migration-object-evidence.v1',
    status: 'HUMAN_REVIEW_REQUIRED',
    inventorySha256: sha256(inventoryBytes),
    liveCatalogSha256: sha256(catalogBytes),
    generatedAt: new Date().toISOString(),
    migrations: compareWithLiveCatalog(migrations, catalog),
    nonCreditingNotice: 'Object presence is supporting evidence only and never automatically classifies a migration or authorizes migration repair/deployment.',
  };
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'migration-object-evidence.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ migrations: report.migrations.length, status: report.status }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.message); process.exit(1); });
