#!/usr/bin/env node

import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  candidateFor,
  sha256,
  splitSqlStatements,
} from './migration-object-evidence-core.mjs';

const TARGET_REASONS = new Set([
  'INLINE_COLUMN_CONSTRAINT_REQUIRES_MANUAL_REVIEW',
  'UNNAMED_TABLE_CONSTRAINT_REQUIRES_MANUAL_REVIEW',
  'ALTER_TABLE_ACTION_NOT_PROVABLE_FROM_CATALOG',
]);

function normalizeIdentifier(value, defaultSchema = 'public') {
  const parts = String(value)
    .trim()
    .replace(/[;,]+$/g, '')
    .split('.')
    .map((part) => part.trim().replace(/^"|"$/g, '').toLowerCase())
    .filter(Boolean);
  if (parts.length === 1) return { schema: defaultSchema, name: parts[0] };
  return { schema: parts.at(-2), name: parts.at(-1) };
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

function normalizeSql(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replaceAll('"', '')
    .replace(/\bpublic\./g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),=])\s*/g, '$1')
    .replace(/;$/g, '');
}

function stripBalancedOuterParentheses(value) {
  let current = value.trim();
  while (current.startsWith('(') && current.endsWith(')')) {
    let depth = 0;
    let enclosesAll = true;
    for (let index = 0; index < current.length; index += 1) {
      if (current[index] === '(') depth += 1;
      if (current[index] === ')') depth -= 1;
      if (depth === 0 && index < current.length - 1) {
        enclosesAll = false;
        break;
      }
    }
    if (!enclosesAll) break;
    current = current.slice(1, -1).trim();
  }
  return current;
}

function normalizeConstraint(value) {
  let normalized = normalizeSql(value)
    .replace(/^constraint\s+[^\s]+\s+/, '')
    .trim();
  if (normalized.startsWith('check(') && normalized.endsWith(')')) {
    const expression = normalized.slice(6, -1);
    normalized = `check(${stripBalancedOuterParentheses(expression)})`;
  }
  return normalized;
}

function normalizeType(value) {
  return normalizeSql(value)
    .replace(/^pg_catalog\./, '')
    .replace(/\s+/g, ' ')
    .replace(/^character varying$/, 'varchar')
    .replace(/^timestamp with time zone$/, 'timestamptz')
    .replace(/^timestamp without time zone$/, 'timestamp')
    .replace(/^time with time zone$/, 'timetz')
    .replace(/^time without time zone$/, 'time')
    .replace(/^double precision$/, 'float8')
    .replace(/^integer$/, 'int4')
    .replace(/^bigint$/, 'int8')
    .replace(/^smallint$/, 'int2')
    .replace(/^boolean$/, 'bool')
    .replace(/^real$/, 'float4');
}

function catalogTypeCandidates(column) {
  const candidates = new Set([
    normalizeType(column.dataType),
    normalizeType(column.udtName),
  ]);
  if (column.dataType.toLowerCase() === 'array' && column.udtName.startsWith('_')) {
    candidates.add(`${normalizeType(column.udtName.slice(1))}[]`);
  }
  return candidates;
}

function normalizeDefault(value) {
  return stripBalancedOuterParentheses(normalizeSql(value));
}

function stripCompleteTrailingCastChain(value) {
  let current = stripBalancedOuterParentheses(value.trim());
  const castPattern = /::(?:[a-z_][a-z0-9_$]*\.)?(?:"[^"]+"|[a-z_][a-z0-9_$]*)(?:\s+(?:with(?:out)?\s+time\s+zone|precision|varying))?(?:\[\])?(?:\(\d+(?:,\d+)?\))?$/i;
  while (castPattern.test(current)) {
    current = stripBalancedOuterParentheses(current.replace(castPattern, '').trim());
  }
  return current;
}

function defaultsEquivalent(expected, observed) {
  const left = normalizeDefault(expected);
  const right = normalizeDefault(observed);
  if (left === right) return true;
  const observedWithoutCasts = stripCompleteTrailingCastChain(right);
  if (left === observedWithoutCasts) return true;
  if (left === 'current_timestamp' && observedWithoutCasts === 'now()') return true;
  if (left === 'now()' && observedWithoutCasts === 'current_timestamp') return true;
  return false;
}

