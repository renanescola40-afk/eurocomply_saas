#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const migrationDir = path.join('supabase', 'migrations');
const sourceRoots = ['src', 'app', 'lib', 'server', 'tests'];
const criticalTables = new Set([
  'organizations',
  'organization_members',
  'documents',
  'audit_events',
  'audit_logs',
  'risks',
  'vendors',
  'tasks',
  'compliance_tasks',
  'subscriptions',
  'notifications',
  'organization_invites',
  'invitations',
  'ai_systems',
  'ai_incidents',
]);
const backendOnlyTables = new Set(['audit_events', 'audit_logs', 'subscriptions', 'organization_invites', 'invitations']);
const userScopedAllowList = new Set(['profiles', 'users']);
const failures = [];

function listFiles(dir, matcher) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath, matcher);
    return matcher(fullPath) ? [fullPath] : [];
  });
}

function readAll(paths) {
  return paths.map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }));
}

function extractCreateTableColumns(sql) {
  const tables = new Map();
  const createTablePattern = /create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;
  let match;
  while ((match = createTablePattern.exec(sql)) != null) {
    const table = match[1];
    const body = match[2];
    const columns = new Set();
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim().replace(/,$/, '');
      const column = line.match(/^([a-zA-Z0-9_]+)\s+/)?.[1];
      if (column && !['constraint', 'primary', 'foreign', 'unique', 'check'].includes(column.toLowerCase())) {
        columns.add(column);
      }
    }
    tables.set(table, new Set([...(tables.get(table) ?? []), ...columns]));
  }
  return tables;
}

function mergeMaps(maps) {
  const merged = new Map();
  for (const map of maps) {
    for (const [table, columns] of map.entries()) {
      merged.set(table, new Set([...(merged.get(table) ?? []), ...columns]));
    }
  }
  return merged;
}

function hasRlsEnable(sql, table) {
  return new RegExp(`alter\\s+table(?:\\s+if\\s+exists)?\\s+(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(sql);
}

function hasPolicy(sql, table, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`create\\s+policy[\\s\\S]+?on\\s+(?:public\\.)?${table}[\\s\\S]+?${escaped}`, 'i').test(sql)
    || new RegExp(`create\\s+policy[\\s\\S]+?on\\s+public\\.%I[\\s\\S]+?${escaped}`, 'i').test(sql);
}

function hasDropLegacy(sql, table) {
  return new RegExp(`drop\\s+policy\\s+if\\s+exists[\\s\\S]+?on\\s+(?:public\\.)?${table}`, 'i').test(sql)
    || new RegExp(`drop\\s+policy\\s+if\\s+exists[\\s\\S]+?on\\s+public\\.%I`, 'i').test(sql);
}

function auditMigrations() {
  const migrationFiles = listFiles(migrationDir, (file) => file.endsWith('.sql'));
  const migrationTexts = readAll(migrationFiles);
  const allSql = migrationTexts.map((entry) => entry.text).join('\n\n');
  const schemaTables = mergeMaps(migrationTexts.map((entry) => extractCreateTableColumns(entry.text)));
  const tenantTables = new Set([...criticalTables]);

  for (const [table, columns] of schemaTables.entries()) {
    if (columns.has('organization_id') || (columns.has('user_id') && !userScopedAllowList.has(table))) tenantTables.add(table);
  }

  for (const table of tenantTables) {
    if (!hasRlsEnable(allSql, table)) failures.push(`Missing RLS enable migration coverage for table: ${table}`);
    if (!hasPolicy(allSql, table, 'select')) failures.push(`Missing SELECT policy coverage for table: ${table}`);

    if (backendOnlyTables.has(table)) {
      if (!hasPolicy(allSql, table, 'with check (false)')) failures.push(`Missing backend-only write denial policy for table: ${table}`);
    } else if (table !== 'organizations') {
      if (!hasPolicy(allSql, table, 'organization_id') && table !== 'organization_members') failures.push(`Missing organization_id policy guard for table: ${table}`);
      if (!hasPolicy(allSql, table, 'insert')) failures.push(`Missing INSERT policy coverage for table: ${table}`);
      if (!hasPolicy(allSql, table, 'update')) failures.push(`Missing UPDATE policy coverage for table: ${table}`);
      if (!hasPolicy(allSql, table, 'delete')) failures.push(`Missing DELETE policy coverage for table: ${table}`);
    }

    if (['notifications', 'ai_systems', 'ai_incidents', 'organization_invites', 'invitations', 'subscriptions'].includes(table) && !hasDropLegacy(allSql, table)) {
      failures.push(`Missing legacy policy cleanup for table: ${table}`);
    }
  }

  return [...tenantTables].sort();
}

function auditQueryLayer() {
  const files = sourceRoots.flatMap((root) => listFiles(root, (file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)));
  const tenantTableNames = [...criticalTables].filter((table) => !userScopedAllowList.has(table));
  const fromPattern = /\.from\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const file of files) {
    if (file.includes(`${path.sep}node_modules${path.sep}`) || file.includes(`${path.sep}.next${path.sep}`)) continue;
    const text = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = fromPattern.exec(text)) != null) {
      const table = match[1];
      if (!tenantTableNames.includes(table)) continue;
      const snippet = text.slice(match.index, Math.min(text.length, match.index + 1500));
      const usesUserId = /\.eq\(\s*['"]user_id['"]/.test(snippet);
      const hasOrgGuard = /\.eq\(\s*['"]organization_id['"]|\.match\(\s*\{[^}]*organization_id\s*:|requireOrganizationAccess|assertOrganization|organizationId|organization_id/.test(snippet);
      if (usesUserId && !hasOrgGuard) failures.push(`${file}: ${table} query filters user_id without an organization guard`);
    }
  }
}

const tenantTables = auditMigrations();
auditQueryLayer();

const report = {
  auditedAt: new Date().toISOString(),
  migrationDirectory: migrationDir,
  tenantTables,
  criticalTables: [...criticalTables].sort(),
  failures,
};

console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) process.exitCode = 1;
