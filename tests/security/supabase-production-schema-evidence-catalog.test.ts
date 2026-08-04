import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('scripts/supabase/production-schema-evidence.sql', 'utf8');
const workflow = readFileSync('.github/workflows/supabase-production-schema-evidence.yml', 'utf8');

describe('Supabase production schema evidence catalog', () => {
  it('stays transactionally read-only and queries catalogs rather than application rows', () => {
    expect(sql).toContain('begin transaction read only;');
    expect(sql).toContain('rollback;');
    expect(sql).toContain("set local statement_timeout = '60s';");
    expect(sql).not.toMatch(/\b(insert|update|delete|truncate|alter|drop|create)\s+(?:table|schema|function|policy)\b/i);
  });

  it('captures overload-safe function ACL evidence including default privileges', () => {
    expect(sql).toContain("select 'catalog_capability', 'persistent_object_grants_v1'");
    expect(sql).toContain("select 'function_grant'");
    expect(sql).toContain('pg_get_function_identity_arguments(p.oid)');
    expect(sql).toContain("coalesce(p.proacl, acldefault('f', p.proowner))");
    expect(sql).toContain('aclexplode(');
    expect(sql).toContain("coalesce(grantee.rolname, 'PUBLIC')");
  });

  it('captures persistent extension and user-defined type presence', () => {
    expect(sql).toContain("select 'extension', extname, extversion");
    expect(sql).toContain('from pg_extension');
    expect(sql).toContain("select 'type', n.nspname, t.typname, t.typtype");
    expect(sql).toContain("and t.typtype in ('e', 'd', 'r', 'c')");
    expect(sql).toContain('and t.typelem = 0');
  });

  it('publishes bounded counts without exposing catalog contents', () => {
    expect(workflow).toContain("grep -c '^function_grant|'");
    expect(workflow).toContain("grep -c '^extension|'");
    expect(workflow).toContain("grep -c '^type|'");
    expect(workflow).toContain("grep -c '^sequence|'");
    expect(workflow).not.toContain('cat "$catalog"');
  });
});
