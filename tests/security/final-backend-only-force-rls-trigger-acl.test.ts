import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260909144000_finalize_backend_only_force_rls_and_trigger_acl.sql',
  'utf8',
);

describe('final backend-only Supabase hardening', () => {
  it('forces RLS on backend-only marketing and waitlist tables without granting browser access', () => {
    for (const table of ['linkedin_marketing_posts', 'waitlist_leads']) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`alter table public.${table} force row level security`);
      expect(migration).toContain(`revoke all privileges on table public.${table} from anon, authenticated`);
    }
  });

  it('removes public browser EXECUTE from the QMS trigger function', () => {
    expect(migration).toContain(
      'revoke execute on function public.prevent_ai_qms_decision_mutation() from public, anon, authenticated',
    );
    expect(migration).toContain(
      "has_function_privilege('anon','public.prevent_ai_qms_decision_mutation()','EXECUTE')",
    );
    expect(migration).toContain(
      "has_function_privilege('authenticated','public.prevent_ai_qms_decision_mutation()','EXECUTE')",
    );
  });

  it('remains forward-only and non-destructive', () => {
    expect(migration).not.toMatch(/\b(drop\s+table|truncate\s+table)\b/i);
    expect(migration).not.toMatch(/\bdelete\s+from\b/i);
    expect(migration).not.toMatch(/\bupdate\s+public\./i);
  });
});
