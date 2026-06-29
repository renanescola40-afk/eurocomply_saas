import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationDir = path.join('supabase', 'migrations');
const criticalTables = [
  'organizations',
  'organization_members',
  'documents',
  'risks',
  'vendors',
  'ai_systems',
  'ai_incidents',
  'compliance_tasks',
  'subscriptions',
  'organization_invites',
  'invitations',
  'notifications',
  'audit_events',
  'audit_logs',
  'onboarding_activation_runs',
];
const backendOnlyTables = ['audit_events', 'audit_logs', 'subscriptions', 'organization_invites', 'invitations'];
const legacyCleanupTables = ['notifications', 'ai_systems', 'ai_incidents', 'organization_invites', 'invitations', 'subscriptions', 'compliance_tasks'];
const writerRoleTables = ['documents', 'risks', 'vendors', 'tasks', 'compliance_tasks', 'ai_systems', 'ai_incidents', 'onboarding_activation_runs'];
const staleBackendWritePolicySuffixes = [
  'insert_member',
  'insert_writer',
  'insert_admin',
  'update_member',
  'update_writer',
  'update_admin',
  'delete_member',
  'delete_writer',
  'delete_admin',
];

function migrationFiles() {
  return fs.readdirSync(migrationDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

function readMigrations() {
  return migrationFiles()
    .map((file) => fs.readFileSync(path.join(migrationDir, file), 'utf8'))
    .join('\n\n');
}

function readMigration(filename) {
  return fs.readFileSync(path.join(migrationDir, filename), 'utf8');
}

function helperUsed(sql, helperName, table) {
  return new RegExp(`${helperName}\\('${table}'`, 'i').test(sql)
    || new RegExp(String.raw`foreach\s+(\w+)\s+in\s+array\s+array\[[\s\S]*'${table}'[\s\S]*\][\s\S]*perform\s+public\.${helperName}\(\1\)`, 'i').test(sql)
    || new RegExp(String.raw`foreach\s+table_name\s+in\s+array\s+array\[[\s\S]*'${table}'[\s\S]*\][\s\S]*perform\s+public\.${helperName}\(table_name\)`, 'i').test(sql);
}

function orgScopedHelperUsed(sql, table) {
  return helperUsed(sql, 'app_rls_org_scoped', table)
    || helperUsed(sql, 'app_rls_org_scoped_enterprise', table)
    || helperUsed(sql, 'app_rls_harden_org_writable_table', table);
}

function backendOnlyHelperUsed(sql, table) {
  return helperUsed(sql, 'app_rls_backend_only', table)
    || helperUsed(sql, 'app_rls_backend_only_enterprise', table)
    || helperUsed(sql, 'app_rls_harden_backend_only_table', table);
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
        || new RegExp(`drop\\s+policy\\s+if\\s+exists[\\s\\S]+?on\\s+public\\.%I`, 'i').test(sql)
        || helperUsed(sql, 'app_rls_drop_known_policies', table);
      if (!hasDrop) missing.push(table);
    }

    expect(missing).toEqual([]);
  });

  it('removes stale org-scoped write policies from backend-owned tables', () => {
    const cleanupMigration = readMigration('20260629110000_enterprise_tenant_rls_cleanup_indexes.sql');
    const missing = [];

    for (const table of backendOnlyTables) {
      for (const suffix of staleBackendWritePolicySuffixes) {
        if (!cleanupMigration.includes(`'rls_' || p_table_name || '_${suffix}'`)) {
          missing.push(`${table}: ${suffix}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('requires write-role policies for client-writable customer tables', () => {
    const sql = readMigrations();
    const missing = [];

    for (const table of writerRoleTables) {
      const hasWriterPolicy = (orgScopedHelperUsed(sql, table) && (sql.includes('has_org_write_role') || sql.includes('has_org_role')))
        || new RegExp(`on\\s+(?:public\\.)?${table}[\\s\\S]+?(has_org_write_role|has_org_role)`, 'i').test(sql);
      if (!hasWriterPolicy) missing.push(table);
    }

    expect(missing).toEqual([]);
  });

  it('does not introduce broad RLS allow-all policies', () => {
    const sql = readMigrations().toLowerCase().replace(/\s+/g, ' ');

    expect(sql).not.toMatch(/using\s*\(\s*true\s*\)/);
    expect(sql).not.toMatch(/with check\s*\(\s*true\s*\)/);
  });

  it('uses explicit safe search_path on security definer helpers', () => {
    const sql = readMigrations();
    const securityDefinerFunctions = [...sql.matchAll(/create\s+or\s+replace\s+function\s+([\w.]+)[\s\S]+?security\s+definer[\s\S]+?\$\$/gi)];
    const missingSearchPath = securityDefinerFunctions
      .filter((match) => !/set\s+search_path\s*=\s*public(?:\s*,\s*(?:pg_temp|pg_catalog))?/i.test(match[0]))
      .map((match) => match[1]);

    expect(missingSearchPath).toEqual([]);
  });
});
