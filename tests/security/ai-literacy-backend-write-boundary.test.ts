import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260719213000_lock_ai_literacy_writes_backend_only.sql';
const migration = readFileSync(migrationPath, 'utf8');
const tableContracts = [
  { table: 'ai_literacy_programs', legacyReadPolicy: 'Members can read AI literacy programmes' },
  { table: 'ai_literacy_courses', legacyReadPolicy: 'Members can read AI literacy courses' },
  { table: 'ai_literacy_assignments', legacyReadPolicy: 'Members can read AI literacy assignments' },
  { table: 'ai_literacy_evidence', legacyReadPolicy: 'Members can read AI literacy evidence' },
  { table: 'enterprise_evidence_packs', legacyReadPolicy: 'Members can read enterprise evidence packs' },
  { table: 'enterprise_evidence_pack_items', legacyReadPolicy: 'Members can read enterprise evidence pack items' },
  { table: 'enterprise_vendor_due_diligence', legacyReadPolicy: 'Members can read enterprise vendor due diligence' },
  { table: 'enterprise_risk_reviews', legacyReadPolicy: 'Members can read enterprise risk reviews' },
] as const;
const tables = tableContracts.map(({ table }) => table);

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(path);
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

describe('governance backend-only write boundary', () => {
  it('fails closed on missing tables, forces RLS and removes every legacy write policy', () => {
    for (const table of tables) expect(migration).toContain(`'${table}'`);
    expect(migration).toContain("if to_regclass(format('public.%I', table_name)) is null then");
    expect(migration).toContain("execute format('alter table public.%I force row level security', table_name);");
    expect(migration).toContain("and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')");
    expect(migration).toContain("execute format('drop policy if exists %I on public.%I', policy_name, table_name);");
    expect(migration).not.toContain('app_rls_backend_only_enterprise(');
  });

  it('preserves member reads and installs explicit deny policies for every client mutation', () => {
    for (const { table, legacyReadPolicy } of tableContracts) {
      expect(migration).toContain(`drop policy if exists "${legacyReadPolicy}" on public.${table};`);
      expect(migration).toContain(`create policy "rls_${table}_select_member" on public.${table}`);
      expect(migration).toContain(`create policy "rls_${table}_insert_backend_only" on public.${table}`);
      expect(migration).toContain(`create policy "rls_${table}_update_backend_only" on public.${table}`);
      expect(migration).toContain(`create policy "rls_${table}_delete_backend_only" on public.${table}`);
    }
  });

  it('revokes direct writes from clients and grants only minimum table DML to the backend role', () => {
    for (const table of tables) {
      expect(migration).toContain(`revoke insert, update, delete on public.${table} from anon, authenticated;`);
      expect(migration).toContain(`grant select on public.${table} to authenticated;`);
      expect(migration).toContain(`grant select, insert, update, delete on public.${table} to service_role;`);
      expect(migration).not.toContain(`grant all on public.${table} to service_role;`);
    }
  });

  it('keeps every application write behind a server-only administrative boundary', () => {
    const violations: string[] = [];
    for (const path of walk(join(process.cwd(), 'src'))) {
      const source = readFileSync(path, 'utf8');
      const touchesGovernanceTable = tables.some((table) => source.includes(`.from('${table}')`));
      const mutates = /\.(insert|update|delete|upsert)\s*\(/.test(source);
      if (!touchesGovernanceTable || !mutates) continue;

      const normalized = relative(process.cwd(), path).split(sep).join('/');
      if (source.includes("'use client'") || !source.includes('createAdminClient')) {
        violations.push(normalized);
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps both official mutation entrypoints authorized, bounded, rate-limited and audited', () => {
    const literacyRoute = readFileSync('src/app/api/ai-literacy/route.ts', 'utf8');
    for (const token of [
      'assertTrustedOrigin',
      'requireApiUser',
      'getCurrentOrganizationForUser',
      'assertOrganizationPermission',
      "permission: 'manage_ai_governance'",
      'checkDistributedRateLimit',
      'parseJsonBodyWithZod',
      'createAuditEvent',
      'auditCreateOrRollback',
      'persistTransitionAudit',
      'noStoreJson',
    ]) expect(literacyRoute).toContain(token);

    const systemsRoute = readFileSync('src/app/api/ai-systems/route.ts', 'utf8');
    for (const token of [
      'assertTrustedOrigin',
      'requireApiUser',
      'getCurrentOrganizationForUser',
      'assertOrganizationPermission',
      "return 'manage_vendors'",
      "return 'manage_risks'",
      "return 'manage_ai_governance'",
      'checkDistributedRateLimit',
      'parseJsonBodyWithZod',
      'createAuditEvent',
      'noStoreJson',
    ]) expect(systemsRoute).toContain(token);
  });
});
