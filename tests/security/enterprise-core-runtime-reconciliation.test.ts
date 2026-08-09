import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260809135000_enterprise_core_runtime_schema_reconciliation.sql';
const migration = readFileSync(migrationPath, 'utf8');
const instrumentation = readFileSync('src/instrumentation.ts', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  engines?: { node?: string };
};
const nodeVersion = readFileSync('.node-version', 'utf8').trim();

describe('enterprise core production schema reconciliation', () => {
  it('restores the production objects consumed by current server code', () => {
    for (const token of [
      'create table if not exists public.intelligence_items',
      'create table if not exists public.intelligence_calendar_suggestions',
      'create table if not exists public.email_notification_events',
      'create table if not exists public.vendor_review_history',
      'create or replace function public.create_organization_with_owner_atomic',
      'add column if not exists next_review_at date',
      'add column if not exists review_version integer not null default 1',
    ]) {
      expect(migration).toContain(token);
    }
  });

  it('removes temporary validation policies and privileged helper residue fail-closed', () => {
    expect(migration).toContain("policyname like 'live_rls_%'");
    expect(migration).toContain("drop function if exists public.live_rls_validation_apply_backend_only(text)");
    expect(migration).toContain("drop function if exists public.live_rls_validation_apply_org_scoped(text)");
    expect(migration).toContain("drop function if exists public.live_rls_validation_has_column(text, text)");
    expect(migration).toContain("drop function if exists app_private.live_rls_validation_is_org_member(uuid)");
    expect(migration).toContain("raise exception 'Temporary live_rls validation policy remains after reconciliation'");
  });

  it('keeps billing, vendor and AI incident writes behind server boundaries', () => {
    expect(migration).toContain('drop policy if exists "Owners can manage subscriptions"');
    expect(migration).toContain('revoke insert, update, delete on table public.subscriptions from public, anon, authenticated');
    expect(migration).toContain('revoke insert, update, delete on table public.vendors from public, anon, authenticated');
    expect(migration).toContain('revoke insert, update, delete on table public.ai_incidents from public, anon, authenticated');
    expect(migration).toContain('rls_ai_incidents_insert_backend_only');
    expect(migration).toContain('rls_ai_incidents_update_backend_only');
    expect(migration).toContain('rls_ai_incidents_delete_backend_only');
    expect(migration).not.toContain('disable row level security');
    expect(migration).not.toContain('using (true)');
    expect(migration).not.toContain('with check (true)');
  });

  it('uses the private tenant helpers for canonical policies', () => {
    expect(migration).toContain('app_private.is_org_member(organization_id)');
    expect(migration).toContain("app_private.has_org_role(organization_id, array['owner','admin','editor','compliance_manager'])");
    expect(migration).toContain("('ai_systems', 'rls_ai_systems_select_member')");
    expect(migration).toContain("('notifications', 'rls_notifications_select_recipient')");
    expect(migration).toContain("('monitoring_preferences', 'rls_monitoring_preferences_update_self_or_admin')");
  });

  it('keeps the onboarding RPC service-role only', () => {
    expect(migration).toContain('security definer');
    expect(migration).toContain('set search_path = pg_catalog, public');
    expect(migration).toContain('from public, anon, authenticated');
    expect(migration).toContain('to service_role;');
  });

  it('is transactional and validates postconditions before commit', () => {
    expect(migration).toMatch(/\nbegin;\n/);
    expect(migration).toContain('do $enterprise_core_guard$');
    expect(migration).toContain("raise exception 'Required canonical RLS policy %.% is missing'");
    expect(migration.trimEnd()).toMatch(/commit;$/);
  });
});

describe('Sentry instrumentation hardening', () => {
  it('initializes Sentry from the active edge-safe src instrumentation entrypoint', () => {
    expect(instrumentation).toContain("import * as Sentry from '@sentry/nextjs'");
    expect(instrumentation).toContain('sendDefaultPii: false');
    expect(instrumentation).toContain('event.request = undefined');
    expect(instrumentation).toContain('event.user = undefined');
    expect(instrumentation).toContain('export const onRequestError = Sentry.captureRequestError');
    expect(instrumentation).not.toContain("import('./instrumentation-node')");
  });

  it('removes deprecated or runtime-ambiguous instrumentation entrypoints', () => {
    expect(existsSync('instrumentation.ts')).toBe(false);
    expect(existsSync('sentry.server.config.ts')).toBe(false);
    expect(existsSync('sentry.edge.config.ts')).toBe(false);
    expect(existsSync('src/instrumentation-node.ts')).toBe(false);
  });
});

describe('Node runtime consistency', () => {
  it('pins Node 22 in the package engine and local runtime marker', () => {
    expect(packageJson.engines?.node).toBe('>=22 <23');
    expect(nodeVersion).toBe('22');
  });
});
