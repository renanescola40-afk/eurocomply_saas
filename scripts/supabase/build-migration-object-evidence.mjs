#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const positional = args.filter((argument) => !argument.startsWith('--'));
const inventoryPath = positional[0]
  ?? 'artifacts/supabase-production-migration-dry-run/drift/migration-reconciliation-inventory.json';
const catalogPath = positional[1]
  ?? 'artifacts/supabase-production-schema-evidence/catalog.txt';
const migrationsDir = positional[2] ?? 'supabase/migrations';
const outputDir = positional[3] ?? 'artifacts/supabase-migration-object-evidence';
const targetSha = readFlag('--target-sha=');
const dryRunId = readFlag('--dry-run-id=');
const schemaEvidenceRunId = readFlag('--schema-evidence-run-id=');
const generatedAt = new Date().toISOString();

function readFlag(prefix) {
  return args.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function fail(message) {
  console.error(`Migration object evidence generation failed: ${message}`);
  process.exit(1);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeIdentifier(value, defaultSchema = 'public') {
  const cleaned = value
    .trim()
    .replace(/[;,]+$/g, '')
    .split('.')
    .map((part) => part.trim().replace(/^"|"$/g, '').toLowerCase())
    .filter(Boolean);
  if (cleaned.length === 1) return { schema: defaultSchema, name: cleaned[0] };
  return { schema: cleaned.at(-2), name: cleaned.at(-1) };
}

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let singleQuoted = false;
  let doubleQuoted = false;
  let lineComment = false;
  let blockComment = false;
  let dollarTag = null;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];

    if (lineComment) {
      if (character === '\n') {
        lineComment = false;
        current += ' ';
      }
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
        current += ' ';
      }
      continue;
    }
    if (!singleQuoted && !doubleQuoted && !dollarTag && character === '-' && next === '-') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (!singleQuoted && !doubleQuoted && !dollarTag && character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }

    if (!singleQuoted && !doubleQuoted) {
      if (dollarTag) {
        if (sql.startsWith(dollarTag, index)) {
          current += dollarTag;
          index += dollarTag.length - 1;
          dollarTag = null;
        } else {
          current += character;
        }
        continue;
      }
      if (character === '$') {
        const tag = sql.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/)?.[0];
        if (tag) {
          dollarTag = tag;
          current += tag;
          index += tag.length - 1;
          continue;
        }
      }
    }

    if (!doubleQuoted && character === "'" && sql[index - 1] !== '\\') {
      if (singleQuoted && next === "'") {
        current += "''";
        index += 1;
        continue;
      }
      singleQuoted = !singleQuoted;
    } else if (!singleQuoted && character === '"' && sql[index - 1] !== '\\') {
      doubleQuoted = !doubleQuoted;
    }

    if (character === ';' && !singleQuoted && !doubleQuoted && !dollarTag) {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = '';
    } else {
      current += character;
    }
  }

  const trailing = current.trim();
  if (trailing) statements.push(trailing);
  return statements;
}

