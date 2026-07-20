import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260719214500_enforce_sales_console_admin_actor_scope.sql';
const migration = readFileSync(migrationPath, 'utf8');

describe('Sales Console enabled platform-admin actor scope migration', () => {
  it('requires every non-null scoped actor to be an enabled platform administrator', () => {
    expect(migration).toContain('create or replace function public.enforce_sales_console_admin_actor_scope()');
    expect(migration).toContain('platform_admin.user_id = scoped_user_id');
    expect(migration).toContain('platform_admin.enabled = true');
    expect(migration).toContain("raise exception 'sales_console_actor_not_enabled_platform_admin'");
    expect(migration).toContain("using errcode = 'check_violation'");
  });

  it('covers lead owners, lead updaters, activity creators, note creators, and event actors', () => {
    expect(migration).toContain("tg_argv[0] = 'owner_user_id'");
    expect(migration).toContain("tg_argv[0] = 'updated_by'");
    expect(migration).toContain("tg_table_name = 'sales_lead_activities'");
    expect(migration).toContain("tg_table_name = 'sales_lead_notes'");
    expect(migration).toContain("tg_table_name = 'sales_lead_activity_events'");
    expect(migration).toContain('before insert or update of owner_user_id');
    expect(migration).toContain('before insert or update of updated_by');
    expect(migration).toContain('before insert or update of created_by');
    expect(migration).toContain('before insert or update of actor_user_id');
  });

  it('preserves nullable ownership and historical attribution flows', () => {
    expect(migration).toContain('if scoped_user_id is null then');
    expect(migration).toContain('return new;');
  });

  it('does not expose the security-definer function for direct execution', () => {
    expect(migration).toContain("security definer\nset search_path = ''");
    expect(migration).toContain('revoke all on function public.enforce_sales_console_admin_actor_scope() from public;');
    expect(migration).toContain('revoke all on function public.enforce_sales_console_admin_actor_scope() from anon;');
    expect(migration).toContain('revoke all on function public.enforce_sales_console_admin_actor_scope() from authenticated;');
  });
});
