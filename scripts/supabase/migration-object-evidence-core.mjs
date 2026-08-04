import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TABLE_PRIVILEGES = Object.freeze([
  'select',
  'insert',
  'update',
  'delete',
  'truncate',
  'references',
  'trigger',
]);

const LEGACY_OBJECT_PATTERNS = Object.freeze([
  ['TABLE', /\b(?:create|alter|drop)\s+table(?:\s+if\s+(?:not\s+)?exists)?\s+([^\s(;]+)/ig],
  ['INDEX', /\b(?:create(?:\s+unique)?|drop)\s+index(?:\s+if\s+(?:not\s+)?exists)?\s+([^\s(;]+)/ig],
  ['FUNCTION', /\b(?:create(?:\s+or\s+replace)?|alter|drop)\s+function\s+([^\s(]+)/ig],
  ['VIEW', /\b(?:create(?:\s+or\s+replace)?|alter|drop)\s+(?:materialized\s+)?view\s+([^\s(;]+)/ig],
  ['TYPE', /\b(?:create|alter|drop)\s+type\s+([^\s(;]+)/ig],
  ['POLICY', /\b(?:create|alter|drop)\s+policy\s+(?:"[^"]+"|[^\s]+)\s+on\s+([^\s(;]+)/ig],
  ['TRIGGER', /\b(?:create|drop)\s+trigger\s+(?:"[^"]+"|[^\s]+)\s+on\s+([^\s(;]+)/ig],
]);

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function cleanLegacyIdentifier(value) {
  return value.replace(/[;,]$/, '').replaceAll('"', '').toLowerCase();
}

export function extractObjects(sql) {
  const objects = new Map();
  for (const [kind, pattern] of LEGACY_OBJECT_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of sql.matchAll(pattern)) {
      const name = cleanLegacyIdentifier(match[1]);
      if (!name) continue;
      objects.set(`${kind}:${name}`, { kind, name });
    }
  }
  return [...objects.values()].sort((left, right) => (
    `${left.kind}:${left.name}`.localeCompare(`${right.kind}:${right.name}`)
  ));
}

export function compareWithLiveCatalog(migrations, catalog) {
  const live = new Set((catalog.objects ?? []).map((item) => `${item.kind}:${item.name}`));
  return migrations.map((migration) => ({
    ...migration,
    objects: migration.objects.map((object) => ({
      ...object,
      presentInLiveCatalog: live.has(`${object.kind}:${object.name}`),
    })),
    allExtractedObjectsPresent:
      migration.objects.length > 0
      && migration.objects.every((object) => live.has(`${object.kind}:${object.name}`)),
    automaticClassification: null,
    reviewRequired: true,
  }));
}

function readFlag(args, prefix) {
  return args.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? null;
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

export function splitSqlStatements(sql) {
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

function containsDynamicSql(normalized) {
  // EXECUTE is also part of static privilege and trigger syntax. Treating those
  // forms as PL/pgSQL dynamic SQL creates false manual-review evidence.
  if (/^GRANT\s+EXECUTE\s+ON\b/i.test(normalized)) return false;
  if (/^REVOKE\s+EXECUTE\s+ON\b/i.test(normalized)) return false;
  if (/^CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\b/i.test(normalized)) return false;

  return /\bEXECUTE\s+(?:FORMAT\s*\(|[^\s])|^DO\s+\$/i.test(normalized);
}

export function parseCatalog(text) {
  const catalog = {
    tables: new Map(),
    columns: new Set(),
    constraints: new Set(),
    indexes: new Set(),
    functions: new Set(),
    functionGrants: new Set(),
    triggers: new Set(),
    policies: new Set(),
    grants: new Set(),
    sequences: new Set(),
    extensions: new Map(),
    types: new Set(),
    capabilities: new Set(),
    migrations: new Set(),
  };

  for (const line of text.split(/\r?\n/)) {
    const cells = line.split('|');
    switch (cells[0]) {
      case 'table': {
        const key = `${cells[1]}.${cells[2]}`.toLowerCase();
        catalog.tables.set(key, {
          relationKind: cells[3],
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
      case 'function_grant':
        catalog.functionGrants.add([
          `${cells[1]}.${cells[2]}(${normalizeRoutineArguments(cells[3])})`,
          cells[4],
          cells[5],
        ].join('.').toLowerCase());
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
      case 'sequence':
        catalog.sequences.add(`${cells[1]}.${cells[2]}`.toLowerCase());
        break;
      case 'extension':
        catalog.extensions.set(
          String(cells[1] ?? '').toLowerCase(),
          String(cells[2] ?? '').toLowerCase(),
        );
        break;
      case 'type':
        catalog.types.add(`${cells[1]}.${cells[2]}`.toLowerCase());
        break;
      case 'migration':
        catalog.migrations.add(String(cells[1] ?? '').trim());
        break;
      case 'catalog_capability':
        catalog.capabilities.add(String(cells[1] ?? '').trim());
        break;
      default:
        break;
    }
  }
  return catalog;
}

function normalizeRoutineArguments(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('"', '')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/\bpublic\./g, '');
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

function unresolved(reason, statement) {
  return { reason, statementSha256: sha256(statement) };
}

function analyzeCreateTable(normalized, catalog, results, unresolvedItems) {
  const match = normalized.match(
    /^CREATE\s+(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)\s*(?:\(([\s\S]*)\))?$/i,
  );
  if (!match) return false;
  const relation = normalizeIdentifier(match[1]);
  const tableKey = `${relation.schema}.${relation.name}`;
  results.push(evidence('TABLE', 'CREATE', tableKey, true, catalog.tables.has(tableKey), normalized));

  if (match[2]) {
    for (const definition of splitTopLevelComma(match[2])) {
      const namedConstraint = definition.match(/^CONSTRAINT\s+("?[A-Za-z_][A-Za-z0-9_$]*"?)/i);
      if (namedConstraint) {
        const constraint = normalizeIdentifier(namedConstraint[1], relation.schema).name;
        const key = `${tableKey}.${constraint}`;
        results.push(evidence('CONSTRAINT', 'CREATE', key, true, catalog.constraints.has(key), definition));
        continue;
      }
      if (/^(PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY|EXCLUDE)\b/i.test(definition)) {
        unresolvedItems.push(unresolved('UNNAMED_TABLE_CONSTRAINT_REQUIRES_MANUAL_REVIEW', definition));
        continue;
      }
      const columnMatch = definition.match(/^("?[A-Za-z_][A-Za-z0-9_$]*"?)\s+/);
      if (!columnMatch) {
        unresolvedItems.push(unresolved('CREATE_TABLE_DEFINITION_NOT_PARSED', definition));
        continue;
      }
      const column = normalizeIdentifier(columnMatch[1], relation.schema).name;
      const key = `${tableKey}.${column}`;
      results.push(evidence('COLUMN', 'CREATE', key, true, catalog.columns.has(key), definition));
      if (/\b(PRIMARY\s+KEY|UNIQUE|CHECK\s*\(|REFERENCES\s+)\b/i.test(definition)) {
        unresolvedItems.push(unresolved('INLINE_COLUMN_CONSTRAINT_REQUIRES_MANUAL_REVIEW', definition));
      }
    }
  }
  return true;
}

function analyzeAlterTable(normalized, catalog, results, unresolvedItems) {
  const match = normalized.match(
    /^ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?([^\s]+)\s+([\s\S]+)$/i,
  );
  if (!match) return false;
  const relation = normalizeIdentifier(match[1]);
  const tableKey = `${relation.schema}.${relation.name}`;
  results.push(evidence('TABLE', 'ALTER_TARGET', tableKey, true, catalog.tables.has(tableKey), normalized));

  for (const action of splitTopLevelComma(match[2])) {
    let actionHandled = false;
    let actionMatch = action.match(/^ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[A-Za-z_][A-Za-z0-9_$]*"?)\b/i);
    if (actionMatch) {
      const column = normalizeIdentifier(actionMatch[1], relation.schema).name;
      const key = `${tableKey}.${column}`;
      results.push(evidence('COLUMN', 'ADD', key, true, catalog.columns.has(key), action));
      actionHandled = true;
    }

    actionMatch = action.match(/^DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?("?[A-Za-z_][A-Za-z0-9_$]*"?)\b/i);
    if (actionMatch) {
      const column = normalizeIdentifier(actionMatch[1], relation.schema).name;
      const key = `${tableKey}.${column}`;
      results.push(evidence('COLUMN', 'DROP', key, false, catalog.columns.has(key), action));
      actionHandled = true;
    }

    actionMatch = action.match(/^ADD\s+CONSTRAINT\s+("?[A-Za-z_][A-Za-z0-9_$]*"?)\b/i);
    if (actionMatch) {
      const constraint = normalizeIdentifier(actionMatch[1], relation.schema).name;
      const key = `${tableKey}.${constraint}`;
      results.push(evidence('CONSTRAINT', 'ADD', key, true, catalog.constraints.has(key), action));
      actionHandled = true;
    }

    actionMatch = action.match(/^DROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?("?[A-Za-z_][A-Za-z0-9_$]*"?)\b/i);
    if (actionMatch) {
      const constraint = normalizeIdentifier(actionMatch[1], relation.schema).name;
      const key = `${tableKey}.${constraint}`;
      results.push(evidence('CONSTRAINT', 'DROP', key, false, catalog.constraints.has(key), action));
      actionHandled = true;
    }

    if (/^ENABLE\s+ROW\s+LEVEL\s+SECURITY$/i.test(action)) {
      results.push(evidence(
        'RLS',
        'ENABLE',
        `${tableKey}.rls_enabled`,
        true,
        catalog.tables.get(tableKey)?.rlsEnabled === true,
        action,
      ));
      actionHandled = true;
    }
    if (/^FORCE\s+ROW\s+LEVEL\s+SECURITY$/i.test(action)) {
      results.push(evidence(
        'RLS',
        'FORCE',
        `${tableKey}.force_rls`,
        true,
        catalog.tables.get(tableKey)?.forceRls === true,
        action,
      ));
      actionHandled = true;
    }
    if (/^DISABLE\s+ROW\s+LEVEL\s+SECURITY$/i.test(action)) {
      results.push(evidence(
        'RLS',
        'DISABLE',
        `${tableKey}.rls_enabled`,
        false,
        catalog.tables.get(tableKey)?.rlsEnabled === true,
        action,
      ));
      actionHandled = true;
    }

    if (!actionHandled) {
      unresolvedItems.push(unresolved('ALTER_TABLE_ACTION_NOT_PROVABLE_FROM_CATALOG', action));
    }
  }
  return true;
}

function analyzeGrant(normalized, catalog, results) {
  const match = normalized.match(
    /^(GRANT|REVOKE)\s+(.+?)\s+ON\s+(?:TABLE\s+)?([^\s]+)\s+(?:TO|FROM)\s+([^\s,]+)/i,
  );
  if (!match || /\bFUNCTION\b/i.test(normalized)) return false;
  const action = match[1].toUpperCase();
  const relation = normalizeIdentifier(match[3]);
  const grantee = normalizeIdentifier(match[4], relation.schema).name;
  const requested = match[2].split(',').map((value) => value.trim().toLowerCase());
  const privileges = requested.includes('all') || requested.includes('all privileges')
    ? TABLE_PRIVILEGES
    : requested;

  for (const privilege of privileges) {
    const key = `${relation.schema}.${relation.name}.${grantee}.${privilege}`;
    results.push(evidence(
      'TABLE_GRANT',
      action,
      key,
      action === 'GRANT',
      catalog.grants.has(key),
      normalized,
    ));
  }
  return true;
}

function analyzeFunctionGrant(normalized, catalog, results, unresolvedItems) {
  const match = normalized.match(
    /^(GRANT|REVOKE)\s+(EXECUTE|ALL(?:\s+PRIVILEGES)?)\s+ON\s+FUNCTION\s+([\s\S]+?)\s+(?:TO|FROM)\s+([^\s,;]+)/i,
  );
  if (!match) return false;

  const action = match[1].toUpperCase();
  const grantee = normalizeIdentifier(match[4]).name;
  const routines = splitTopLevelComma(match[3]);
  let parsed = 0;

  for (const routine of routines) {
    const routineMatch = routine.match(/^([^\s(]+)\s*\(([\s\S]*)\)$/);
    if (!routineMatch) {
      unresolvedItems.push(unresolved('FUNCTION_GRANT_SIGNATURE_REQUIRED', normalized));
      continue;
    }
    const identifier = normalizeIdentifier(routineMatch[1]);
    const signature = `${identifier.schema}.${identifier.name}(${normalizeRoutineArguments(routineMatch[2])})`;
    const key = `${signature}.${grantee}.execute`;
    results.push(evidence(
      'FUNCTION_GRANT',
      action,
      key,
      action === 'GRANT',
      catalog.functionGrants.has(key),
      normalized,
    ));
    parsed += 1;
  }

  return parsed > 0 || routines.length > 0;
}

export function extractStatementEvidence(statement, catalog) {
  const normalized = statement.replace(/\s+/g, ' ').trim();
  const upper = normalized.toUpperCase();
  const results = [];
  const unresolvedItems = [];
  let handled = false;

  handled = analyzeCreateTable(normalized, catalog, results, unresolvedItems) || handled;

  let match = normalized.match(/^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([^\s,]+)/i);
  if (match) {
    const relation = normalizeIdentifier(match[1]);
    const key = `${relation.schema}.${relation.name}`;
    results.push(evidence('TABLE', 'DROP', key, false, catalog.tables.has(key), normalized));
    handled = true;
  }

  handled = analyzeAlterTable(normalized, catalog, results, unresolvedItems) || handled;

  match = normalized.match(/^CREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s;]+)/i);
  if (match) {
    const name = normalizeIdentifier(match[1]).name;
    const observedVersion = catalog.extensions.get(name);
    results.push(evidence('EXTENSION', 'CREATE', name, true, observedVersion !== undefined, normalized));
    const requestedVersion = normalized.match(/\bVERSION\s+['"]?([^\s;'"]+)['"]?/i)?.[1]?.toLowerCase();
    if (requestedVersion) {
      results.push(evidence(
        'EXTENSION_VERSION',
        'MATCH',
        `${name}.${requestedVersion}`,
        true,
        observedVersion === requestedVersion,
        normalized,
      ));
    }
    handled = true;
  }

  match = normalized.match(/^DROP\s+EXTENSION\s+(?:IF\s+EXISTS\s+)?([^\s,;]+)/i);
  if (match) {
    const name = normalizeIdentifier(match[1]).name;
    results.push(evidence('EXTENSION', 'DROP', name, false, catalog.extensions.has(name), normalized));
    handled = true;
  }

  match = normalized.match(/^CREATE\s+TYPE\s+([^\s(]+)\s+AS\s+(?:ENUM|RANGE)\b/i);
  if (match) {
    const identifier = normalizeIdentifier(match[1]);
    const key = `${identifier.schema}.${identifier.name}`;
    const present = catalog.types.has(key);
    results.push(evidence('TYPE', 'CREATE', key, true, present, normalized));
    if (present) unresolvedItems.push(unresolved('TYPE_DEFINITION_REQUIRES_MANUAL_REVIEW', normalized));
    handled = true;
  }

  match = normalized.match(/^DROP\s+TYPE\s+(?:IF\s+EXISTS\s+)?([^\s,;]+)/i);
  if (match) {
    const identifier = normalizeIdentifier(match[1]);
    const key = `${identifier.schema}.${identifier.name}`;
    results.push(evidence('TYPE', 'DROP', key, false, catalog.types.has(key), normalized));
    handled = true;
  }

  match = normalized.match(/^CREATE\s+DOMAIN\s+([^\s]+)\s+AS\s+/i);
  if (match) {
    const identifier = normalizeIdentifier(match[1]);
    const key = `${identifier.schema}.${identifier.name}`;
    const present = catalog.types.has(key);
    results.push(evidence('DOMAIN', 'CREATE', key, true, present, normalized));
    if (present) unresolvedItems.push(unresolved('DOMAIN_DEFINITION_REQUIRES_MANUAL_REVIEW', normalized));
    handled = true;
  }

  match = normalized.match(/^DROP\s+DOMAIN\s+(?:IF\s+EXISTS\s+)?([^\s,;]+)/i);
  if (match) {
    const identifier = normalizeIdentifier(match[1]);
    const key = `${identifier.schema}.${identifier.name}`;
    results.push(evidence('DOMAIN', 'DROP', key, false, catalog.types.has(key), normalized));
    handled = true;
  }

  match = normalized.match(/^CREATE\s+SEQUENCE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s;]+)/i);
  if (match) {
    const identifier = normalizeIdentifier(match[1]);
    const key = `${identifier.schema}.${identifier.name}`;
    const present = catalog.sequences.has(key);
    results.push(evidence('SEQUENCE', 'CREATE', key, true, present, normalized));
    if (present) unresolvedItems.push(unresolved('SEQUENCE_DEFINITION_REQUIRES_MANUAL_REVIEW', normalized));
    handled = true;
  }

  match = normalized.match(/^DROP\s+SEQUENCE\s+(?:IF\s+EXISTS\s+)?([^\s,;]+)/i);
  if (match) {
    const identifier = normalizeIdentifier(match[1]);
    const key = `${identifier.schema}.${identifier.name}`;
    results.push(evidence('SEQUENCE', 'DROP', key, false, catalog.sequences.has(key), normalized));
    handled = true;
  }

  match = normalized.match(/^CREATE\s+(?:OR\s+REPLACE\s+)?(MATERIALIZED\s+)?VIEW\s+([^\s(;]+)/i);
  if (match) {
    const identifier = normalizeIdentifier(match[2]);
    const key = `${identifier.schema}.${identifier.name}`;
    const expectedKind = match[1] ? 'm' : 'v';
    const observed = catalog.tables.get(key);
    const present = observed?.relationKind === expectedKind;
    results.push(evidence('VIEW', 'CREATE_OR_REPLACE', key, true, present, normalized));
    if (present) unresolvedItems.push(unresolved('VIEW_DEFINITION_REQUIRES_MANUAL_REVIEW', normalized));
    handled = true;
  }

  match = normalized.match(/^DROP\s+(MATERIALIZED\s+)?VIEW\s+(?:IF\s+EXISTS\s+)?([^\s,;]+)/i);
  if (match) {
    const identifier = normalizeIdentifier(match[2]);
    const key = `${identifier.schema}.${identifier.name}`;
    const expectedKind = match[1] ? 'm' : 'v';
    const present = catalog.tables.get(key)?.relationKind === expectedKind;
    results.push(evidence('VIEW', 'DROP', key, false, present, normalized));
    handled = true;
  }

  match = normalized.match(
    /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?([^\s]+)\s+ON\s+(?:ONLY\s+)?([^\s(]+)/i,
  );
  if (match) {
    const relation = normalizeIdentifier(match[2]);
    const index = normalizeIdentifier(match[1], relation.schema);
    const key = `${index.schema}.${index.name}`;
    results.push(evidence('INDEX', 'CREATE', key, true, catalog.indexes.has(key), normalized));
    handled = true;
  }

  match = normalized.match(/^DROP\s+INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+EXISTS\s+)?([^\s,]+)/i);
  if (match) {
    const index = normalizeIdentifier(match[1]);
    const key = `${index.schema}.${index.name}`;
    results.push(evidence('INDEX', 'DROP', key, false, catalog.indexes.has(key), normalized));
    handled = true;
  }

  match = normalized.match(/^CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([^\s(]+)/i);
  if (match) {
    const functionName = normalizeIdentifier(match[1]);
    const key = `${functionName.schema}.${functionName.name}`;
    results.push(evidence('FUNCTION', 'CREATE_OR_REPLACE', key, true, catalog.functions.has(key), normalized));
    handled = true;
  }

  match = normalized.match(/^DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?([^\s(,]+)/i);
  if (match) {
    const functionName = normalizeIdentifier(match[1]);
    const key = `${functionName.schema}.${functionName.name}`;
    results.push(evidence('FUNCTION', 'DROP', key, false, catalog.functions.has(key), normalized));
    handled = true;
  }

  match = normalized.match(/^CREATE\s+POLICY\s+("[^"]+"|[^\s]+)\s+ON\s+([^\s]+)/i);
  if (match) {
    const relation = normalizeIdentifier(match[2]);
    const policy = normalizeIdentifier(match[1], relation.schema).name;
    const key = `${relation.schema}.${relation.name}.${policy}`;
    results.push(evidence('POLICY', 'CREATE', key, true, catalog.policies.has(key), normalized));
    handled = true;
  }

  match = normalized.match(/^DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?("[^"]+"|[^\s]+)\s+ON\s+([^\s]+)/i);
  if (match) {
    const relation = normalizeIdentifier(match[2]);
    const policy = normalizeIdentifier(match[1], relation.schema).name;
    const key = `${relation.schema}.${relation.name}.${policy}`;
    results.push(evidence('POLICY', 'DROP', key, false, catalog.policies.has(key), normalized));
    handled = true;
  }

  match = normalized.match(/^CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+([^\s]+)[\s\S]+?\s+ON\s+([^\s]+)/i);
  if (match) {
    const relation = normalizeIdentifier(match[2]);
    const trigger = normalizeIdentifier(match[1], relation.schema).name;
    const key = `${relation.schema}.${relation.name}.${trigger}`;
    results.push(evidence('TRIGGER', 'CREATE', key, true, catalog.triggers.has(key), normalized));
    handled = true;
  }

  match = normalized.match(/^DROP\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?([^\s]+)\s+ON\s+([^\s]+)/i);
  if (match) {
    const relation = normalizeIdentifier(match[2]);
    const trigger = normalizeIdentifier(match[1], relation.schema).name;
    const key = `${relation.schema}.${relation.name}.${trigger}`;
    results.push(evidence('TRIGGER', 'DROP', key, false, catalog.triggers.has(key), normalized));
    handled = true;
  }

  handled = analyzeFunctionGrant(normalized, catalog, results, unresolvedItems) || handled;
  handled = analyzeGrant(normalized, catalog, results) || handled;

  const dataOnly = /^(INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM|TRUNCATE\s+)/i.test(normalized);
  const dynamicSql = containsDynamicSql(normalized);
  const unsupportedDdl = /^(CREATE|ALTER|DROP)\s+SCHEMA\b/i.test(normalized);
  const configurationStatement = /^(SET|RESET|COMMENT\s+ON)\b/i.test(normalized);

  if (dataOnly) unresolvedItems.push(unresolved('DATA_STATE_NOT_PROVABLE_FROM_SCHEMA_CATALOG', normalized));
  if (dynamicSql) unresolvedItems.push(unresolved('DYNAMIC_SQL_REQUIRES_MANUAL_REVIEW', normalized));
  if (unsupportedDdl) unresolvedItems.push(unresolved('OBJECT_KIND_NOT_CAPTURED_BY_SCHEMA_EVIDENCE', normalized));
  if (!handled && !dataOnly && !dynamicSql && !unsupportedDdl && !configurationStatement && upper !== 'BEGIN' && upper !== 'COMMIT') {
    unresolvedItems.push(unresolved('STATEMENT_NOT_DETERMINISTICALLY_PARSED', normalized));
  }

  return { results, unresolved: unresolvedItems };
}

export function candidateFor(item, operations, unresolvedItems) {
  const matched = operations.filter((operation) => operation.targetStateMatched).length;
  const unmatched = operations.length - matched;
  const duplicate = item.duplicateVersion === true;
  const invalid = item.classificationReasons.includes('INVALID_LOCAL_FILENAME_OR_TIMESTAMP');

  let objectState = 'UNPROVABLE';
  if (operations.length > 0 && unmatched === 0 && unresolvedItems.length === 0) {
    objectState = 'TARGET_STATE_PRESENT';
  } else if (operations.length > 0 && matched === 0 && unresolvedItems.length === 0) {
    objectState = 'TARGET_STATE_ABSENT';
  } else if (operations.length > 0) {
    objectState = 'MIXED_OR_PARTIAL';
  }

  let candidateClassification = 'REQUIRES_SPLIT_REVIEW';
  let confidence = 'LOW';
  if (!duplicate && !invalid && objectState === 'TARGET_STATE_PRESENT') {
    candidateClassification = 'ALREADY_PRESENT_IN_SCHEMA';
    confidence = 'HIGH';
  } else if (!duplicate && !invalid && objectState === 'TARGET_STATE_ABSENT') {
    candidateClassification = 'PENDING_DEPLOYMENT';
    confidence = 'MEDIUM';
  } else if ((duplicate || invalid) && objectState !== 'UNPROVABLE') {
    confidence = 'MEDIUM';
  }

  return {
    objectState,
    candidateClassification,
    confidence,
    rationale: [
      `${matched}/${operations.length} parsed object target states match the production catalog.`,
      unresolvedItems.length > 0
        ? `${unresolvedItems.length} statement(s) remain unprovable by catalog metadata.`
        : 'No parsed statement remains unproved by the catalog parser.',
      duplicate
        ? 'The file shares a migration version and requires explicit duplicate-history resolution.'
        : null,
      invalid
        ? 'The filename or timestamp is invalid and remains fail-closed for explicit history treatment.'
        : null,
    ].filter(Boolean).join(' '),
    matchedOperations: matched,
    unmatchedOperations: unmatched,
    unresolvedStatements: unresolvedItems.length,
    humanDecisionRequired: true,
    automaticClassificationAllowed: false,
  };
}

function validateInputs(inventory, catalogText, targetSha, dryRunId, schemaEvidenceRunId) {
  if (inventory?.schema !== 'risck-comply.supabase-migration-reconciliation-inventory.v1') {
    throw new Error('unsupported migration reconciliation inventory schema');
  }
  if (!Array.isArray(inventory.items) || inventory.items.length === 0) {
    throw new Error('inventory.items must be a non-empty array');
  }
  if (!/^table\|/m.test(catalogText) || !/^migration\|/m.test(catalogText)) {
    throw new Error('catalog does not contain the required table and migration evidence sections');
  }
  if (!/^catalog_capability\|persistent_object_grants_v1$/m.test(catalogText)) {
    throw new Error('catalog does not contain persistent object and function grant capabilities');
  }
  if (targetSha && !/^[a-f0-9]{40}$/.test(targetSha)) {
    throw new Error('--target-sha must be a lowercase 40-character SHA');
  }
  if (dryRunId && !/^\d+$/.test(dryRunId)) throw new Error('--dry-run-id must be numeric');
  if (schemaEvidenceRunId && !/^\d+$/.test(schemaEvidenceRunId)) {
    throw new Error('--schema-evidence-run-id must be numeric');
  }
}

export async function runMigrationObjectEvidence(argv = process.argv.slice(2)) {
  const positional = argv.filter((argument) => !argument.startsWith('--'));
  const inventoryPath = positional[0]
    ?? 'artifacts/supabase-production-migration-dry-run/drift/migration-reconciliation-inventory.json';
  const catalogPath = positional[1]
    ?? 'artifacts/supabase-production-schema-evidence/catalog.txt';
  const migrationsDir = positional[2] ?? 'supabase/migrations';
  const outputDir = positional[3] ?? 'artifacts/supabase-migration-object-evidence';
  const targetSha = readFlag(argv, '--target-sha=');
  const dryRunId = readFlag(argv, '--dry-run-id=');
  const schemaEvidenceRunId = readFlag(argv, '--schema-evidence-run-id=');

  const inventoryBytes = await readFile(inventoryPath);
  const inventory = JSON.parse(inventoryBytes.toString('utf8'));
  const catalogBytes = await readFile(catalogPath);
  const catalogText = catalogBytes.toString('utf8');
  validateInputs(inventory, catalogText, targetSha, dryRunId, schemaEvidenceRunId);

  const catalog = parseCatalog(catalogText);
  const sortedItems = [...inventory.items].sort((left, right) => (
    [left.version ?? '', left.filename, left.sha256].join(':')
      .localeCompare([right.version ?? '', right.filename, right.sha256].join(':'))
  ));
  const items = [];

  for (const source of sortedItems) {
    const sqlPath = path.join(migrationsDir, source.filename);
    const sqlBytes = await readFile(sqlPath);
    if (sha256(sqlBytes) !== source.sha256) {
      throw new Error(`migration digest mismatch for ${source.filename}`);
    }

    const operations = [];
    const unresolvedItems = [];
    for (const statement of splitSqlStatements(sqlBytes.toString('utf8'))) {
      const statementEvidence = extractStatementEvidence(statement, catalog);
      operations.push(...statementEvidence.results);
      unresolvedItems.push(...statementEvidence.unresolved);
    }
    const candidate = candidateFor(source, operations, unresolvedItems);
    const objectProofDigest = sha256(JSON.stringify({
      migrationSha256: source.sha256,
      catalogSha256: sha256(catalogBytes),
      operations,
      unresolved: unresolvedItems,
    }));

    items.push({
      version: source.version,
      filename: source.filename,
      sha256: source.sha256,
      byteLength: source.byteLength,
      duplicateVersion: source.duplicateVersion === true,
      classificationReasons: source.classificationReasons,
      operations,
      unresolved: unresolvedItems,
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

  const source = {
    targetSha,
    dryRunId,
    schemaEvidenceRunId,
    inventoryPath,
    inventorySha256: sha256(inventoryBytes),
    catalogPath,
    catalogSha256: sha256(catalogBytes),
    migrationsDirectory: migrationsDir,
  };
  const report = {
    schema: 'risck-comply.supabase-migration-object-evidence.v1',
    status: 'HUMAN_REVIEW_REQUIRED',
    generatedAt: new Date().toISOString(),
    source,
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
  await writeFile(
    path.join(outputDir, 'migration-object-evidence.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  const batchSize = 25;
  const batchCount = Math.ceil(items.length / batchSize);
  for (let index = 0; index < batchCount; index += 1) {
    const batchNumber = index + 1;
    const batchId = `batch-${String(batchNumber).padStart(3, '0')}-of-${String(batchCount).padStart(3, '0')}`;
    await writeFile(path.join(outputDir, `${batchId}.json`), `${JSON.stringify({
      schema: 'risck-comply.supabase-migration-object-evidence-batch.v1',
      status: 'HUMAN_REVIEW_REQUIRED',
      batchId,
      batchNumber,
      batchCount,
      source,
      items: items.slice(index * batchSize, (index + 1) * batchSize),
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
    '- Accepted decisions: 0',
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

  return report;
}
