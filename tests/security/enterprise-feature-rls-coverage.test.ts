import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type FeatureRlsContract = {
  area: string;
  tables: string[];
  mode: 'direct-org-policy' | 'org-scoped-writer' | 'backend-only';
};

const migrationDir = join(process.cwd(), 'supabase', 'migrations');
const finalLockMigration = '20260620120000_enterprise_multi_tenant_rls_final_lock.sql';

const featureRlsContracts: FeatureRlsContract[] = [
  { area: 'dashboard organization', tables: ['organizations'], mode: 'direct-org-policy' },
  { area: 'permissions owner/admin/member/viewer', tables: ['organization_members'], mode: 'direct-org-policy' },
  { area: 'documents and document approvals', tables: ['documents'], mode: 'org-scoped-writer' },
  { area: 'risks', tables: ['risks'], mode: 'org-scoped-writer' },
  { area: 'vendors', tables: ['vendors'], mode: 'org-scoped-writer' },
  { area: 'AI systems inventory', tables: ['ai_systems'], mode: 'org-scoped-writer' },
  { area: 'AI incidents', tables: ['ai_incidents'], mode: 'org-scoped-writer' },
  { area: 'tasks and approvals', tables: ['tasks', 'compliance_tasks'], mode: 'org-scoped-writer' },
  { area: 'billing subscription data', tables: ['subscriptions'], mode: 'backend-only' },
  { area: 'audit evidence', tables: ['audit_events', 'audit_logs'], mode: 'backend-only' },
  { area: 'AI literacy governed writes', tables: ['ai_literacy_programs', 'ai_literacy_courses', 'ai_literacy_assignments', 'ai_literacy_evidence'], mode: 'backend-only' },
  { area: 'enterprise evidence workflows', tables: ['enterprise_evidence_packs', 'enterprise_evidence_pack_items', 'enterprise_vendor_due_diligence', 'enterprise_risk_reviews'], mode: 'backend-only' },
];

function readMigrations() {
  return readdirSync(migrationDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(join(migrationDir, file), 'utf8'))
    .join('\n\n');
}

function readFinalLockMigration() {
  return readFileSync(join(migrationDir, finalLockMigration), 'utf8');
}

function helperLoopIncludes(sql: string, helperName: string, table: string) {
  const helperCall = new RegExp(String.raw`foreach\s+table_name\s+in\s+array\s+array\[[\s\S]*'${table}'[\s\S]*\][\s\S]*perform\s+public\.${helperName}\(table_name\)`, 'i').test(sql)
    || new RegExp(String.raw`${helperName}\('${table}'\)`, 'i').test(sql);
  if (helperCall) return true;
  if (helperName !== 'app_rls_backend_only_enterprise') return false;

  return ['insert', 'update', 'delete'].every((operation) => new RegExp(
    String.raw`create\s+policy\s+"rls_${table}_${operation}_backend_only"\s+on\s+public\.${table}[\s\S]{0,180}for\s+${operation}\s+to\s+authenticated[\s\S]{0,120}(using\s*\(false\)|with\s+check\s*\(false\))`,
    'i',
  ).test(sql));
}

describe('enterprise feature RLS coverage', () => {
  it('maps every sellable enterprise feature area to tenant-scoped or backend-only RLS coverage', () => {
    const sql = readMigrations();
    const missing: string[] = [];

    for (const contract of featureRlsContracts) {
      for (const table of contract.tables) {
        const covered = contract.mode === 'direct-org-policy'
          ? new RegExp(String.raw`alter\s+table\s+public\.${table}\s+enable\s+row\s+level\s+security`, 'i').test(sql)
          : contract.mode === 'org-scoped-writer'
            ? helperLoopIncludes(sql, 'app_rls_org_scoped_enterprise', table)
            : helperLoopIncludes(sql, 'app_rls_backend_only_enterprise', table);

        if (!covered) {
          missing.push(`${contract.area}:${table}:${contract.mode}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('keeps writer-role tables readable by members but writable only by owner/admin/editor', () => {
    const finalLockSql = readFinalLockMigration();

    expect(finalLockSql).toContain('create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id))');
    expect(finalLockSql).toContain('create policy %I on public.%I for insert to authenticated with check (public.has_org_write_role(organization_id))');
    expect(finalLockSql).toContain('create policy %I on public.%I for update to authenticated using (public.has_org_write_role(organization_id)) with check (public.has_org_write_role(organization_id))');
    expect(finalLockSql).toContain("create policy %I on public.%I for delete to authenticated using (public.has_org_role(organization_id, array[''owner'',''admin'']))");
  });

  it('keeps backend-owned billing and audit tables non-writable from authenticated clients', () => {
    const finalLockSql = readFinalLockMigration();

    expect(finalLockSql).toContain('create policy %I on public.%I for insert to authenticated with check (false)');
    expect(finalLockSql).toContain('create policy %I on public.%I for update to authenticated using (false) with check (false)');
    expect(finalLockSql).toContain('create policy %I on public.%I for delete to authenticated using (false)');
  });
});
