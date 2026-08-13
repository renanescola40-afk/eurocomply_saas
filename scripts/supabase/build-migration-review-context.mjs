#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const INVENTORY_SCHEMA = 'risck-comply.supabase-migration-reconciliation-inventory.v1';
const CATALOG_SCHEMA = 'risck-comply.supabase-production-catalog.v1';
const CONTEXT_SCHEMA = 'risck-comply.supabase-migration-review-context.v1';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const cleanName = (value) => value.replaceAll('"', '');
const splitName = (value) => {
  const parts = cleanName(value).split('.');
  return parts.length === 1
    ? { schema: 'public', name: parts[0] }
    : { schema: parts[0], name: parts.slice(1).join('.') };
};

function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\r\n]*/g, ' ');
}

function addReference(map, kind, qualified, operation, parent = null) {
  const target = splitName(qualified);
  const key = [kind, target.schema, parent ?? '', target.name].join(':');
  const entry = map.get(key) ?? {
    kind,
    schema: target.schema,
    name: target.name,
    parent,
    operations: [],
  };
  if (!entry.operations.includes(operation)) entry.operations.push(operation);
  entry.operations.sort();
  map.set(key, entry);
}

export function analyzeMigrationSql(sql) {
  const clean = stripComments(sql);
  const refs = new Map();
  const identifier = '(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*)';
  const qualified = `${identifier}(?:\\.${identifier})?`;

  for (const match of clean.matchAll(new RegExp(`\\b(create|alter|drop)\\s+table(?:\\s+if\\s+(?:not\\s+)?exists)?\\s+(${qualified})`, 'gi'))) {
    addReference(refs, 'table', match[2], match[1].toUpperCase());
  }
  for (const match of clean.matchAll(new RegExp(`\\b(create(?:\\s+or\\s+replace)?|alter|drop)\\s+function(?:\\s+if\\s+exists)?\\s+(${qualified})`, 'gi'))) {
    addReference(refs, 'function', match[2], match[1].toUpperCase().replace(/\\s+/g, '_'));
  }
  for (const match of clean.matchAll(new RegExp(`\\b(create|alter|drop)\\s+policy\\s+(?:if\\s+exists\\s+)?(${identifier})\\s+on\\s+(${qualified})`, 'gi'))) {
    const table = splitName(match[3]);
    addReference(refs, 'policy', `${table.schema}.${match[2].trim()}`, match[1].toUpperCase(), table.name);
  }
  for (const match of clean.matchAll(new RegExp(`\\bcreate\\s+(?:unique\\s+)?index(?:\\s+if\\s+not\\s+exists)?\\s+(${identifier})\\s+on\\s+(${qualified})`, 'gi'))) {
    const table = splitName(match[2]);
    addReference(refs, 'index', `${table.schema}.${match[1]}`, 'CREATE', table.name);
  }

  const lower = clean.toLowerCase();
  return {
    references: [...refs.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    signals: {
      createTable: /\bcreate\s+table\b/.test(lower),
      alterTable: /\balter\s+table\b/.test(lower),
      destructiveDdl: /\b(drop|truncate)\b/.test(lower),
      dataMutation: /\b(insert\s+into|update\s+|delete\s+from)\b/.test(lower),
      securityDefiner: /\bsecurity\s+definer\b/.test(lower),
      rowLevelSecurity: /\brow\s+level\s+security\b/.test(lower),
      policyChange: /\b(create|alter|drop)\s+policy\b/.test(lower),
      grantOrRevoke: /\b(grant|revoke)\b/.test(lower),
    },
  };
}

function catalogKeys(catalog) {
  const keys = new Set();
  for (const row of catalog.tables ?? []) keys.add(`table:${row.schema}:${row.name}`);
  for (const row of catalog.functions ?? []) keys.add(`function:${row.schema}:${row.name}`);
  for (const row of catalog.policies ?? []) keys.add(`policy:${row.schema}:${row.table}:${row.name}`);
  for (const row of catalog.indexes ?? []) keys.add(`index:${row.schema}:${row.table}:${row.name}`);
  return keys;
}

export function liveState(reference, keys, capturedSchemas) {
  if (!capturedSchemas.has(reference.schema)) return 'NOT_CAPTURED';
  const parent = reference.parent ? `${reference.parent}:` : '';
  return keys.has(`${reference.kind}:${reference.schema}:${parent}${reference.name}`)
    ? 'PRESENT'
    : 'ABSENT';
}

async function buildContext(inventoryPath, catalogPath, migrationDir) {
  const [inventoryBytes, catalogBytes] = await Promise.all([
    readFile(inventoryPath),
    readFile(catalogPath),
  ]);
  const inventory = JSON.parse(inventoryBytes.toString('utf8'));
  const catalog = JSON.parse(catalogBytes.toString('utf8'));
  if (inventory.schema !== INVENTORY_SCHEMA) throw new Error('unsupported inventory schema');
  if (catalog.schema !== CATALOG_SCHEMA) throw new Error('unsupported catalog schema');
  if (!Array.isArray(catalog.schemas) || catalog.schemas.length === 0) {
    throw new Error('production catalog must declare captured schemas');
  }

  const filenames = (await readdir(migrationDir)).filter((name) => name.endsWith('.sql')).sort();
  const analyzed = new Map();
  for (const filename of filenames) {
    const sql = await readFile(path.join(migrationDir, filename), 'utf8');
    analyzed.set(filename, { sha256: sha256(sql), ...analyzeMigrationSql(sql) });
  }
  const keys = catalogKeys(catalog);
  const capturedSchemas = new Set(catalog.schemas);
  const items = inventory.items.map((item) => {
    const current = analyzed.get(item.filename);
    if (!current) throw new Error(`migration file missing: ${item.filename}`);
    if (current.sha256 !== item.sha256) throw new Error(`migration digest mismatch: ${item.filename}`);
    const references = current.references.map((ref) => ({
      ...ref,
      liveCatalogState: liveState(ref, keys, capturedSchemas),
    }));
    const present = references.filter((ref) => ref.liveCatalogState === 'PRESENT').length;
    const absent = references.filter((ref) => ref.liveCatalogState === 'ABSENT').length;
    const notCaptured = references.filter((ref) => ref.liveCatalogState === 'NOT_CAPTURED').length;
    return {
      filename: item.filename,
      sha256: item.sha256,
      sqlSignals: current.signals,
      objectReferences: references,
      liveCatalogMatchSummary: {
        referencedObjectCount: references.length,
        present,
        absent,
        notCaptured,
      },
      advisoryNotice: 'Catalog-name matches and SQL signals are reviewer aids only and do not prove migration equivalence or classification.',
    };
  });

  return {
    schema: CONTEXT_SCHEMA,
    generatedAt: new Date().toISOString(),
    inventorySha256: sha256(inventoryBytes),
    catalogSha256: sha256(catalogBytes),
    catalogCapturedAt: catalog.capturedAt,
    catalogSchemas: [...capturedSchemas].sort(),
    itemCount: items.length,
    items,
    acceptedDecisions: 0,
    productionWriteAuthorized: false,
    productionWritePerformed: false,
    nonCreditingNotice: 'Metadata-only context; human review remains required for every migration decision.',
  };
}

const [inventoryPath, catalogPath, migrationDir, outputPath] = process.argv.slice(2);
if (inventoryPath && catalogPath && migrationDir && outputPath) {
  buildContext(inventoryPath, catalogPath, migrationDir)
    .then((context) => writeFile(outputPath, `${JSON.stringify(context, null, 2)}\n`))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}