function parseCatalog(text) {
  const catalog = {
    columns: new Map(),
    constraintDefinitions: new Map(),
  };
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split('|');
    if (cells[0] === 'column') {
      const key = `${cells[1]}.${cells[2]}.${cells[4]}`.toLowerCase();
      catalog.columns.set(key, {
        dataType: String(cells[5] ?? ''),
        udtName: String(cells[6] ?? ''),
        nullable: String(cells[7] ?? '').toUpperCase() === 'YES',
        defaultValue: String(cells[8] ?? ''),
      });
    }
    if (cells[0] === 'constraint') {
      const tableKey = `${cells[1]}.${cells[2]}`.toLowerCase();
      const definitions = catalog.constraintDefinitions.get(tableKey) ?? new Set();
      definitions.add(normalizeConstraint(cells.slice(5).join('|')));
      catalog.constraintDefinitions.set(tableKey, definitions);
    }
  }
  return catalog;
}

function operation(kind, action, key, expectedState, observedState, source) {
  return {
    kind,
    action,
    key,
    expectedState,
    observedState,
    targetStateMatched: expectedState === observedState,
    statementSha256: sha256(source),
    evidenceLayer: 'SEMANTIC_CATALOG_REFINEMENT',
  };
}

function constraintOperation(tableKey, definition, catalog, source, action = 'CREATE') {
  const normalized = normalizeConstraint(definition);
  const observed = catalog.constraintDefinitions.get(tableKey)?.has(normalized) === true;
  return operation(
    'CONSTRAINT_DEFINITION',
    action,
    `${tableKey}.${sha256(normalized).slice(0, 16)}`,
    action === 'DROP' ? 'ABSENT' : 'PRESENT',
    observed ? 'PRESENT' : 'ABSENT',
    source,
  );
}