function splitTopLevelComma(value) {
  const parts = [];
  let current = '';
  let depth = 0;
  let singleQuoted = false;
  let doubleQuoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const next = value[index + 1];
    if (!doubleQuoted && character === "'") {
      if (singleQuoted && next === "'") {
        current += "''";
        index += 1;
        continue;
      }
      singleQuoted = !singleQuoted;
    } else if (!singleQuoted && character === '"') {
      doubleQuoted = !doubleQuoted;
    }
    if (!singleQuoted && !doubleQuoted) {
      if (character === '(') depth += 1;
      if (character === ')') depth -= 1;
      if (character === ',' && depth === 0) {
        if (current.trim()) parts.push(current.trim());
        current = '';
        continue;
      }
    }
    current += character;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseCatalog(text) {
  const catalog = {
    tables: new Map(),
    columns: new Set(),
    constraints: new Set(),
    indexes: new Set(),
    functions: new Set(),
    triggers: new Set(),
    policies: new Set(),
    grants: new Set(),
    migrations: new Set(),
  };

  for (const line of text.split(/\r?\n/)) {
    const cells = line.split('|');
    switch (cells[0]) {
      case 'table': {
        const key = `${cells[1]}.${cells[2]}`.toLowerCase();
        catalog.tables.set(key, {
          rlsEnabled: cells[4] === 't',
          forceRls: cells[5] === 't',
        });
        break;
      }
      case 'column':
        catalog.columns.add(`${cells[1]}.${cells[2]}.${cells[4]}`.toLowerCase());
        break;
      case 'constraint':
        catalog.constraints.add(`${cells[1]}.${cells[2]}.${cells[3]}`.toLowerCase());
        break;
      case 'index':
        catalog.indexes.add(`${cells[1]}.${cells[3]}`.toLowerCase());
        break;
      case 'function':
        catalog.functions.add(`${cells[1]}.${cells[2]}`.toLowerCase());
        break;
      case 'trigger':
        catalog.triggers.add(`${cells[1]}.${cells[2]}.${cells[3]}`.toLowerCase());
        break;
      case 'policy':
        catalog.policies.add(`${cells[1]}.${cells[2]}.${cells[3]}`.toLowerCase());
        break;
      case 'grant':
        catalog.grants.add(`${cells[1]}.${cells[2]}.${cells[3]}.${cells[4]}`.toLowerCase());
        break;
      case 'migration':
        catalog.migrations.add(String(cells[1] ?? '').trim());
        break;
      default:
        break;
    }
  }

  return catalog;
}

function evidence(kind, action, key, expectedPresent, observedPresent, statement) {
  return {
    kind,
    action,
    key,
    expectedState: expectedPresent ? 'PRESENT' : 'ABSENT',
    observedState: observedPresent ? 'PRESENT' : 'ABSENT',
    targetStateMatched: expectedPresent === observedPresent,
    statementSha256: sha256(statement),
  };
}

function extractStatementEvidence(statement, catalog) {
  const normalized = statement.replace(/\s+/g, ' ').trim();
  const upper = normalized.toUpperCase();
  const results = [];
  const unresolved = [];

  const createTable = normalized.match(/^CREATE\s+(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)\s*(?:\(([\s\S]*)\))?$/i);
  if (createTable) {
    const relation = normalizeIdentifier(createTable[1]);
    const key = `${relation.schema}.${relation.name}`;
    results.push(evidence('TABLE', 'CREATE', key, true, catalog.tables.has(key), normalized));
    if (createTable[2]) {
      for (const definition of splitTopLevelComma(createTable[2])) {
        const namedConstraint = definition.match(/^CONSTRAINT\s+("?[A-Za-z_][A-Za-z0-9_$]*"?)/i);
        if (namedConstraint) {
          const constraint = normalizeIdentifier(namedConstraint[1], relation.schema).name;
          const constraintKey = `${key}.${constraint}`;
          results.push(evidence('CONSTRAINT', 'CREATE', constraintKey, true, catalog.constraints.has(constraintKey), normalized));
          continue;
        }
        if (/^(PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY|EXCLUDE)\b/i.test(definition)) {
          unresolved.push({ reason: 'UNNAMED_TABLE_CONSTRAINT_REQUIRES_MANUAL_REVIEW', statementSha256: sha256(definition) });
          continue;
        }
        const columnMatch = definition.match(/^("?[A-Za-z_][A-Za-z0-9_$]*"?)\s+/);
        if (columnMatch) {
          const column = normalizeIdentifier(columnMatch[1], relation.schema).name;
          const columnKey = `${key}.${column}`;
          results.push(evidence('COLUMN', 'CREATE', columnKey, true, catalog.columns.has(columnKey), normalized));
          if (/\b(PRIMARY\s+KEY|UNIQUE|CHECK\s*\(|REFERENCES\s+)\b/i.test(definition)) {
            unresolved.push({ reason: 'INLINE_COLUMN_CONSTRAINT_REQUIRES_MANUAL_REVIEW', statementSha256: sha256(definition) });
          }
        } else {
          unresolved.push({ reason: 'CREATE_TABLE_DEFINITION_NOT_PARSED', statementSha256: sha256(definition) });
        }
      }
    }
  }

  const dropTable = normalized.match(/^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([^\s,]+)/i);
  if (dropTable) {
    const relation = normalizeIdentifier(dropTable[1]);
    const key = `${relation.schema}.${relation.name}`;
    results.push(evidence('TABLE', 'DROP', key, false, catalog.tables.has(key), normalized));
  }

  const alterTable = normalized.match(/^ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?([^\s]+)/i);
  if (alterTable) {
    const relation = normalizeIdentifier(alterTable[1]);
    const tableKey = `${relation.schema}.${relation.name}`;
    results.push(evidence('TABLE', 'ALTER_TARGET', tableKey, true, catalog.tables.has(tableKey), normalized));

    for (const match of normalized.matchAll(/\bADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[A-Za-z_][A-Za-z0-9_$]*"?)/gi)) {
      const column = normalizeIdentifier(match[1], relation.schema).name;
      const key = `${tableKey}.${column}`;
      results.push(evidence('COLUMN', 'ADD', key, true, catalog.columns.has(key), normalized));
    }
    for (const match of normalized.matchAll(/\bDROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?("?[A-Za-z_][A-Za-z0-9_$]*"?)/gi)) {
      const column = normalizeIdentifier(match[1], relation.schema).name;
      const key = `${tableKey}.${column}`;
      results.push(evidence('COLUMN', 'DROP', key, false, catalog.columns.has(key), normalized));
    }
    for (const match of normalized.matchAll(/\bADD\s+CONSTRAINT\s+("?[A-Za-z_][A-Za-z0-9_$]*"?)/gi)) {
      const constraint = normalizeIdentifier(match[1], relation.schema).name;
      const key = `${tableKey}.${constraint}`;
      results.push(evidence('CONSTRAINT', 'ADD', key, true, catalog.constraints.has(key), normalized));
    }
    for (const match of normalized.matchAll(/\bDROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?("?[A-Za-z_][A-Za-z0-9_$]*"?)/gi)) {
      const constraint = normalizeIdentifier(match[1], relation.schema).name;
      const key = `${tableKey}.${constraint}`;
      results.push(evidence('CONSTRAINT', 'DROP', key, false, catalog.constraints.has(key), normalized));
    }
    if (/\bENABLE\s+ROW\s+LEVEL\s+SECURITY\b/i.test(normalized)) {
      const observed = catalog.tables.get(tableKey)?.rlsEnabled === true;
      results.push(evidence('RLS', 'ENABLE', `${tableKey}.rls_enabled`, true, observed, normalized));
    }
    if (/\bFORCE\s+ROW\s+LEVEL\s+SECURITY\b/i.test(normalized)) {
      const observed = catalog.tables.get(tableKey)?.forceRls === true;
      results.push(evidence('RLS', 'FORCE', `${tableKey}.force_rls`, true, observed, normalized));
    }
    if (/\bDISABLE\s+ROW\s+LEVEL\s+SECURITY\b/i.test(normalized)) {
      const observed = catalog.tables.get(tableKey)?.rlsEnabled === true;
      results.push(evidence('RLS', 'DISABLE', `${tableKey}.rls_enabled`, false, observed, normalized));
    }
  }

  const createIndex = normalized.match(/^CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?([^\s]+)\s+ON\s+(?:ONLY\s+)?([^\s(]+)/i);
  if (createIndex) {
    const relation = normalizeIdentifier(createIndex[2]);
    const index = normalizeIdentifier(createIndex[1], relation.schema);
    const key = `${index.schema}.${index.name}`;
    results.push(evidence('INDEX', 'CREATE', key, true, catalog.indexes.has(key), normalized));
  }

  const dropIndex = normalized.match(/^DROP\s+INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+EXISTS\s+)?([^\s,]+)/i);
  if (dropIndex) {
    const index = normalizeIdentifier(dropIndex[1]);
    const key = `${index.schema}.${index.name}`;
    results.push(evidence('INDEX', 'DROP', key, false, catalog.indexes.has(key), normalized));
  }

  const createFunction = normalized.match(/^CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([^\s(]+)/i);
  if (createFunction) {
    const functionName = normalizeIdentifier(createFunction[1]);
    const key = `${functionName.schema}.${functionName.name}`;
    results.push(evidence('FUNCTION', 'CREATE_OR_REPLACE', key, true, catalog.functions.has(key), normalized));
  }

  const dropFunction = normalized.match(/^DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?([^\s(,]+)/i);
  if (dropFunction) {
    const functionName = normalizeIdentifier(dropFunction[1]);
    const key = `${functionName.schema}.${functionName.name}`;
    results.push(evidence('FUNCTION', 'DROP', key, false, catalog.functions.has(key), normalized));
  }

  const createPolicy = normalized.match(/^CREATE\s+POLICY\s+("[^"]+"|[^\s]+)\s+ON\s+([^\s]+)/i);
  if (createPolicy) {
    const relation = normalizeIdentifier(createPolicy[2]);
    const policy = normalizeIdentifier(createPolicy[1], relation.schema).name;
    const key = `${relation.schema}.${relation.name}.${policy}`;
    results.push(evidence('POLICY', 'CREATE', key, true, catalog.policies.has(key), normalized));
  }

  const dropPolicy = normalized.match(/^DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?("[^"]+"|[^\s]+)\s+ON\s+([^\s]+)/i);
  if (dropPolicy) {
    const relation = normalizeIdentifier(dropPolicy[2]);
    const policy = normalizeIdentifier(dropPolicy[1], relation.schema).name;
    const key = `${relation.schema}.${relation.name}.${policy}`;
    results.push(evidence('POLICY', 'DROP', key, false, catalog.policies.has(key), normalized));
  }

  const createTrigger = normalized.match(/^CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+([^\s]+)[\s\S]+?\s+ON\s+([^\s]+)/i);
  if (createTrigger) {
    const relation = normalizeIdentifier(createTrigger[2]);
    const trigger = normalizeIdentifier(createTrigger[1], relation.schema).name;
    const key = `${relation.schema}.${relation.name}.${trigger}`;
    results.push(evidence('TRIGGER', 'CREATE', key, true, catalog.triggers.has(key), normalized));
  }

  const dropTrigger = normalized.match(/^DROP\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?([^\s]+)\s+ON\s+([^\s]+)/i);
  if (dropTrigger) {
    const relation = normalizeIdentifier(dropTrigger[2]);
    const trigger = normalizeIdentifier(dropTrigger[1], relation.schema).name;
    const key = `${relation.schema}.${relation.name}.${trigger}`;
    results.push(evidence('TRIGGER', 'DROP', key, false, catalog.triggers.has(key), normalized));
  }

  const tableGrant = normalized.match(/^(GRANT|REVOKE)\s+(.+?)\s+ON\s+(?:TABLE\s+)?([^\s]+)\s+(?:TO|FROM)\s+([^\s,]+)/i);
  if (tableGrant && !/\bFUNCTION\b/i.test(normalized)) {
    const action = tableGrant[1].toUpperCase();
    const relation = normalizeIdentifier(tableGrant[3]);
    const grantee = normalizeIdentifier(tableGrant[4], relation.schema).name;
    const privileges = tableGrant[2].split(',').map((value) => value.trim().toLowerCase());
    for (const privilege of privileges) {
      const key = `${relation.schema}.${relation.name}.${grantee}.${privilege}`;
      results.push(evidence('TABLE_GRANT', action, key, action === 'GRANT', catalog.grants.has(key), normalized));
    }
  }

  const dataOnly = /^(INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM|TRUNCATE\s+)/i.test(normalized);
  const dynamicSql = /\bEXECUTE\s+(?:FORMAT\s*\(|[^\s])|^DO\s+\$/i.test(normalized);
  const unsupportedDdl = /^(CREATE|ALTER|DROP)\s+(TYPE|EXTENSION|SCHEMA|VIEW|MATERIALIZED\s+VIEW|SEQUENCE|DOMAIN)\b/i.test(normalized);
  const configurationStatement = /^(SET|RESET|COMMENT\s+ON)\b/i.test(normalized);

  if (dataOnly) unresolved.push({ reason: 'DATA_STATE_NOT_PROVABLE_FROM_SCHEMA_CATALOG', statementSha256: sha256(normalized) });
  if (dynamicSql) unresolved.push({ reason: 'DYNAMIC_SQL_REQUIRES_MANUAL_REVIEW', statementSha256: sha256(normalized) });
  if (unsupportedDdl) unresolved.push({ reason: 'OBJECT_KIND_NOT_CAPTURED_BY_SCHEMA_EVIDENCE', statementSha256: sha256(normalized) });
  if (results.length === 0 && !dataOnly && !dynamicSql && !unsupportedDdl && !configurationStatement && upper !== 'BEGIN' && upper !== 'COMMIT') {
    unresolved.push({ reason: 'STATEMENT_NOT_DETERMINISTICALLY_PARSED', statementSha256: sha256(normalized) });
  }

  return { results, unresolved };
}

function candidateFor(item, operations, unresolved) {
  const matched = operations.filter((operation) => operation.targetStateMatched).length;
  const unmatched = operations.length - matched;
  const duplicate = item.duplicateVersion === true;
  const invalid = item.classificationReasons.includes('INVALID_LOCAL_FILENAME_OR_TIMESTAMP');
  let objectState = 'UNPROVABLE';
  if (operations.length > 0 && unmatched === 0 && unresolved.length === 0) objectState = 'TARGET_STATE_PRESENT';
  else if (operations.length > 0 && matched === 0 && unresolved.length === 0) objectState = 'TARGET_STATE_ABSENT';
  else if (operations.length > 0) objectState = 'MIXED_OR_PARTIAL';

  let candidateClassification = 'REQUIRES_SPLIT_REVIEW';
  let confidence = 'LOW';
  if (!duplicate && objectState === 'TARGET_STATE_PRESENT') {
    candidateClassification = 'ALREADY_PRESENT_IN_SCHEMA';
    confidence = invalid ? 'MEDIUM' : 'HIGH';
  } else if (!duplicate && objectState === 'TARGET_STATE_ABSENT') {
    candidateClassification = 'PENDING_DEPLOYMENT';
    confidence = invalid ? 'LOW' : 'MEDIUM';
  } else if (duplicate && objectState !== 'UNPROVABLE') {
    confidence = 'MEDIUM';
  }

  const rationale = [
    `${matched}/${operations.length} parsed object target states match the production catalog.`,
    unresolved.length > 0 ? `${unresolved.length} statement(s) remain unprovable by catalog metadata.` : 'No parsed statement remains unproved by the catalog parser.',
    duplicate ? 'The file shares a migration version and therefore requires explicit duplicate-history resolution.' : null,
    invalid ? 'The filename or timestamp is invalid and requires explicit history treatment.' : null,
  ].filter(Boolean).join(' ');

  return {
    objectState,
    candidateClassification,
    confidence,
    rationale,
    matchedOperations: matched,
    unmatchedOperations: unmatched,
    unresolvedStatements: unresolved.length,
    humanDecisionRequired: true,
    automaticClassificationAllowed: false,
  };
}

let inventoryBytes;
let inventory;
let catalogBytes;
try {
  inventoryBytes = await readFile(inventoryPath);
  inventory = JSON.parse(inventoryBytes.toString('utf8'));
  catalogBytes = await readFile(catalogPath);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

if (inventory?.schema !== 'risck-comply.supabase-migration-reconciliation-inventory.v1') {
  fail('unsupported migration reconciliation inventory schema');
}
if (!Array.isArray(inventory.items) || inventory.items.length === 0) {
  fail('inventory.items must be a non-empty array');
}
const catalogText = catalogBytes.toString('utf8');
if (!/^table\|/m.test(catalogText) || !/^migration\|/m.test(catalogText)) {
  fail('catalog does not contain the required table and migration evidence sections');
}
if (targetSha && !/^[a-f0-9]{40}$/.test(targetSha)) fail('--target-sha must be a lowercase 40-character SHA');
if (dryRunId && !/^\d+$/.test(dryRunId)) fail('--dry-run-id must be numeric');
if (schemaEvidenceRunId && !/^\d+$/.test(schemaEvidenceRunId)) fail('--schema-evidence-run-id must be numeric');

const catalog = parseCatalog(catalogText);
const sortedItems = [...inventory.items].sort((left, right) => (
  [left.version ?? '', left.filename, left.sha256].join(':')
    .localeCompare([right.version ?? '', right.filename, right.sha256].join(':'))
));
const items = [];

for (const source of sortedItems) {
  const sqlPath = path.join(migrationsDir, source.filename);
  const sqlBytes = await readFile(sqlPath);
  const observedDigest = sha256(sqlBytes);
  if (observedDigest !== source.sha256) {
    fail(`migration digest mismatch for ${source.filename}`);
  }

  const operations = [];
  const unresolved = [];
  for (const statement of splitSqlStatements(sqlBytes.toString('utf8'))) {
    const statementEvidence = extractStatementEvidence(statement, catalog);
    operations.push(...statementEvidence.results);
    unresolved.push(...statementEvidence.unresolved);
  }
  const candidate = candidateFor(source, operations, unresolved);
  const objectProofDigest = sha256(JSON.stringify({
    migrationSha256: source.sha256,
    catalogSha256: sha256(catalogBytes),
    operations,
    unresolved,
  }));

  items.push({
    version: source.version,
    filename: source.filename,
    sha256: source.sha256,
    byteLength: source.byteLength,
    duplicateVersion: source.duplicateVersion === true,
    classificationReasons: source.classificationReasons,
    operations,
    unresolved,
    objectProofDigest,
    candidate,
  });
}

const counts = {
  inventoryItems: items.length,
  targetStatePresent: items.filter((item) => item.candidate.objectState === 'TARGET_STATE_PRESENT').length,
  targetStateAbsent: items.filter((item) => item.candidate.objectState === 'TARGET_STATE_ABSENT').length,
  mixedOrPartial: items.filter((item) => item.candidate.objectState === 'MIXED_OR_PARTIAL').length,
  unprovable: items.filter((item) => item.candidate.objectState === 'UNPROVABLE').length,
  candidateAlreadyPresent: items.filter((item) => item.candidate.candidateClassification === 'ALREADY_PRESENT_IN_SCHEMA').length,
  candidatePendingDeployment: items.filter((item) => item.candidate.candidateClassification === 'PENDING_DEPLOYMENT').length,
  candidateSplitReview: items.filter((item) => item.candidate.candidateClassification === 'REQUIRES_SPLIT_REVIEW').length,
};

const report = {
  schema: 'risck-comply.supabase-migration-object-evidence.v1',
  status: 'HUMAN_REVIEW_REQUIRED',
  generatedAt,
  source: {
    targetSha,
    dryRunId,
    schemaEvidenceRunId,
    inventoryPath,
    inventorySha256: sha256(inventoryBytes),
    catalogPath,
    catalogSha256: sha256(catalogBytes),
    migrationsDirectory: migrationsDir,
  },
  counts,
  items,
  acceptedDecisions: 0,
  safety: {
    databaseModified: false,
    migrationHistoryModified: false,
    productionPushAuthorized: false,
    automaticClassificationAllowed: false,
    candidateEvidenceIsApproval: false,
  },
};

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'migration-object-evidence.json'), `${JSON.stringify(report, null, 2)}\n`);
const batchSize = 25;
const batchCount = Math.ceil(items.length / batchSize);
for (let index = 0; index < batchCount; index += 1) {
  const batchNumber = index + 1;
  const batchItems = items.slice(index * batchSize, (index + 1) * batchSize);
  const batchId = `batch-${String(batchNumber).padStart(3, '0')}-of-${String(batchCount).padStart(3, '0')}`;
  await writeFile(path.join(outputDir, `${batchId}.json`), `${JSON.stringify({
    schema: 'risck-comply.supabase-migration-object-evidence-batch.v1',
    status: 'HUMAN_REVIEW_REQUIRED',
    batchId,
    batchNumber,
    batchCount,
    source: report.source,
    items: batchItems,
    acceptedDecisions: 0,
  }, null, 2)}\n`);
}

const markdown = [
  '# Supabase migration object evidence',
  '',
  `Status: **${report.status}**`,
  '',
  `- Target SHA: \`${targetSha ?? 'not supplied'}\``,
  `- Inventory items: ${counts.inventoryItems}`,
  `- Target state present: ${counts.targetStatePresent}`,
  `- Target state absent: ${counts.targetStateAbsent}`,
  `- Mixed or partial: ${counts.mixedOrPartial}`,
  `- Unprovable from schema catalog: ${counts.unprovable}`,
  `- Candidate already present: ${counts.candidateAlreadyPresent}`,
  `- Candidate pending deployment: ${counts.candidatePendingDeployment}`,
  `- Candidate split review: ${counts.candidateSplitReview}`,
  `- Accepted decisions: ${report.acceptedDecisions}`,
  '',
  '## Truth boundary',
  '',
  '- This artifact extracts and matches object-level evidence; it does not classify migrations automatically.',
  '- Duplicate versions, invalid timestamps, data mutations, dynamic SQL and unsupported object kinds remain fail-closed.',
  '- `PENDING_DEPLOYMENT` candidates still require a staging rehearsal, deploy order and rollback evidence.',
  '- `ALREADY_PRESENT_IN_SCHEMA` candidates still require independent review before any migration-history repair.',
  '- No database object or migration-history record was changed.',
  '',
].join('\n');
await writeFile(path.join(outputDir, 'migration-object-evidence.md'), markdown);
process.stdout.write(markdown);
