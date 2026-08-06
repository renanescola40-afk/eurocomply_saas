#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const FULL_SHA = /^[0-9a-f]{40}$/;
const ALLOWED_KINDS = new Set(['TABLE', 'VIEW', 'FUNCTION', 'TYPE', 'INDEX', 'POLICY']);
const PSQL_CONTROL_ROWS = new Set(['BEGIN', 'COMMIT']);

function normalizeObjectName(value) {
  return value.replaceAll('"', '').trim().toLowerCase();
}

export function parseLiveCatalogTsv(raw, {
  releaseSha,
  capturedAt = new Date().toISOString(),
} = {}) {
  const normalizedSha = String(releaseSha || '').trim().toLowerCase();
  if (!FULL_SHA.test(normalizedSha)) {
    throw new Error('release_sha_invalid');
  }

  const objects = [];
  const lines = String(raw || '').split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd();
    if (!line.trim()) continue;
    if (PSQL_CONTROL_ROWS.has(line.trim())) continue;

    const separator = line.indexOf('\t');
    if (separator <= 0 || separator === line.length - 1) {
      throw new Error(`live_catalog_row_invalid:${index + 1}`);
    }

    const kind = line.slice(0, separator).trim().toUpperCase();
    const name = normalizeObjectName(line.slice(separator + 1));

    if (!ALLOWED_KINDS.has(kind)) {
      throw new Error(`live_catalog_kind_invalid:${index + 1}`);
    }
    if (!name) {
      throw new Error(`live_catalog_name_invalid:${index + 1}`);
    }

    objects.push({ kind, name });
  }

  if (objects.length === 0) {
    throw new Error('live_catalog_empty');
  }

  objects.sort((left, right) => `${left.kind}:${left.name}`.localeCompare(`${right.kind}:${right.name}`));

  return {
    schema: 'risck-comply.supabase-live-schema-catalog.v1',
    releaseSha: normalizedSha,
    capturedAt,
    transactionMode: 'READ ONLY',
    objects,
  };
}

function runCli() {
  const [inputPath, outputPath, releaseSha] = process.argv.slice(2);
  if (!inputPath || !outputPath || !releaseSha) {
    throw new Error('usage: normalize-live-schema-catalog.mjs <input.tsv> <output.json> <release-sha>');
  }

  const result = parseLiveCatalogTsv(readFileSync(inputPath, 'utf8'), { releaseSha });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'live_catalog_normalization_failed');
    process.exit(1);
  }
}
