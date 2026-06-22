import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationDir = path.join('supabase', 'migrations');
const criticalTables = [
  'organizations',
  'organization_members',
  'documents',
  'audit_events',
  'risks',
  'vendors',
  'tasks',
  'subscriptions',
  'notifications',
];
const backendOnlyTables = ['audit_events', 'audit_logs', 'subscriptions', 'organization_invites', 'invitations'];
const legacyCleanupTables = ['notifications', 'ai_systems', 'ai_incidents', 'organization_invites', 'invitations', 'subscriptions'];
const writerRoleTables = ['documents', 'risks', 'vendors', 'tasks'];

function readMigrations() {
  return fs.readdirSync(migrationDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => fs.readFileSync(path.join(migrationDir, file), 'utf8'))
    .join('\n\n');
}

function helperUsed(sql, helperName, table) {
  return new RegExp(`${helperName}\\('${table}'\\)`, 'i').test(sql)
    || new RegExp(String.raw`foreach\s+table_name\s+in\s+array\s+array\[[\s\S]*'${table}'[\s\S]*\][\s\S]*perform\s+public\.${helperName}\(table_name\)`, 'i').test(sql);
}

function orgScopedHelperUsed(sql, table) {
  return helperUsed(sql, 'app_rls_org_scoped', table) || helperUsed(sql, 'app_rls_org_scoped_enterprise', table);
}

function backendOnlyHelperUsed(sql, table) {
  return helperUsed(sql, 'app_rls_backend_only', table) || helperUsed(sql, 'app_rls_backend_only_enterprise', table);
}

describe('Supabase RLS migration coverage', () => {
  it('enables RLS and creates policies for every critical tenant table', () => {
    const sql = readMigrations();
    const missing = [];

    for (const table of criticalTables) {
      const hasEnable = new RegExp(`alter\\s+table(?:\\s+if\\s+exists)?\\s+(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(sql)
        || orgScopedHelperUsed(sql, table)
        || backendOnlyHelperUsed(sql, table);
      const hasPolicy = new RegExp(`create\\s+policy[\\s\\S]+?on\\s+(?:public\\.)?${table}`, 'i').test(sql)
        || orgScopedHelperUsed(sql, table)
        || backendOnlyHelperUsed(sql, table);

      if (!hasEnable) missing.push(`${table}: RLS enable`);
      if (!hasPolicy) missing.push(`${table}: policy`);
    }

    expect(missing).toEqual([]);
  });

  it('keeps backend-owned tables write-denied to authenticated clients', () => {
    const sql = readMigrations();
    const missing = [];

    for (const table of backendOnlyTables) {
      const hasBackendOnly = backendOnlyHelperUsed(sql, table)
        || new RegExp(`rls_${table}_(insert|update|delete)_backend_only[\\s\\S]+?(with check \\(false\\)|using \\(false\\))`, 'i').test(sql);
      if (!hasBackendOnly) missing.push(table);
    }

    expect(missing).toEqual([]);
  });

  it('drops known legacy permissive policies before relying on stricter replacements', () => {
    const sql = readMigrations();
    const missing = [];

    for (const table of legacyCleanupTables) {
      const hasDrop = new RegExp(`drop\\s+policy\\s+if\\s+exists[\\s\\S]+?on\\s+(?:public\\.)?${table}`, 'i').test(sql)
        || new RegExp(`drop\\s+policy\\s+if\\s+exists[\\s\\S]+?on\\s+public\\.%I`, 'i').test(sql);
      if (!hasDrop) missing.push(table);
    }

    expect(missing).toEqual([]);
  });

  it('requires write-role policies for client-writable customer tables', () => {
    const sql = readMigrations();
    const missing = [];

    for (const table of writerRoleTables) {
      const hasWriterPolicy = orgScopedHelperUsed(sql, table) && sql.includes('has_org_write_role')
        || new RegExp(`on\\s+(?:public\\.)?${table}[\\s\\S]+?has_org_write_role`, 'i').test(sql);
      if (!hasWriterPolicy) missing.push(table);
    }

    expect(missing).toEqual([]);
  });
});