function findConstraintStart(rest) {
  const match = rest.match(/\s+(?=(?:COLLATE|DEFAULT|GENERATED|NOT\s+NULL|NULL\b|UNIQUE\b|PRIMARY\s+KEY|CHECK\s*\(|REFERENCES\b))/i);
  return match?.index ?? -1;
}

function extractDefault(tail) {
  const match = tail.match(/\bDEFAULT\s+([\s\S]+?)(?=\s+(?:COLLATE|GENERATED|NOT\s+NULL|NULL\b|UNIQUE\b|PRIMARY\s+KEY|CHECK\s*\(|REFERENCES\b)|$)/i);
  return match?.[1]?.trim() ?? null;
}

function extractReferences(tail, column) {
  const match = tail.match(/\bREFERENCES\s+([^\s(]+)\s*\(([^)]+)\)([\s\S]*?)(?=\s+(?:COLLATE|DEFAULT|GENERATED|NOT\s+NULL|NULL\b|UNIQUE\b|PRIMARY\s+KEY|CHECK\s*\()|$)/i);
  if (!match) return null;
  const relation = normalizeIdentifier(match[1]);
  const suffix = match[3].trim();
  return `FOREIGN KEY (${column}) REFERENCES ${relation.schema}.${relation.name} (${match[2]})${suffix ? ` ${suffix}` : ''}`;
}

function analyzeColumnDefinition(tableKey, definition, catalog) {
  const columnMatch = definition.match(/^("?[A-Za-z_][A-Za-z0-9_$]*"?)\s+([\s\S]+)$/);
  if (!columnMatch) return { operations: [], fullyResolved: false };
  const column = normalizeIdentifier(columnMatch[1]).name;
  const rest = columnMatch[2].trim();
  const constraintStart = findConstraintStart(rest);
  const typeText = (constraintStart >= 0 ? rest.slice(0, constraintStart) : rest).trim();
  const tail = constraintStart >= 0 ? rest.slice(constraintStart).trim() : '';
  const key = `${tableKey}.${column}`;
  const catalogColumn = catalog.columns.get(key);
  const operations = [];
  let fullyResolved = true;

  if (!catalogColumn) {
    operations.push(operation('COLUMN_TYPE', 'MATCH', `${key}.type`, 'PRESENT', 'ABSENT', definition));
  } else if (/\([^)]*\)/.test(typeText) && !/\[\]$/.test(typeText)) {
    fullyResolved = false;
  } else {
    const expectedType = normalizeType(typeText);
    const typeMatched = catalogTypeCandidates(catalogColumn).has(expectedType);
    operations.push(operation(
      'COLUMN_TYPE',
      'MATCH',
      `${key}.type.${expectedType}`,
      'PRESENT',
      typeMatched ? 'PRESENT' : 'ABSENT',
      definition,
    ));
  }

  if (/\bNOT\s+NULL\b/i.test(tail)) {
    operations.push(operation(
      'COLUMN_NULLABILITY',
      'SET_NOT_NULL',
      `${key}.not_null`,
      'PRESENT',
      catalogColumn && !catalogColumn.nullable ? 'PRESENT' : 'ABSENT',
      definition,
    ));
  }

  const defaultValue = extractDefault(tail);
  if (defaultValue !== null) {
    const matched = catalogColumn
      ? defaultsEquivalent(defaultValue, catalogColumn.defaultValue)
      : false;
    operations.push(operation(
      'COLUMN_DEFAULT',
      'SET_DEFAULT',
      `${key}.default.${sha256(normalizeDefault(defaultValue)).slice(0, 16)}`,
      'PRESENT',
      matched ? 'PRESENT' : 'ABSENT',
      definition,
    ));
  }

  if (/\bPRIMARY\s+KEY\b/i.test(tail)) {
    operations.push(constraintOperation(tableKey, `PRIMARY KEY (${column})`, catalog, definition));
  }
  if (/\bUNIQUE\b/i.test(tail)) {
    operations.push(constraintOperation(tableKey, `UNIQUE (${column})`, catalog, definition));
  }
  const references = extractReferences(tail, column);
  if (references) operations.push(constraintOperation(tableKey, references, catalog, definition));

  if (/\bCHECK\s*\(/i.test(tail)) fullyResolved = false;
  if (/\bGENERATED\b|\bIDENTITY\b|\bCOLLATE\b/i.test(tail)) fullyResolved = false;

  const knownTail = tail
    .replace(/\bNOT\s+NULL\b/ig, '')
    .replace(/\bPRIMARY\s+KEY\b/ig, '')
    .replace(/\bUNIQUE\b/ig, '')
    .replace(/\bDEFAULT\s+[\s\S]+?(?=\s+(?:COLLATE|GENERATED|NOT\s+NULL|NULL\b|UNIQUE\b|PRIMARY\s+KEY|CHECK\s*\(|REFERENCES\b)|$)/ig, '')
    .replace(/\bREFERENCES\s+[^\s(]+\s*\([^)]+\)(?:\s+(?:MATCH\s+\w+|ON\s+(?:DELETE|UPDATE)\s+\w+(?:\s+\w+)?|DEFERRABLE|NOT\s+DEFERRABLE|INITIALLY\s+\w+))*/ig, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (knownTail && !/^NULL$/i.test(knownTail)) fullyResolved = false;

  return { operations, fullyResolved };
}

function analyzeTableConstraint(tableKey, definition, catalog) {
  const withoutName = definition.replace(/^CONSTRAINT\s+("?[A-Za-z_][A-Za-z0-9_$]*"?)\s+/i, '');
  if (!/^(PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK|EXCLUDE)\b/i.test(withoutName)) {
    return { operations: [], fullyResolved: false };
  }
  const normalized = normalizeConstraint(withoutName);
  const present = catalog.constraintDefinitions.get(tableKey)?.has(normalized) === true;
  if (/^(CHECK|EXCLUDE)\b/i.test(withoutName) && !present) {
    return { operations: [], fullyResolved: false };
  }
  return {
    operations: [constraintOperation(tableKey, withoutName, catalog, definition)],
    fullyResolved: true,
  };
}

function semanticForCreateTable(statement, catalog) {
  const match = statement.replace(/\s+/g, ' ').trim().match(
    /^CREATE\s+(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)\s*\(([\s\S]*)\)$/i,
  );
  if (!match) return new Map();
  const relation = normalizeIdentifier(match[1]);
  const tableKey = `${relation.schema}.${relation.name}`;
  const semantic = new Map();
  for (const definition of splitTopLevelComma(match[2])) {
    const hash = sha256(definition);
    const result = /^(?:CONSTRAINT\s+[^\s]+\s+)?(?:PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK|EXCLUDE)\b/i.test(definition)
      ? analyzeTableConstraint(tableKey, definition, catalog)
      : analyzeColumnDefinition(tableKey, definition, catalog);
    semantic.set(hash, result);
  }
  return semantic;
}

function semanticForAlterTable(statement, catalog) {
  const normalized = statement.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?([^\s]+)\s+([\s\S]+)$/i);
  if (!match) return new Map();
  const relation = normalizeIdentifier(match[1]);
  const tableKey = `${relation.schema}.${relation.name}`;
  const semantic = new Map();

  for (const action of splitTopLevelComma(match[2])) {
    const hash = sha256(action);
    let result = { operations: [], fullyResolved: false };
    let actionMatch = action.match(/^ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([\s\S]+)$/i);
    if (actionMatch) result = analyzeColumnDefinition(tableKey, actionMatch[1], catalog);

    actionMatch = action.match(/^ALTER\s+COLUMN\s+("?[A-Za-z_][A-Za-z0-9_$]*"?)\s+(?:SET\s+DATA\s+)?TYPE\s+([^\s]+(?:\s+with(?:out)?\s+time\s+zone|\s+precision)?)(?:\s+USING\s+[\s\S]+)?$/i);
    if (actionMatch) {
      const column = normalizeIdentifier(actionMatch[1]).name;
      const key = `${tableKey}.${column}`;
      const catalogColumn = catalog.columns.get(key);
      const expectedType = normalizeType(actionMatch[2]);
      const matched = catalogColumn && catalogTypeCandidates(catalogColumn).has(expectedType);
      result = {
        operations: [operation('COLUMN_TYPE', 'ALTER_TYPE', `${key}.type.${expectedType}`, 'PRESENT', matched ? 'PRESENT' : 'ABSENT', action)],
        fullyResolved: true,
      };
    }

    actionMatch = action.match(/^ALTER\s+COLUMN\s+("?[A-Za-z_][A-Za-z0-9_$]*"?)\s+(SET|DROP)\s+NOT\s+NULL$/i);
    if (actionMatch) {
      const column = normalizeIdentifier(actionMatch[1]).name;
      const key = `${tableKey}.${column}`;
      const catalogColumn = catalog.columns.get(key);
      const expectNotNull = actionMatch[2].toUpperCase() === 'SET';
      const observedState = catalogColumn
        ? (!catalogColumn.nullable ? 'PRESENT' : 'ABSENT')
        : 'COLUMN_MISSING';
      result = {
        operations: [operation(
          'COLUMN_NULLABILITY',
          expectNotNull ? 'SET_NOT_NULL' : 'DROP_NOT_NULL',
          `${key}.not_null`,
          expectNotNull ? 'PRESENT' : 'ABSENT',
          observedState,
          action,
        )],
        fullyResolved: true,
      };
    }

    actionMatch = action.match(/^ALTER\s+COLUMN\s+("?[A-Za-z_][A-Za-z0-9_$]*"?)\s+SET\s+DEFAULT\s+([\s\S]+)$/i);
    if (actionMatch) {
      const column = normalizeIdentifier(actionMatch[1]).name;
      const key = `${tableKey}.${column}`;
      const catalogColumn = catalog.columns.get(key);
      const matched = catalogColumn && defaultsEquivalent(actionMatch[2], catalogColumn.defaultValue);
      result = {
        operations: [operation('COLUMN_DEFAULT', 'SET_DEFAULT', `${key}.default.${sha256(normalizeDefault(actionMatch[2])).slice(0, 16)}`, 'PRESENT', matched ? 'PRESENT' : 'ABSENT', action)],
        fullyResolved: true,
      };
    }

    actionMatch = action.match(/^ALTER\s+COLUMN\s+("?[A-Za-z_][A-Za-z0-9_$]*"?)\s+DROP\s+DEFAULT$/i);
    if (actionMatch) {
      const column = normalizeIdentifier(actionMatch[1]).name;
      const key = `${tableKey}.${column}`;
      const catalogColumn = catalog.columns.get(key);
      const absent = catalogColumn && catalogColumn.defaultValue === '';
      result = {
        operations: [operation('COLUMN_DEFAULT', 'DROP_DEFAULT', `${key}.default`, 'ABSENT', absent ? 'ABSENT' : 'PRESENT', action)],
        fullyResolved: true,
      };
    }

    actionMatch = action.match(/^ADD\s+CONSTRAINT\s+[^\s]+\s+([\s\S]+)$/i);
    if (actionMatch) result = analyzeTableConstraint(tableKey, actionMatch[1], catalog);

    semantic.set(hash, result);
  }
  return semantic;
}

function semanticByHash(sql, catalog) {
  const semantic = new Map();
  for (const statement of splitSqlStatements(sql)) {
    for (const [hash, result] of semanticForCreateTable(statement, catalog)) semantic.set(hash, result);
    for (const [hash, result] of semanticForAlterTable(statement, catalog)) semantic.set(hash, result);
  }
  return semantic;
}

function dedupeOperations(operations) {
  const seen = new Set();
  return operations.filter((entry) => {
    const key = [entry.kind, entry.action, entry.key, entry.expectedState, entry.observedState, entry.statementSha256].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function recomputeCounts(items) {
  return {
    inventoryItems: items.length,
    targetStatePresent: items.filter((item) => item.candidate.objectState === 'TARGET_STATE_PRESENT').length,
    targetStateAbsent: items.filter((item) => item.candidate.objectState === 'TARGET_STATE_ABSENT').length,
    mixedOrPartial: items.filter((item) => item.candidate.objectState === 'MIXED_OR_PARTIAL').length,
    unprovable: items.filter((item) => item.candidate.objectState === 'UNPROVABLE').length,
    candidateAlreadyPresent: items.filter((item) => item.candidate.candidateClassification === 'ALREADY_PRESENT_IN_SCHEMA').length,
    candidatePendingDeployment: items.filter((item) => item.candidate.candidateClassification === 'PENDING_DEPLOYMENT').length,
    candidateSplitReview: items.filter((item) => item.candidate.candidateClassification === 'REQUIRES_SPLIT_REVIEW').length,
  };
}

async function writeBatches(outputDir, report) {
  for (const filename of await readdir(outputDir)) {
    if (/^batch-\d{3}-of-\d{3}\.json$/.test(filename)) {
      await unlink(path.join(outputDir, filename));
    }
  }
  const batchSize = 25;
  const batchCount = Math.ceil(report.items.length / batchSize);
  for (let index = 0; index < batchCount; index += 1) {
    const batchNumber = index + 1;
    const batchId = `batch-${String(batchNumber).padStart(3, '0')}-of-${String(batchCount).padStart(3, '0')}`;
    await writeFile(path.join(outputDir, `${batchId}.json`), `${JSON.stringify({
      schema: 'risck-comply.supabase-migration-object-evidence-batch.v1',
      status: 'HUMAN_REVIEW_REQUIRED',
      batchId,
      batchNumber,
      batchCount,
      source: report.source,
      semanticRefinement: report.semanticRefinement,
      items: report.items.slice(index * batchSize, (index + 1) * batchSize),
      acceptedDecisions: 0,
    }, null, 2)}\n`);
  }
}

export async function refineMigrationSemanticEvidence(argv = process.argv.slice(2)) {
  const [reportPath, catalogPath, migrationsDir, outputDir] = argv;
  if (!reportPath || !catalogPath || !migrationsDir || !outputDir) {
    throw new Error('usage: report.json catalog.txt migrations-dir output-dir');
  }
  const reportBytes = await readFile(reportPath);
  const report = JSON.parse(reportBytes);
  if (report.schema !== 'risck-comply.supabase-migration-object-evidence.v1') {
    throw new Error('unsupported migration object evidence schema');
  }
  if (report.status !== 'HUMAN_REVIEW_REQUIRED' || report.acceptedDecisions !== 0) {
    throw new Error('source evidence violates the non-crediting boundary');
  }
  const catalogBytes = await readFile(catalogPath);
  if (sha256(catalogBytes) !== report.source.catalogSha256) {
    throw new Error('catalog digest mismatch');
  }
  const catalog = parseCatalog(catalogBytes.toString('utf8'));
  const before = report.counts;
  let resolvedUnresolvedEntries = 0;
  let addedSemanticOperations = 0;

  for (const item of report.items) {
    const sqlBytes = await readFile(path.join(migrationsDir, item.filename));
    if (sha256(sqlBytes) !== item.sha256) throw new Error(`migration digest mismatch for ${item.filename}`);
    const semantic = semanticByHash(sqlBytes.toString('utf8'), catalog);
    const retained = [];
    const additions = [];
    for (const entry of item.unresolved) {
      const refinement = semantic.get(entry.statementSha256);
      if (TARGET_REASONS.has(entry.reason) && refinement?.fullyResolved) {
        additions.push(...refinement.operations);
        resolvedUnresolvedEntries += 1;
      } else {
        retained.push(entry);
      }
    }

    for (const refinement of semantic.values()) additions.push(...refinement.operations);
    const operations = dedupeOperations([...item.operations, ...additions]);
    addedSemanticOperations += operations.length - item.operations.length;
    item.operations = operations;
    item.unresolved = retained;
    item.candidate = candidateFor(item, operations, retained);
    item.objectProofDigest = sha256(JSON.stringify({
      migrationSha256: item.sha256,
      catalogSha256: report.source.catalogSha256,
      operations,
      unresolved: retained,
    }));
  }

  report.counts = recomputeCounts(report.items);
  report.semanticRefinement = {
    schema: 'risck-comply.supabase-migration-semantic-refinement.v1',
    status: 'HUMAN_REVIEW_REQUIRED',
    generatedAt: new Date().toISOString(),
    countsBefore: before,
    countsAfter: report.counts,
    resolvedUnresolvedEntries,
    addedSemanticOperations,
    acceptedDecisions: 0,
    automaticClassificationAllowed: false,
  };
  report.acceptedDecisions = 0;
  report.safety.automaticClassificationAllowed = false;
  report.safety.candidateEvidenceIsApproval = false;

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'migration-object-evidence.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(outputDir, 'semantic-refinement-summary.json'), `${JSON.stringify(report.semanticRefinement, null, 2)}\n`);
  await writeBatches(outputDir, report);
  const markdown = [
    '# Supabase migration semantic evidence refinement',
    '',
    'Status: **HUMAN_REVIEW_REQUIRED**',
    '',
    `- Inventory items: ${report.counts.inventoryItems}`,
    `- Candidate already present: ${before.candidateAlreadyPresent} → ${report.counts.candidateAlreadyPresent}`,
    `- Candidate pending deployment: ${before.candidatePendingDeployment} → ${report.counts.candidatePendingDeployment}`,
    `- Candidate split review: ${before.candidateSplitReview} → ${report.counts.candidateSplitReview}`,
    `- Resolved unresolved entries: ${resolvedUnresolvedEntries}`,
    `- Added semantic operations: ${addedSemanticOperations}`,
    '- Accepted decisions: 0',
    '- Production writes: not authorised and not executed',
    '',
  ].join('\n');
  await writeFile(path.join(outputDir, 'semantic-refinement.md'), markdown);
  process.stdout.write(markdown);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  refineMigrationSemanticEvidence().catch((error) => {
    console.error(`Migration semantic evidence refinement failed: ${error.message}`);
    process.exit(1);
  });
}
