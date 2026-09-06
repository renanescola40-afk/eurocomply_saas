import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const quotaMigration = readFileSync(
  'supabase/migrations/20260906003000_billing_ai_system_commercial_quota.sql',
  'utf8',
);
const aiSystemQueries = readFileSync('src/server/queries/ai-systems.ts', 'utf8');

describe('AI-system commercial mutation boundary', () => {
  it('removes direct browser DML while preserving authenticated reads', () => {
    expect(quotaMigration).toContain(
      'revoke insert, update, delete on table public.ai_systems from anon, authenticated;',
    );
    expect(quotaMigration).toContain('grant select on table public.ai_systems to authenticated;');
    expect(quotaMigration).toContain("has_table_privilege('authenticated', 'public.ai_systems', 'INSERT')");
    expect(quotaMigration).toContain("has_table_privilege('authenticated', 'public.ai_systems', 'UPDATE')");
    expect(quotaMigration).toContain("has_table_privilege('authenticated', 'public.ai_systems', 'DELETE')");
    expect(quotaMigration).toContain("has_table_privilege('service_role', 'public.ai_systems', 'INSERT')");
  });

  it('keeps the reviewed application mutation path behind service-role atomic RPCs', () => {
    expect(aiSystemQueries).toContain("import { createAdminClient } from '@/lib/supabase/admin';");
    expect(aiSystemQueries).toContain("const ATOMIC_CREATE_RPC = 'create_ai_system_atomic';");
    expect(aiSystemQueries).toContain("const ATOMIC_REASSESSMENT_RPC = 'reassess_ai_system_atomic';");
    expect(aiSystemQueries).toContain('supabase.rpc(ATOMIC_CREATE_RPC, {');
    expect(aiSystemQueries).toContain('supabase.rpc(ATOMIC_REASSESSMENT_RPC, {');
  });
});
