import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/supabase-live-rls-validation.yml', 'utf8');

describe('Supabase live RLS promotion-bound workflow', () => {
  it('is dispatch-only and requires exact promotion lineage', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toContain('push:\n');
    expect(workflow).toContain('promotion_run_id:');
    expect(workflow).toContain('EXECUTE_POST_FORWARD_PROMOTION_RUNTIME_PROOF');
    expect(workflow).toContain('supabase-forward-reconciliation-production-promotion.yml');
    expect(workflow).toContain('validate-supabase-live-promotion-source.mjs');
  });

  it('keeps migration execution completely outside the live proof', () => {
    expect(workflow).not.toContain('apply_migrations');
    expect(workflow).not.toContain('apply_rls_migrations');
    expect(workflow).not.toContain('db push');
    expect(workflow).not.toContain('psql ');
    expect(workflow).not.toContain('SUPABASE_DB_URL');
    expect(workflow).not.toContain('SUPABASE_DB_POOLER_URL');
  });

  it('runs the integrated tenant proof under protected credentials and preserves read-only repository permissions', () => {
    expect(workflow).toContain('environment: supabase-live-rls-validation');
    expect(workflow).toContain('run: node scripts/security/run-supabase-live-tenant-isolation.mjs');
    expect(workflow).toContain('SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}');
    expect(workflow).toContain('permissions:\n  actions: read\n  contents: read');
    expect(workflow).not.toContain('contents: write');
  });
});
