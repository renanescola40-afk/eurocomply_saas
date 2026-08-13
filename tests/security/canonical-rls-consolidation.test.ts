import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migrationPath = 'supabase/migrations/20260812225906_consolidate_canonical_rls_and_client_grants.sql';
const sql = fs.readFileSync(path.join(root, migrationPath), 'utf8');

describe('canonical production RLS consolidation', () => {
  it('removes legacy permissive policies that overlap or broaden authorization', () => {
    for (const policy of [
      'Owners can manage subscriptions',
      'Members can view subscriptions',
      'live_rls_monitoring_preferences_delete_member',
      'live_rls_monitoring_preferences_insert_member',
      'live_rls_monitoring_preferences_select_member',
      'live_rls_monitoring_preferences_update_member',
      'live_rls_notifications_delete_member',
      'live_rls_notifications_insert_member',
      'live_rls_notifications_select_member',
      'live_rls_notifications_update_member',
      'live_rls_onboarding_activation_runs_delete_member',
      'live_rls_onboarding_activation_runs_insert_member',
      'live_rls_onboarding_activation_runs_select_member',
      'live_rls_onboarding_activation_runs_update_member',
      'Owners and admins can delete AI systems',
      'Editors can insert AI systems',
      'Members can read AI systems',
      'Editors can update AI systems',
      'live_rls_audit_events_select_member',
      'Members can view audit logs',
      'live_rls_invitations_select_member',
      'live_rls_regulatory_updates_select_authenticated',
      'Users can view their memberships',
      'Users can view their organizations',
    ]) {
      expect(sql).toContain(`drop policy if exists ${policy.startsWith('live_') ? policy : `"${policy}"`}`);
    }
  });

  it('keeps billing and backend-owned ledgers read-only to authenticated clients', () => {
    expect(sql).toContain('revoke all on table public.subscriptions from PUBLIC, anon, authenticated');
    expect(sql).toContain('grant select on table public.subscriptions to authenticated');
    expect(sql).toContain('revoke all on table public.audit_events from PUBLIC, anon, authenticated');
    expect(sql).toContain('grant select on table public.audit_events to authenticated');
    expect(sql).toContain('revoke all on table public.audit_logs from PUBLIC, anon, authenticated');
    expect(sql).toContain('grant select on table public.audit_logs to authenticated');
    expect(sql).toContain('revoke all on table public.invitations from PUBLIC, anon, authenticated');
    expect(sql).toContain('grant select on table public.invitations to authenticated');
  });

  it('preserves only the client DML needed by canonical row-level policies', () => {
    expect(sql).toContain('grant select, insert, update, delete on table public.monitoring_preferences to authenticated');
    expect(sql).toContain('grant select, update, delete on table public.notifications to authenticated');
    expect(sql).toContain('grant select, insert, update, delete on table public.onboarding_activation_runs to authenticated');
    expect(sql).toContain('grant select, insert, update, delete on table public.ai_systems to authenticated');
    expect(sql).toContain('grant select, update on table public.organizations to authenticated');
    expect(sql).not.toContain('grant insert on table public.subscriptions to authenticated');
    expect(sql).not.toContain('grant insert on table public.notifications to authenticated');
  });

  it('requires the canonical policy catalog to exist after cleanup', () => {
    for (const policy of [
      'rls_subscriptions_select_member',
      'rls_subscriptions_insert_backend_only',
      'rls_subscriptions_update_backend_only',
      'rls_subscriptions_delete_backend_only',
      'rls_monitoring_preferences_insert_self_or_admin',
      'rls_monitoring_preferences_update_self_or_admin',
      'rls_notifications_select_recipient',
      'rls_notifications_insert_backend_only',
      'rls_onboarding_activation_runs_insert_writer',
      'rls_onboarding_activation_runs_delete_admin',
      'rls_ai_systems_insert_writer',
      'rls_ai_systems_delete_admin',
      'rls_audit_events_insert_backend_only',
      'rls_audit_logs_insert_backend_only',
      'rls_invitations_insert_backend_only',
      'rls_regulatory_updates_insert_backend_only',
      'rls_organization_members_insert_backend_only',
      'Members can view organizations',
      'Owners can update organizations',
    ]) {
      expect(sql).toContain(`'${policy}'`);
    }
  });

  it('fails closed if legacy policies or excess grants survive', () => {
    expect(sql).toContain("raise exception 'legacy permissive policies survived canonical RLS consolidation: %'");
    expect(sql).toContain("raise exception 'canonical RLS policy missing after consolidation: %'");
    expect(sql).toContain("raise exception 'unexpected client table privileges survived canonical RLS consolidation: %'");
    expect(sql).toContain("p.grantee in ('PUBLIC','anon','authenticated')");
    expect(sql).toContain("p.privilege_type in ('SELECT','UPDATE','DELETE')");
  });
});
