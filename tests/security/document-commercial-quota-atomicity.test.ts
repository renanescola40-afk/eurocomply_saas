import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const MIGRATION = new URL('../../supabase/migrations/20260825092500_atomic_document_commercial_quota.sql', import.meta.url);
const MANIFEST = new URL('../../config/supabase-forward-reconciliation-v23.json', import.meta.url);
const CATALOG = new URL('../../src/lib/billing/plans.ts', import.meta.url);
const DOCUMENT_ACTIONS = new URL('../../src/server/actions/documents.ts', import.meta.url);
const SUBSCRIPTION_AUTHORITY = new URL('../../src/server/billing/subscription-authority.ts', import.meta.url);
const SUBSCRIPTION_QUERY = new URL('../../src/server/queries/subscription.ts', import.meta.url);
const DETERMINISTIC_PRECEDENCE = new URL(
  '../../supabase/migrations/20260831100000_deterministic_commercial_contract_source_precedence.sql',
  import.meta.url,
);

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

  it('makes database commercial precedence exactly match the canonical server resolver', async () => {
    const [sql, authority, subscription, deterministicPrecedence] = await Promise.all([
      readFile(MIGRATION, 'utf8'),
      readFile(SUBSCRIPTION_AUTHORITY, 'utf8'),
      readFile(SUBSCRIPTION_QUERY, 'utf8'),
      readFile(DETERMINISTIC_PRECEDENCE, 'utf8'),
    ]);

    expect(authority).toContain(".eq('source_kind', 'signed_contract')");
    expect(authority).toContain(".order('priority', { ascending: false })");
    expect(authority).toContain(".order('id', { ascending: true })");
    expect(authority).toContain('return planCode || null;');
    expect(subscription).toContain('const signedContractPlan = await getAuthoritativeSignedContractPlan(organizationId);');
    expect(subscription).toContain('if (signedContractPlan) {');
    expect(subscription).toContain('hasProcessedLiveStripeSubscriptionAuthority');

    expect(sql).toContain('selected_contract_source as (');
    expect(sql).toContain('order by source.priority desc');
    expect(sql).toContain('when exists (select 1 from contract_candidate) then');
    expect(sql).not.toContain('when exists (select 1 from selected_contract_source) then');
    expect(sql).toContain('(select plan_code from contract_candidate limit 1)');
    expect(sql).toContain('create or replace function app_private.has_commercial_authority');
    expect(sql).toContain('select app_private.resolve_commercial_plan(target_organization_id) is not null;');
    expect(sql).toContain('v_plan := app_private.resolve_commercial_plan(new.organization_id);');
    expect(sql).toContain("lower(coalesce(subscription.status, '')) = 'active'");
    expect(sql).toContain('event.livemode = true');
    expect(sql).toContain("event.status = 'processed'");
    expect(sql).toContain("event.type in ('customer.subscription.created', 'customer.subscription.updated')");
    expect(sql).not.toContain("when 'free' then 'starter'");
    expect(deterministicPrecedence).toContain('order by source.priority desc, source.id asc');
    expect(deterministicPrecedence).toContain('commercial authority ordering is not deterministic');
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

  it('keeps private resolver/quota helpers inaccessible while preserving authenticated RLS authority execution', async () => {
    const sql = await readFile(MIGRATION, 'utf8');

    expect(sql).toContain('revoke all on function app_private.resolve_commercial_plan(uuid) from public, anon, authenticated;');
    expect(sql).toContain('revoke all on function app_private.enforce_document_commercial_quota() from public, anon, authenticated;');
    expect(sql).toContain('grant execute on function app_private.resolve_commercial_plan(uuid) to service_role;');
    expect(sql).toContain('grant execute on function app_private.enforce_document_commercial_quota() to service_role;');
    expect(sql).toContain('revoke all on function app_private.has_commercial_authority(uuid) from public, anon;');
    expect(sql).toContain('grant execute on function app_private.has_commercial_authority(uuid) to authenticated, service_role;');
  });

  it('preserves the quota invariant as identity 32 and appends active-membership RLS closure as identity 33', async () => {
    const manifest = JSON.parse(await readFile(MANIFEST, 'utf8')) as {
      changeSet: string;
      migrations: Array<{ filename: string }>;
      truthBoundary: Record<string, boolean>;
    };

    expect(manifest.changeSet).toBe('2026-08-25-enterprise-data-plane-active-membership-rls-closure-v23');
    expect(manifest.migrations).toHaveLength(33);
    expect(manifest.migrations.at(-2)?.filename).toBe('20260825092500_atomic_document_commercial_quota.sql');
    expect(manifest.migrations.at(-1)?.filename).toBe('20260825171500_harden_active_membership_rls_authority.sql');
    expect(manifest.truthBoundary.productionWriteAuthorizedByConfig).toBe(false);
    expect(manifest.truthBoundary.migrationHistoryRepairAllowed).toBe(false);
    expect(manifest.truthBoundary.unrestrictedDbPushAllowed).toBe(false);
  });
});
