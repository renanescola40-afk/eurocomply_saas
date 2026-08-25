import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260822123624_v19_harden_gap_personal_task_write_boundary.sql',
  'utf8',
);
const dashboardQueries = readFileSync('src/server/queries/dashboard.ts', 'utf8');
const config = readFileSync('config/supabase-forward-reconciliation.json', 'utf8');

describe('compliance metric snapshot tenant boundary', () => {
  it('keeps the live tenant-scoped snapshot table backend-only in the selected forward package', () => {
    expect(config).toContain('2026-08-25-enterprise-data-plane-payment-first-trusted-access-document-quota-closure-v22');
    expect(config).toContain('20260822123624_v19_harden_gap_personal_task_write_boundary.sql');
    expect(config).toContain('20260823123000_payment_first_commercial_data_plane.sql');
    expect(config).toContain('20260823131500_payment_first_gap_analysis_and_storage.sql');
    expect(config).toContain('20260824190000_reconcile_enterprise_trusted_access_runtime.sql');
    expect(config).toContain('20260825092500_atomic_document_commercial_quota.sql');

    expect(migration).toContain("if to_regclass('public.compliance_metric_snapshots') is null");
    expect(migration).toContain('where organization_id is null');
    expect(migration).toContain('alter column organization_id set not null');
    expect(migration).toContain('alter table public.compliance_metric_snapshots enable row level security');
    expect(migration).toContain('alter table public.compliance_metric_snapshots force row level security');
    expect(migration).toContain("tablename = 'compliance_metric_snapshots'");
    expect(migration).toContain('revoke all on table public.compliance_metric_snapshots from public, anon, authenticated');
    expect(migration).toContain(
      'grant select, insert, update, delete on table public.compliance_metric_snapshots to service_role',
    );
    expect(migration).toContain('compliance_metric_snapshots browser privileges are not fully revoked');
    expect(migration).toContain('compliance_metric_snapshots must not expose browser RLS policies');
  });

  it('matches the current server-only dashboard runtime contract', () => {
    expect(dashboardQueries).toContain("import { createAdminClient } from '@/lib/supabase/admin'");
    expect(dashboardQueries).toContain("supabase.from('compliance_metric_snapshots').insert");
    expect(dashboardQueries).toContain(".from('compliance_metric_snapshots')");
    expect(dashboardQueries).toContain(".eq('organization_id', organizationId)");
  });
});
