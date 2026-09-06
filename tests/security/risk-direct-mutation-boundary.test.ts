import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const isolationMigration = readFileSync(
  'supabase/migrations/20260906006500_billing_professional_task_plan_isolation.sql',
  'utf8',
);
const riskActions = readFileSync('src/server/actions/risks.ts', 'utf8');

describe('risk commercial mutation boundary', () => {
  it('removes direct browser DML while preserving authenticated reads', () => {
    expect(isolationMigration).toContain(
      'revoke insert, update, delete on table public.risks from anon, authenticated;',
    );
    expect(isolationMigration).toContain('grant select on table public.risks to authenticated;');
    expect(isolationMigration).toContain("has_table_privilege('authenticated', 'public.risks', 'INSERT')");
    expect(isolationMigration).toContain("has_table_privilege('authenticated', 'public.risks', 'UPDATE')");
    expect(isolationMigration).toContain("has_table_privilege('authenticated', 'public.risks', 'DELETE')");
    expect(isolationMigration).toContain("has_table_privilege('service_role', 'public.risks', 'INSERT')");
  });

  it('keeps all reviewed risk mutations on server-side authority paths', () => {
    expect(riskActions).toContain("import { createAdminClient } from '@/lib/supabase/admin';");
    expect(riskActions).toContain('mutateCommercialResourceAtomic({');
    expect(riskActions).toContain("resource: 'risk'");
    expect(riskActions).toContain("operation: 'create'");
    expect(riskActions).toContain("operation: 'delete'");
    expect(riskActions).toContain(".from('risks')\n      .update(changes)");
  });
});
