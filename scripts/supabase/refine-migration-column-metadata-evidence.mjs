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
    .replace(/\bpg_catalog\./g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),=])\s*/g, '$1')
    .replace(/;$/g, '');
}

function stripBalancedOuterParentheses(value) {
  let current = String(value).trim();
  while (current.startsWith('(') && current.endsWith(')')) {
    let depth = 0;
    let singleQuoted = false;
    let enclosesAll = true;
    for (let index = 0; index < current.length; index += 1) {
      const character = current[index];
      const next = current[index + 1];
      if (character === "'") {
        if (singleQuoted && next === "'") {
          index += 1;
          continue;
        }
        singleQuoted = !singleQuoted;
      }
      if (singleQuoted) continue;
      if (character === '(') depth += 1;
      if (character === ')') depth -= 1;
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

function normalizeType(value) {
  let normalized = normalizeSql(value);
  let arraySuffix = '';
  while (normalized.endsWith('[]')) {
    arraySuffix += '[]';
    normalized = normalized.slice(0, -2);
  }

  const timestampWithZone = normalized.match(/^timestamp(?:\((\d+)\))? with time zone$/);
  if (timestampWithZone) {
    normalized = timestampWithZone[1]
      ? `timestamptz(${timestampWithZone[1]})`
      : 'timestamptz';
  }
  const timestampWithoutZone = normalized.match(/^timestamp(?:\((\d+)\))? without time zone$/);
  if (timestampWithoutZone) {
    normalized = timestampWithoutZone[1]
      ? `timestamp(${timestampWithoutZone[1]})`
      : 'timestamp';
  }
  const timeWithZone = normalized.match(/^time(?:\((\d+)\))? with time zone$/);
  if (timeWithZone) {
    normalized = timeWithZone[1] ? `timetz(${timeWithZone[1]})` : 'timetz';
  }
  const timeWithoutZone = normalized.match(/^time(?:\((\d+)\))? without time zone$/);
  if (timeWithoutZone) {
    normalized = timeWithoutZone[1] ? `time(${timeWithoutZone[1]})` : 'time';
  }

  normalized = normalized
    .replace(/^character varying(?=\(|$)/, 'varchar')
    .replace(/^double precision$/, 'float8')
    .replace(/^integer$/, 'int4')
    .replace(/^bigint$/, 'int8')
    .replace(/^smallint$/, 'int2')
    .replace(/^boolean$/, 'bool')
    .replace(/^real$/, 'float4')
    .replace(/^decimal(?=\(|$)/, 'numeric')
    .replace(/^bit varying(?=\(|$)/, 'varbit');
  return `${normalized}${arraySuffix}`;
}

function normalizeExpression(value) {
  return stripBalancedOuterParentheses(normalizeSql(value));
}

function normalizeDefault(value) {
  return stripBalancedOuterParentheses(normalizeSql(value));
}

function defaultsEquivalent(expected, observed) {
  const left = normalizeDefault(expected);
  const right = normalizeDefault(observed);
  if (left === right) return true;
  if (left === 'current_timestamp' && right === 'now()') return true;
  if (left === 'now()' && right === 'current_timestamp') return true;
  const escaped = left.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}(?:::[a-z_][a-z0-9_.]*(?:\\[\\])?)+$`, 'i').test(right);
}

function normalizeConstraintBase(value) {
  let normalized = normalizeSql(value)
    .replace(/^constraint\s+[^\s]+\s+/, '')
    .replace(/\bnot valid\b/g, '')
    .trim();
  if (normalized.startsWith('check(') && normalized.endsWith(')')) {
    normalized = `check(${stripBalancedOuterParentheses(normalized.slice(6, -1))})`;
  }
  return normalized;
}

function decodeHexJson(payload, recordType) {
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(payload)) {
    throw new Error(`${recordType} catalog payload is not valid hexadecimal JSON`);
  }
  try {
    return JSON.parse(Buffer.from(payload, 'hex').toString('utf8'));
  } catch (error) {
    throw new Error(`${recordType} catalog payload is not valid JSON: ${error.message}`);
  }
}

function parseCatalog(text) {
  const catalog = {
    columns: new Map(),
    constraints: new Map(),
  };

  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const separator = line.indexOf('|');
    if (separator < 0) continue;
    const recordType = line.slice(0, separator);
    const payload = line.slice(separator + 1);

    if (recordType === 'column_meta_hex') {
      const record = decodeHexJson(payload, recordType);
      const key = `${record.schema}.${record.table}.${record.column}`.toLowerCase();
      catalog.columns.set(key, {
        dataType: String(record.dataType ?? ''),
        udtName: String(record.udtName ?? ''),
        nullable: String(record.nullable ?? '').toUpperCase() === 'YES',
        defaultValue: String(record.defaultValue ?? ''),
        formattedType: String(record.formattedType ?? ''),
        characterMaximumLength: String(record.characterMaximumLength ?? ''),
        numericPrecision: String(record.numericPrecision ?? ''),
        numericScale: String(record.numericScale ?? ''),
        datetimePrecision: String(record.datetimePrecision ?? ''),
        isIdentity: String(record.isIdentity ?? '').toUpperCase(),
        identityGeneration: String(record.identityGeneration ?? '').toUpperCase(),
        isGenerated: String(record.isGenerated ?? '').toUpperCase(),
        generationExpression: String(record.generationExpression ?? ''),
        collationSchema: String(record.collationSchema ?? '').toLowerCase(),
        collationName: String(record.collationName ?? '').toLowerCase(),
        domainSchema: String(record.domainSchema ?? '').toLowerCase(),
        domainName: String(record.domainName ?? '').toLowerCase(),
      });
    }

    if (recordType === 'constraint_meta_hex') {
      const record = decodeHexJson(payload, recordType);
      const tableKey = `${record.schema}.${record.table}`.toLowerCase();
      const records = catalog.constraints.get(tableKey) ?? [];
      records.push({
        name: String(record.name ?? '').toLowerCase(),
        baseDefinition: normalizeConstraintBase(record.definition ?? ''),
        validated: record.validated === true,
        deferrable: record.deferrable === true,
        deferred: record.deferred === true,
      });
      catalog.constraints.set(tableKey, records);
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
    evidenceLayer: 'ENRICHED_COLUMN_METADATA_REFINEMENT',
  };
}

function constraintOperation(tableKey, definition, catalog, source) {
  const baseDefinition = normalizeConstraintBase(definition);
  const requiresValidation = !/\bNOT\s+VALID\b/i.test(definition);
  const observed = (catalog.constraints.get(tableKey) ?? []).some((record) => (
    record.baseDefinition === baseDefinition
    && (!requiresValidation || record.validated)
  ));
  return operation(
    'CONSTRAINT_DEFINITION',
    'CREATE',
    `${tableKey}.${sha256(`${baseDefinition}|validated=${requiresValidation}`).slice(0, 16)}`,
    'PRESENT',
    observed ? 'PRESENT' : 'ABSENT',
    source,
  );
}

function findConstraintStart(rest) {
  const match = rest.match(/\s+(?=(?:COLLATE|DEFAULT|GENERATED|IDENTITY\b|NOT\s+NULL|NULL\b|UNIQUE\b|PRIMARY\s+KEY|CHECK\s*\(|REFERENCES\b))/i);
  return match?.index ?? -1;
}

function findBalancedClause(text, keywordPattern, openSearchFrom = 0) {
  const expression = new RegExp(keywordPattern, 'ig');
  expression.lastIndex = openSearchFrom;
  const match = expression.exec(text);
  if (!match) return null;
  const openIndex = text.indexOf('(', match.index + match[0].length - 1);
  if (openIndex < 0) return null;
  let depth = 0;
  let singleQuoted = false;
  for (let index = openIndex; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === "'") {
      if (singleQuoted && next === "'") {
        index += 1;
        continue;
      }
      singleQuoted = !singleQuoted;
    }
    if (singleQuoted) continue;
    if (character === '(') depth += 1;
    if (character === ')') {
      depth -= 1;
      if (depth === 0) {
        return {
          start: match.index,
          end: index + 1,
          body: text.slice(openIndex + 1, index),
        };
      }
    }
  }
  return null;
}

function extractAllChecks(tail) {
  const checks = [];
  let cursor = 0;
  while (cursor < tail.length) {
    const clause = findBalancedClause(tail, '\\bCHECK\\s*\\(', cursor);
    if (!clause) break;
    checks.push(clause);
    cursor = clause.end;
  }
  return checks;
}

function removeRanges(value, ranges) {
  const ordered = [...ranges].sort((left, right) => right.start - left.start);
  let result = value;
  for (const range of ordered) result = `${result.slice(0, range.start)} ${result.slice(range.end)}`;
  return result;
}

function extractDefault(tail) {
  const match = tail.match(/\bDEFAULT\s+([\s\S]+?)(?=\s+(?:COLLATE|GENERATED|IDENTITY\b|NOT\s+NULL|NULL\b|UNIQUE\b|PRIMARY\s+KEY|CHECK\s*\(|REFERENCES\b)|$)/i);
  return match?.[1]?.trim() ?? null;
}

function extractReferences(tail, column) {
  const match = tail.match(/\bREFERENCES\s+([^\s(]+)\s*\(([^)]+)\)([\s\S]*?)(?=\s+(?:COLLATE|DEFAULT|GENERATED|IDENTITY\b|NOT\s+NULL|NULL\b|UNIQUE\b|PRIMARY\s+KEY|CHECK\s*\()|$)/i);
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

  const expectedType = normalizeType(typeText);
  const observedType = catalogColumn ? normalizeType(catalogColumn.formattedType) : '';
  operations.push(operation(
    'COLUMN_FORMATTED_TYPE',
    'MATCH',
    `${key}.formatted_type.${sha256(expectedType).slice(0, 16)}`,
    'PRESENT',
    catalogColumn && expectedType === observedType ? 'PRESENT' : 'ABSENT',
    definition,
  ));

  const identity = tail.match(/\bGENERATED\s+(ALWAYS|BY\s+DEFAULT)\s+AS\s+IDENTITY(?:\s*\([^)]*\))?/i);
  const targetNotNull = /\bNOT\s+NULL\b/i.test(tail)
    || /\bPRIMARY\s+KEY\b/i.test(tail)
    || identity !== null;
  operations.push(operation(
    'COLUMN_NULLABILITY',
    targetNotNull ? 'EXPECT_NOT_NULL' : 'EXPECT_NULLABLE',
    targetNotNull ? `${key}.not_null` : `${key}.nullable`,
    'PRESENT',
    catalogColumn && (targetNotNull ? !catalogColumn.nullable : catalogColumn.nullable)
      ? 'PRESENT'
      : 'ABSENT',
    definition,
  ));

  const defaultValue = extractDefault(tail);
  const defaultMatched = defaultValue === null
    ? catalogColumn?.defaultValue === ''
    : Boolean(catalogColumn && defaultsEquivalent(defaultValue, catalogColumn.defaultValue));
  operations.push(operation(
    'COLUMN_DEFAULT',
    defaultValue === null ? 'EXPECT_ABSENT' : 'MATCH',
    defaultValue === null
      ? `${key}.default.absent`
      : `${key}.default.${sha256(normalizeDefault(defaultValue)).slice(0, 16)}`,
    defaultValue === null ? 'ABSENT' : 'PRESENT',
    defaultValue === null
      ? (defaultMatched ? 'ABSENT' : 'PRESENT')
      : (defaultMatched ? 'PRESENT' : 'ABSENT'),
    definition,
  ));

  const collation = tail.match(/\bCOLLATE\s+([^\s]+)/i);
  if (collation) {
    const expected = normalizeIdentifier(collation[1], 'pg_catalog');
    const observed = catalogColumn
      ? `${catalogColumn.collationSchema}.${catalogColumn.collationName}`
      : '';
    operations.push(operation(
      'COLUMN_COLLATION',
      'MATCH',
      `${key}.collation.${expected.schema}.${expected.name}`,
      'PRESENT',
      observed === `${expected.schema}.${expected.name}` ? 'PRESENT' : 'ABSENT',
      definition,
    ));
  } else if (catalogColumn?.collationName) {
    fullyResolved = false;
  }

  if (identity) {
    const expectedGeneration = identity[1].replace(/\s+/g, ' ').toUpperCase();
    const hasOptions = /\bAS\s+IDENTITY\s*\(/i.test(identity[0]);
    const matched = catalogColumn
      && catalogColumn.isIdentity === 'YES'
      && catalogColumn.identityGeneration === expectedGeneration
      && !hasOptions;
    operations.push(operation(
      'COLUMN_IDENTITY',
      'MATCH',
      `${key}.identity.${expectedGeneration.toLowerCase().replace(/\s+/g, '_')}`,
      'PRESENT',
      matched ? 'PRESENT' : 'ABSENT',
      definition,
    ));
    if (hasOptions) fullyResolved = false;
  } else {
    operations.push(operation(
      'COLUMN_IDENTITY',
      'EXPECT_ABSENT',
      `${key}.identity.absent`,
      'ABSENT',
      catalogColumn?.isIdentity === 'YES' ? 'PRESENT' : 'ABSENT',
      definition,
    ));
  }

  const generated = findBalancedClause(tail, '\\bGENERATED\\s+ALWAYS\\s+AS\\s*\\(');
  if (generated) {
    const suffix = tail.slice(generated.end).trim();
    const stored = /^STORED\b/i.test(suffix);
    const matched = catalogColumn
      && catalogColumn.isGenerated === 'ALWAYS'
      && normalizeExpression(catalogColumn.generationExpression) === normalizeExpression(generated.body)
      && stored;
    operations.push(operation(
      'COLUMN_GENERATED_EXPRESSION',
      'MATCH',
      `${key}.generated.${sha256(normalizeExpression(generated.body)).slice(0, 16)}`,
      'PRESENT',
      matched ? 'PRESENT' : 'ABSENT',
      definition,
    ));
    if (!stored) fullyResolved = false;
  } else {
    operations.push(operation(
      'COLUMN_GENERATED_EXPRESSION',
      'EXPECT_ABSENT',
      `${key}.generated.absent`,
      'ABSENT',
      catalogColumn?.isGenerated === 'ALWAYS' ? 'PRESENT' : 'ABSENT',
      definition,
    ));
  }

  const checks = extractAllChecks(tail);
  for (const check of checks) {
    operations.push(constraintOperation(tableKey, `CHECK (${check.body})`, catalog, definition));
  }
  if (/\bPRIMARY\s+KEY\b/i.test(tail)) {
    operations.push(constraintOperation(tableKey, `PRIMARY KEY (${column})`, catalog, definition));
  }
  if (/\bUNIQUE\b/i.test(tail)) {
    operations.push(constraintOperation(tableKey, `UNIQUE (${column})`, catalog, definition));
  }
  const references = extractReferences(tail, column);
  if (references) operations.push(constraintOperation(tableKey, references, catalog, definition));

  const removableRanges = [...checks, ...(generated ? [generated] : [])];
  let remaining = removeRanges(tail, removableRanges)
    .replace(/\bNOT\s+NULL\b/ig, '')
    .replace(/(?:^|\s)NULL(?=\s|$)/ig, ' ')
    .replace(/\bPRIMARY\s+KEY\b/ig, '')
    .replace(/\bUNIQUE\b/ig, '')
    .replace(/\bCOLLATE\s+[^\s]+/ig, '')
    .replace(/\bGENERATED\s+(?:ALWAYS|BY\s+DEFAULT)\s+AS\s+IDENTITY(?:\s*\([^)]*\))?/ig, '')
    .replace(/\bSTORED\b/ig, '')
    .replace(/\bDEFAULT\s+[\s\S]+?(?=\s+(?:COLLATE|GENERATED|IDENTITY\b|NOT\s+NULL|NULL\b|UNIQUE\b|PRIMARY\s+KEY|CHECK\s*\(|REFERENCES\b)|$)/ig, '')
    .replace(/\bREFERENCES\s+[^\s(]+\s*\([^)]+\)(?:\s+(?:MATCH\s+\w+|ON\s+(?:DELETE|UPDATE)\s+\w+(?:\s+\w+)?|DEFERRABLE|NOT\s+DEFERRABLE|INITIALLY\s+\w+))*/ig, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (remaining) fullyResolved = false;
  if (!catalogColumn) fullyResolved = false;

  return { operations, fullyResolved };
}

function analyzeTableConstraint(tableKey, definition, catalog) {
  const withoutName = definition.replace(/^CONSTRAINT\s+("?[A-Za-z_][A-Za-z0-9_$]*"?)\s+/i, '');
  if (!/^(PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK|EXCLUDE)\b/i.test(withoutName)) {
    return { operations: [], fullyResolved: false };
  }
  if (/\bUSING\s+INDEX\b/i.test(withoutName)) return { operations: [], fullyResolved: false };
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
    const result = /^(?:CONSTRAINT\s+[^\s]+\s+)?(?:PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK|EXCLUDE)\b/i.test(definition)
      ? analyzeTableConstraint(tableKey, definition, catalog)
      : analyzeColumnDefinition(tableKey, definition, catalog);
    semantic.set(sha256(definition), result);
  }
  return semantic;
}

function semanticForAlterTable(statement, catalog) {
  const match = statement.replace(/\s+/g, ' ').trim().match(
    /^ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?([^\s]+)\s+([\s\S]+)$/i,
  );
  if (!match) return new Map();
  const relation = normalizeIdentifier(match[1]);
  const tableKey = `${relation.schema}.${relation.name}`;
  const semantic = new Map();
  for (const action of splitTopLevelComma(match[2])) {
    let result = { operations: [], fullyResolved: false };
    const addColumn = action.match(/^ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([\s\S]+)$/i);
    if (addColumn) result = analyzeColumnDefinition(tableKey, addColumn[1], catalog);
    const addConstraint = action.match(/^ADD\s+(?:CONSTRAINT\s+[^\s]+\s+)?((?:PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK|EXCLUDE)[\s\S]+)$/i);
    if (addConstraint) result = analyzeTableConstraint(tableKey, addConstraint[1], catalog);
    semantic.set(sha256(action), result);
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
    if (/^batch-\d{3}-of-\d{3}\.json$/.test(filename)) await unlink(path.join(outputDir, filename));
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
      columnMetadataRefinement: report.columnMetadataRefinement,
      items: report.items.slice(index * batchSize, (index + 1) * batchSize),
      acceptedDecisions: 0,
    }, null, 2)}\n`);
  }
}

export async function refineMigrationColumnMetadataEvidence(argv = process.argv.slice(2)) {
  const [reportPath, catalogPath, migrationsDir, outputDir] = argv;
  if (!reportPath || !catalogPath || !migrationsDir || !outputDir) {
    throw new Error('usage: semantic-report.json enriched-catalog.txt migrations-dir output-dir');
  }
  const reportBytes = await readFile(reportPath);
  const report = JSON.parse(reportBytes);
  if (report.schema !== 'risck-comply.supabase-migration-object-evidence.v1') {
    throw new Error('unsupported migration object evidence schema');
  }
  if (report.status !== 'HUMAN_REVIEW_REQUIRED' || report.acceptedDecisions !== 0) {
    throw new Error('source evidence violates the non-crediting boundary');
  }
  if (report.semanticRefinement?.status !== 'HUMAN_REVIEW_REQUIRED') {
    throw new Error('semantic refinement evidence is required');
  }

  const catalogBytes = await readFile(catalogPath);
  const catalogDigest = sha256(catalogBytes);
  const catalog = parseCatalog(catalogBytes.toString('utf8'));
  if (catalog.columns.size === 0 || [...catalog.columns.values()].some((column) => !column.formattedType)) {
    throw new Error('enriched catalog is missing safely encoded formatted column type metadata');
  }
  if (catalog.constraints.size === 0) {
    throw new Error('enriched catalog is missing safely encoded constraint metadata');
  }

  const before = report.counts;
  let resolvedUnresolvedEntries = 0;
  let addedMetadataOperations = 0;

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
    const operations = dedupeOperations([...item.operations, ...additions]);
    addedMetadataOperations += operations.length - item.operations.length;
    item.operations = operations;
    item.unresolved = retained;
    item.candidate = candidateFor(item, operations, retained);
    item.objectProofDigest = sha256(JSON.stringify({
      migrationSha256: item.sha256,
      sourceCatalogSha256: report.source.catalogSha256,
      enrichedCatalogSha256: catalogDigest,
      operations,
      unresolved: retained,
    }));
  }

  report.counts = recomputeCounts(report.items);
  report.columnMetadataRefinement = {
    schema: 'risck-comply.supabase-migration-column-metadata-refinement.v1',
    status: 'HUMAN_REVIEW_REQUIRED',
    generatedAt: new Date().toISOString(),
    enrichedCatalogSha256: catalogDigest,
    countsBefore: before,
    countsAfter: report.counts,
    resolvedUnresolvedEntries,
    addedMetadataOperations,
    acceptedDecisions: 0,
    automaticClassificationAllowed: false,
  };
  report.acceptedDecisions = 0;
  report.safety.automaticClassificationAllowed = false;
  report.safety.candidateEvidenceIsApproval = false;

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'migration-object-evidence.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(outputDir, 'column-metadata-refinement-summary.json'), `${JSON.stringify(report.columnMetadataRefinement, null, 2)}\n`);
  await writeBatches(outputDir, report);
  const markdown = [
    '# Supabase migration enriched column metadata refinement',
    '',
    'Status: **HUMAN_REVIEW_REQUIRED**',
    '',
    `- Inventory items: ${report.counts.inventoryItems}`,
    `- Candidate already present: ${before.candidateAlreadyPresent} → ${report.counts.candidateAlreadyPresent}`,
    `- Candidate pending deployment: ${before.candidatePendingDeployment} → ${report.counts.candidatePendingDeployment}`,
    `- Candidate split review: ${before.candidateSplitReview} → ${report.counts.candidateSplitReview}`,
    `- Resolved unresolved entries: ${resolvedUnresolvedEntries}`,
    `- Added metadata operations: ${addedMetadataOperations}`,
    '- Accepted decisions: 0',
    '- Production writes: not authorised and not executed',
    '',
  ].join('\n');
  await writeFile(path.join(outputDir, 'column-metadata-refinement.md'), markdown);
  process.stdout.write(markdown);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  refineMigrationColumnMetadataEvidence().catch((error) => {
    console.error(`Migration column metadata refinement failed: ${error.message}`);
    process.exit(1);
  });
}
