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
  'compliance_tasks',
  'subscriptions',
  'notifications',
];
const backendOnlyTables = ['audit_events', 'audit_logs', 'subscriptions', 'organization_invites', 'invitations'];
const legacyCleanupTables = ['notifications', 'ai_systems', 'ai_incidents', 'organization_invites', 'invitations', 'subscriptions'];

function readMigrations() {
  return fs.readdirSync(migrationDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => fs.readFileSync(path.join(migrationDir, file), 'utf8'))
    .join('\n\n');
}

describe('Supabase RLS migration coverage', () => {
  it('enables RLS and creates policies for every critical tenant table', () => {
    const sql = readMigrations();
    const missing = [];

    for (const table of criticalTables) {
      const hasEnable = new RegExp(`alter\\s+table(?:\\s+if\\s+exists)?\\s+(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(sql)
        || sql.includes(`app_rls_org_scoped('${table}')`)
        || sql.includes(`app_rls_backend_only('${table}')`);
      const hasPolicy = new RegExp(`create\\s+policy[\\s\\S]+?on\\s+(?:public\\.)?${table}`, 'i').test(sql)
        || sql.includes(`app_rls_org_scoped('${table}')`)
        || sql.includes(`app_rls_backend_only('${table}')`);

      if (!hasEnable) missing.push(`${table}: RLS enable`);
      if (!hasPolicy) missing.push(`${table}: policy`);
    }

    expect(missing).toEqual([]);
  });

  it('keeps backend-owned tables write-denied to authenticated clients', () => {
    const sql = readMigrations();
    const missing = [];

    for (const table of backendOnlyTables) {
      const hasBackendOnly = sql.includes(`app_rls_backend_only('${table}')`)
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
});
