import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const MIGRATION = new URL('../../supabase/migrations/20260825092500_atomic_document_commercial_quota.sql', import.meta.url);
const MANIFEST = new URL('../../config/supabase-forward-reconciliation.json', import.meta.url);
const CATALOG = new URL('../../src/lib/billing/plans.ts', import.meta.url);
const DOCUMENT_ACTIONS = new URL('../../src/server/actions/documents.ts', import.meta.url);

describe('document commercial quota atomicity', () => {
  it('keeps application preflight fail-closed but makes PostgreSQL the final serialized quota authority', async () => {
    const [sql, actions] = await Promise.all([
      readFile(MIGRATION, 'utf8'),
      readFile(DOCUMENT_ACTIONS, 'utf8'),
    ]);

    expect(actions).toContain('await enforceDocumentQuota(payload.organizationId);');
    expect(sql).toContain('create or replace function app_private.enforce_document_commercial_quota()');
    expect(sql).toContain('before insert on public.documents');
    expect(sql).toContain('pg_advisory_xact_lock(hashtext(new.organization_id::text))');
    expect(sql).toContain('from public.documents document');
    expect(sql).toContain('v_count >= v_limit');
    expect(sql).toContain("message = 'document_quota_exceeded'");
  });

  it('revalidates durable commercial authority inside the service-role write boundary', async () => {
    const sql = await readFile(MIGRATION, 'utf8');

    expect(sql).toContain('app_private.has_commercial_authority(new.organization_id)');
    expect(sql).toContain('app_private.resolve_commercial_plan(new.organization_id)');
    expect(sql).toContain("lower(coalesce(subscription.status, '')) = 'active'");
    expect(sql).toContain('event.livemode = true');
    expect(sql).toContain("event.status = 'processed'");
    expect(sql).toContain("event.type in ('customer.subscription.created', 'customer.subscription.updated')");
    expect(sql).not.toContain("when 'free' then 'starter'");
  });

  it('matches the canonical catalog document capacities', async () => {
    const [sql, catalog] = await Promise.all([
      readFile(MIGRATION, 'utf8'),
      readFile(CATALOG, 'utf8'),
    ]);

    expect(catalog).toContain('documents: 100, vendors: 0, risks: 0');
    expect(catalog).toContain('documents: 1000, vendors: 30, risks: 75');
    expect(catalog).toContain('documents: 10000, vendors: 150, risks: 300');
    expect(sql).toContain("when 'starter' then 100");
    expect(sql).toContain("when 'professional' then 1000");
    expect(sql).toContain("when 'business' then 10000");
    expect(sql).toContain("when 'enterprise' then null");
  });

  it('keeps quota helpers inaccessible to browser roles', async () => {
    const sql = await readFile(MIGRATION, 'utf8');

    expect(sql).toContain('revoke all on function app_private.resolve_commercial_plan(uuid) from public, anon, authenticated;');
    expect(sql).toContain('revoke all on function app_private.enforce_document_commercial_quota() from public, anon, authenticated;');
    expect(sql).toContain('grant execute on function app_private.resolve_commercial_plan(uuid) to service_role;');
    expect(sql).toContain('grant execute on function app_private.enforce_document_commercial_quota() to service_role;');
  });

  it('appends the quota invariant to the bounded governed forward package without enabling writes by config', async () => {
    const manifest = JSON.parse(await readFile(MANIFEST, 'utf8')) as {
      changeSet: string;
      migrations: Array<{ filename: string }>;
      truthBoundary: Record<string, boolean>;
    };

    expect(manifest.changeSet).toBe('2026-08-25-enterprise-data-plane-payment-first-trusted-access-document-quota-closure-v22');
    expect(manifest.migrations).toHaveLength(32);
    expect(manifest.migrations.at(-1)?.filename).toBe('20260825092500_atomic_document_commercial_quota.sql');
    expect(manifest.truthBoundary.productionWriteAuthorizedByConfig).toBe(false);
    expect(manifest.truthBoundary.migrationHistoryRepairAllowed).toBe(false);
    expect(manifest.truthBoundary.unrestrictedDbPushAllowed).toBe(false);
  });
});
