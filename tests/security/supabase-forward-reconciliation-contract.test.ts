import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = JSON.parse(readFileSync('config/supabase-forward-reconciliation.json', 'utf8')) as {
  migrations: Array<{ filename: string }>;
  truthBoundary: Record<string, boolean>;
};
const rehearsal = readFileSync('.github/workflows/supabase-forward-reconciliation-rehearsal.yml', 'utf8');
const dryRun = readFileSync('.github/workflows/supabase-forward-reconciliation-dry-run.yml', 'utf8');
const liveRlsWorkflow = readFileSync('.github/workflows/supabase-live-rls-validation.yml', 'utf8');
const postconditions = readFileSync('scripts/supabase/verify-forward-reconciliation-postconditions.sql', 'utf8');
const integrationsRuntime = readFileSync('scripts/security/validate-enterprise-integrations-runtime.sql', 'utf8');
const billingRuntime = readFileSync('scripts/security/validate-enterprise-billing-runtime.sql', 'utf8');
const liveRlsInventoryRepair = readFileSync(
  'supabase/migrations/20260822123606_v19_reconcile_live_rls_validation_inventory_privileges.sql',
  'utf8',
);
const gapTaskRolloutGuard = readFileSync(
  'supabase/migrations/20260822123620_v19_guard_compliance_task_browser_mutations.sql',
  'utf8',
);
const gapTaskWriteHardening = readFileSync(
  'supabase/migrations/20260822123624_v19_harden_gap_personal_task_write_boundary.sql',
  'utf8',
);
const historicalCore = readFileSync(
  'supabase/migrations/20260809135000_enterprise_core_runtime_schema_reconciliation.sql',
  'utf8',
);
const historicalVendorIntegrity = readFileSync(
  'supabase/migrations/20260720044500_vendor_governance_integrity.sql',
  'utf8',
);
const forwardCore = readFileSync(
  'supabase/migrations/20260822123604_v19_reconcile_enterprise_core_active_runtime.sql',
  'utf8',
);
const forwardInvitationSeatAuthority = readFileSync(
  'supabase/migrations/20260822123610_v19_reconcile_enterprise_invitation_seat_authority.sql',
  'utf8',
);
const forwardInvitationActorHardening = readFileSync(
  'supabase/migrations/20260822123612_v19_harden_enterprise_invitation_actor_boundary.sql',
  'utf8',
);
const onboardingStatePreservation = readFileSync(
  'supabase/migrations/20260822123614_v19_preserve_completed_onboarding_state.sql',
  'utf8',
);
const forwardOnboarding = readFileSync(
  'supabase/migrations/20260822123616_v19_reconcile_active_onboarding_runtime.sql',
  'utf8',
);
const hardenedOnboarding = readFileSync(
  'supabase/migrations/20260822123618_v19_harden_active_onboarding_enterprise_boundaries.sql',
  'utf8',
);
const commercialQuotaMutation = readFileSync(
  'supabase/migrations/20260822120617_atomic_vendor_risk_quota_mutations.sql',
  'utf8',
);
const commercialQuotaReconciliation = readFileSync(
  'supabase/reconciliation/20260822120617_atomic_vendor_risk_quota_mutations.sql',
  'utf8',
);

const selected = config.migrations.map((migration) => migration.filename);

describe('bounded Supabase forward reconciliation contract', () => {
  it('selects exactly the thirty-one CLI-issued V21 forward reconciliation identities in version order', () => {
    expect(selected).toEqual([
      '20260822123538_v19_optimize_organization_add_ons_rls_initplan.sql',
      '20260822123540_v19_reconcile_step_up_challenges_runtime.sql',
      '20260822123542_v19_reconcile_subscription_schema_defaults.sql',
      '20260822123544_v19_reconcile_controlled_document_storage.sql',
      '20260822123546_v19_force_tasks_rls.sql',
      '20260822123548_v19_reconcile_enterprise_break_glass_governance.sql',
      '20260822123550_v19_reconcile_enterprise_licensing_control_plane.sql',
      '20260822123552_v19_reconcile_enterprise_integrations_scim.sql',
      '20260822123554_v19_harden_scim_identity_connection_delete_boundary.sql',
      '20260822123556_v19_bridge_enterprise_contract_mode_compatibility.sql',
      '20260822123558_v19_reconcile_enterprise_billing_lifecycle.sql',
      '20260822123600_v19_finalize_enterprise_contract_mode_compatibility.sql',
      '20260822123602_v19_reconcile_enterprise_contract_control_rpcs.sql',
      '20260822123604_v19_reconcile_enterprise_core_active_runtime.sql',
      '20260822123606_v19_reconcile_live_rls_validation_inventory_privileges.sql',
      '20260822123608_v19_reconcile_new_organization_compatibility_envelope.sql',
      '20260822123610_v19_reconcile_enterprise_invitation_seat_authority.sql',
      '20260822123612_v19_harden_enterprise_invitation_actor_boundary.sql',
      '20260822123614_v19_preserve_completed_onboarding_state.sql',
      '20260822123616_v19_reconcile_active_onboarding_runtime.sql',
      '20260822123618_v19_harden_active_onboarding_enterprise_boundaries.sql',
      '20260822123620_v19_guard_compliance_task_browser_mutations.sql',
      '20260822123622_v19_reconcile_gap_remediation_persistence.sql',
      '20260822123624_v19_harden_gap_personal_task_write_boundary.sql',
      '20260822123626_v19_reconcile_enterprise_evidence_vault.sql',
      '20260823123000_payment_first_commercial_data_plane.sql',
      '20260823131500_payment_first_gap_analysis_and_storage.sql',
      '20260824185900_prepare_enterprise_trusted_access_legacy_compatibility.sql',
      '20260824190000_reconcile_enterprise_trusted_access_runtime.sql',
      '20260824190100_finalize_enterprise_trusted_access_operation_contract.sql',
      '20260824190200_harden_enterprise_trusted_access_runtime_contract.sql',
    ]);
    for (const historical of [
      '20260730204500_repair_live_rls_validation_inventory.sql',
      '20260809135000_enterprise_core_runtime_schema_reconciliation.sql',
      '20260802153000_reconcile_onboarding_runtime_schema.sql',
      '20260716183000_atomic_onboarding_activation.sql',
      '20260721193000_enterprise_tenant_licensing_core.sql',
      '20260721195000_transactional_enterprise_invitations.sql',
      '20260721200500_invitation_lock_order_hardening.sql',
      '20260822120617_atomic_vendor_risk_quota_mutations.sql',
    ]) {
      expect(selected).not.toContain(historical);
    }
    for (const filename of selected) {
      expect(existsSync(`supabase/migrations/${filename}`)).toBe(true);
      expect(Number(filename.slice(0, 14))).toBeGreaterThan(20260822120617);
    }
    expect(config.truthBoundary).toMatchObject({
      automaticClassification: false,
      productionWriteAuthorizedByConfig: false,
      migrationHistoryRepairAllowed: false,
      unrestrictedDbPushAllowed: false,
      onlyListedForwardMigrationsMayBeRehearsedOrRequested: true,
    });
  });

  it('does not replay the already-present commercial identity and preserves its fail-closed source contract', () => {
    expect(selected).not.toContain('20260822120617_atomic_vendor_risk_quota_mutations.sql');
    const evidenceVaultIndex = selected.indexOf('20260822123626_v19_reconcile_enterprise_evidence_vault.sql');
    const paymentFirstIndex = selected.indexOf('20260823123000_payment_first_commercial_data_plane.sql');
    const paymentFirstStorageIndex = selected.indexOf('20260823131500_payment_first_gap_analysis_and_storage.sql');
    expect(evidenceVaultIndex).toBeGreaterThanOrEqual(0);
    expect(paymentFirstIndex).toBeGreaterThan(evidenceVaultIndex);
    expect(paymentFirstStorageIndex).toBeGreaterThan(paymentFirstIndex);
    expect(commercialQuotaMutation.trimStart()).toMatch(/^begin;/i);
    expect(commercialQuotaMutation).toContain('create or replace function public.mutate_commercial_resource_with_audit_atomic');
    expect(commercialQuotaMutation).toContain('security definer');
    expect(commercialQuotaMutation).toContain('set search_path = pg_catalog, public');
    expect(commercialQuotaMutation).toContain('pg_advisory_xact_lock(hashtext(p_organization_id::text))');
    expect(commercialQuotaMutation).toContain('revoke all on function public.mutate_commercial_resource_with_audit_atomic');
    expect(commercialQuotaMutation).toContain('from public, anon, authenticated');
    expect(commercialQuotaMutation).toContain('grant execute on function public.mutate_commercial_resource_with_audit_atomic');
    expect(commercialQuotaMutation).toContain('to service_role');
    expect(commercialQuotaMutation.trimEnd()).toMatch(/commit;$/i);
    expect(commercialQuotaReconciliation).toContain('RECONCILIATION RECORD ONLY');
    expect(commercialQuotaReconciliation).toContain('not asserted byte-identical');
    expect(commercialQuotaReconciliation).toContain('No DDL. No migration-history mutation. No production-write authorization.');
  });

  it('reconciles the live RLS inventory helper to a service-role-only boundary', () => {
    expect(liveRlsInventoryRepair).toContain('Forward-only reconciliation for the live RLS inventory helper');
    expect(liveRlsInventoryRepair).toContain('security invoker');
    expect(liveRlsInventoryRepair).toContain('set search_path = public, pg_catalog');
    expect(liveRlsInventoryRepair).toContain('revoke all on function public.eurocomply_live_rls_inventory(text[]) from public');
    expect(liveRlsInventoryRepair).toContain('revoke execute on function public.eurocomply_live_rls_inventory(text[]) from anon');
    expect(liveRlsInventoryRepair).toContain('revoke execute on function public.eurocomply_live_rls_inventory(text[]) from authenticated');
    expect(liveRlsInventoryRepair).toContain('grant execute on function public.eurocomply_live_rls_inventory(text[]) to service_role');
    expect(liveRlsWorkflow).toContain('Verify live inventory helper privilege boundary');
    expect(liveRlsWorkflow).toContain("setting = 'search_path=public, pg_catalog'");
  });

  it('guards every authenticated task mutation before compatibility reconciliation', () => {
    expect(gapTaskRolloutGuard.trimStart()).toMatch(/^begin;/i);
    for (const policy of [
      'restrict_authenticated_compliance_task_insert_during_reconciliation',
      'restrict_authenticated_compliance_task_update_during_reconciliation',
      'restrict_authenticated_compliance_task_delete_during_reconciliation',
    ]) {
      expect(gapTaskRolloutGuard).toContain(policy);
    }
    expect(gapTaskRolloutGuard).toContain('as restrictive');
    expect(gapTaskRolloutGuard).toContain('with check (false)');
    expect(gapTaskRolloutGuard).toContain('using (false)');
    expect(gapTaskRolloutGuard).toContain("raise exception 'authenticated compliance_tasks reconciliation guard is incomplete'");
  });

  it('keeps organization task mutations backend-only while allowing only personal browser inserts', () => {
    expect(gapTaskWriteHardening).toContain('revoke insert, update, delete on table public.compliance_tasks from authenticated');
    expect(gapTaskWriteHardening).toContain('grant select, insert on table public.compliance_tasks to authenticated');
    expect(gapTaskWriteHardening).toContain('drop policy if exists "rls_compliance_tasks_insert_writer"');
    expect(gapTaskWriteHardening).toContain('drop policy if exists "rls_compliance_tasks_update_writer"');
    expect(gapTaskWriteHardening).toContain('drop policy if exists "rls_compliance_tasks_delete_admin"');
    expect(gapTaskWriteHardening).toContain('drop policy if exists "restrict_authenticated_compliance_task_insert_during_reconciliation"');
    expect(gapTaskWriteHardening).toContain('restrict_authenticated_compliance_task_update_during_reconciliation');
    expect(gapTaskWriteHardening).toContain('restrict_authenticated_compliance_task_delete_during_reconciliation');
    expect(gapTaskWriteHardening).toContain('as restrictive');
    expect(gapTaskWriteHardening).toContain('restrict_authenticated_compliance_task_insert_to_personal');
    expect(gapTaskWriteHardening).toContain('workspace_id is null');
    expect(gapTaskWriteHardening).toContain('user_id = auth.uid()');
    expect(gapTaskWriteHardening).toContain('cf.user_id = auth.uid()');
    expect(gapTaskWriteHardening).toContain('authenticated compliance_tasks UPDATE/DELETE must remain backend-only');
    expect(gapTaskWriteHardening).toContain('authenticated compliance_tasks permanent update/delete guard is incomplete');
  });

  it('does not carry historical human approval into the newer active-core execution identity', () => {
    expect(historicalCore).toContain('enterprise-migration-review: approved');
    expect(forwardCore).not.toContain('enterprise-migration-review: approved');
    expect(forwardCore).toContain('The historical migration remains byte-for-byte');
    expect(forwardCore).toContain('contains no destructive data rewrite');
  });

  it('preserves active-core objects while retaining later vendor tenant-integrity hardening', () => {
    for (const invariant of [
      'create table if not exists public.intelligence_items',
      'create table if not exists public.email_notification_events',
      'create table if not exists public.vendor_review_history',
      'public.create_organization_with_owner_atomic',
      "policyname like 'live_rls_%'",
    ]) {
      expect(historicalCore).toContain(invariant);
      expect(forwardCore).toContain(invariant);
    }
    for (const invariant of [
      'vendor creator must belong to organization',
      'vendor approver must be an authorized organization member',
      "om.user_id = new.created_by",
      "om.user_id = new.approved_by",
      "om.role in ('owner', 'admin', 'compliance_manager')",
    ]) {
      expect(historicalVendorIntegrity).toContain(invariant);
      expect(forwardCore).toContain(invariant);
    }
  });

  it('preserves completed onboarding evidence before the active RPC reconciliation can commit', () => {
    expect(onboardingStatePreservation).toContain('Forward-only rollout guard for production onboarding state');
    expect(onboardingStatePreservation).toContain('with latest_completed as');
    expect(onboardingStatePreservation).toContain("where lower(coalesce(status, '')) = 'completed'");
    expect(onboardingStatePreservation).toContain("onboarding_status = 'completed'");
    expect(onboardingStatePreservation).toContain('onboarding_completed_at = coalesce');
    expect(onboardingStatePreservation).toContain('latest_completed.created_at');
    expect(onboardingStatePreservation).toContain('latest_completed.selected_plan');
    expect(onboardingStatePreservation).toContain("raise exception 'completed onboarding evidence was not preserved'");
  });

  it('reconciles the active onboarding runtime under a new production-forward identity', () => {
    for (const column of [
      'country',
      'company_type',
      'sector',
      'ai_usage_summary',
      'onboarding_status',
      'onboarding_step',
      'selected_plan',
      'metadata',
      'readiness_score',
      'trial_started_at',
      'onboarding_completed_at',
    ]) {
      expect(forwardOnboarding).toContain(column);
    }
    expect(forwardOnboarding).toContain('create or replace function public.complete_onboarding_activation_atomic');
    expect(forwardOnboarding).toContain('security definer');
    expect(forwardOnboarding).toContain('set search_path = pg_catalog, public');
    expect(forwardOnboarding).toContain('systems.organization_id = p_organization_id');
    expect(forwardOnboarding).toContain('assigned_to');
    expect(forwardOnboarding).toContain("v_invite_email_array text[] := '{}'::text[]");
    expect(forwardOnboarding).toContain('onboarding_activation_runs_org_idempotency_key_idx');
    expect(forwardOnboarding).not.toContain('migration repair');
    expect(forwardOnboarding).not.toContain('--include-all');
  });

  it('reconciles seat-aware invitation quotas and then hides the implementation behind an active-actor wrapper', () => {
    expect(forwardInvitationSeatAuthority).toContain('create or replace function public.create_organization_invitation_with_seat_atomic');
    expect(forwardInvitationSeatAuthority).toContain('create or replace function public.accept_organization_invitation_atomic');
    expect(forwardInvitationSeatAuthority).toContain('create or replace function public.sync_organization_pending_invitation_usage');
    expect(forwardInvitationSeatAuthority).toContain('invitations_sync_pending_usage');
    expect(forwardInvitationSeatAuthority).toContain('invitation.seat_type = v_seat_type');
    expect(forwardInvitationSeatAuthority).toContain('v_active_members + v_pending_members >= v_member_limit');
    expect(forwardInvitationSeatAuthority).toContain('v_active_seats + v_pending_seats >= v_seat_limit');
    expect(forwardInvitationSeatAuthority).toContain('v_active_admins + v_pending_admins >= v_admin_limit');
    expect(forwardInvitationActorHardening).toContain('rename to create_organization_invitation_with_seat_atomic_reconciled');
    expect(forwardInvitationActorHardening).toContain("v_actor_status is distinct from 'active'");
    expect(forwardInvitationActorHardening).toContain("coalesce(v_actor_role, '') not in ('owner', 'admin')");
    expect(forwardInvitationActorHardening).toContain('revoke all on function public.create_organization_invitation_with_seat_atomic_reconciled');
    expect(forwardInvitationActorHardening).toContain('from public, anon, authenticated, service_role');
    expect(forwardInvitationActorHardening).toContain('grant execute on function public.create_organization_invitation_with_seat_atomic');
  });

  it('hardens the final onboarding authority and routes invitations through canonical seat enforcement', () => {
    expect(hardenedOnboarding).toContain('with latest_completed as');
    expect(hardenedOnboarding).toContain("onboarding_status = 'completed'");
    expect(hardenedOnboarding).toContain('rename to complete_onboarding_activation_atomic_reconciled');
    expect(hardenedOnboarding).toContain("v_actor_status is distinct from 'active'");
    expect(hardenedOnboarding).toContain("coalesce(v_actor_role, '') not in ('owner', 'admin')");
    expect(hardenedOnboarding).toContain("jsonb_set(p_activation, '{inviteEmails}', '[]'::jsonb, true)");
    expect(hardenedOnboarding).toContain('public.create_organization_invitation_with_seat_atomic');
    expect(hardenedOnboarding).toContain("'viewer',\n      'viewer'");
    expect(hardenedOnboarding).toContain("v_invitation.outcome <> 'created'");
    expect(hardenedOnboarding).toContain("raise exception 'onboarding_invitation_seat_authority_denied:%'");
    expect(hardenedOnboarding).toContain('invitation.revoked_at is null');
    expect(hardenedOnboarding).toContain('revoke all on function public.complete_onboarding_activation_atomic_reconciled');
    expect(hardenedOnboarding).toContain('grant execute on function public.complete_onboarding_activation_atomic');
    expect(hardenedOnboarding).not.toContain('insert into public.invitations');
  });

  it('triggers both bounded workflows for any migration byte change without widening the selected set', () => {
    for (const workflow of [rehearsal, dryRun]) expect(workflow).toContain("- 'supabase/migrations/**'");
    expect(config.truthBoundary.onlyListedForwardMigrationsMayBeRehearsedOrRequested).toBe(true);
  });

  it('runs existing read-only Enterprise integration and billing validators after isolated rehearsal', () => {
    for (const validator of [
      'scripts/supabase/verify-forward-reconciliation-postconditions.sql',
      'scripts/security/validate-enterprise-integrations-runtime.sql',
      'scripts/security/validate-enterprise-billing-runtime.sql',
    ]) expect(rehearsal).toContain(validator);
    expect(integrationsRuntime).toContain('This proof is read-only');
    expect(integrationsRuntime).toContain("select 'enterprise_integrations_runtime_validation_passed' as status");
    expect(billingRuntime).toContain("select 'enterprise_billing_runtime_validation_passed' as status");
  });

  it('uses one pinned Supabase CLI baseline across rehearsal and filtered dry-run', () => {
    for (const workflow of [rehearsal, dryRun]) {
      expect(workflow).toContain('supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520');
      expect(workflow).toContain('version: 2.114.0');
      expect(workflow).not.toContain('version: latest');
    }
  });

  it('keeps the bounded workflows fail-closed for production writes', () => {
    expect(dryRun).toContain('db push --dry-run --db-url "$SUPABASE_DB_POOLER_URL"');
    expect(dryRun).not.toContain('db push --db-url "$SUPABASE_DB_POOLER_URL"');
    expect(rehearsal).not.toContain('db push');
    expect(config.truthBoundary.productionWriteAuthorizedByConfig).toBe(false);
    expect(config.truthBoundary.migrationHistoryRepairAllowed).toBe(false);
    expect(config.truthBoundary.unrestrictedDbPushAllowed).toBe(false);
  });

  it('proves active core runtime contracts that production jobs already require', () => {
    for (const table of ['intelligence_items', 'intelligence_calendar_suggestions', 'email_notification_events', 'vendor_review_history']) {
      expect(postconditions).toContain(table);
    }
    expect(postconditions).toContain('public.create_organization_with_owner_atomic(text,text,uuid)');
    expect(postconditions).toContain("policyname like 'live_rls_%'");
    expect(postconditions).toContain('temporary live RLS validation helper remains after core reconciliation');
  });

  it('proves Enterprise licensing, SCIM and integration runtime boundaries', () => {
    for (const table of ['platform_admin_users', 'enterprise_contracts', 'organization_entitlements', 'organization_usage', 'enterprise_seat_operations', 'enterprise_identity_connections', 'enterprise_scim_tokens', 'enterprise_scim_identities']) {
      expect(integrationsRuntime).toContain(table);
    }
    expect(integrationsRuntime).toContain('Enterprise control-plane RLS/FORCE RLS incomplete');
    expect(integrationsRuntime).toContain('Enterprise licensing/SCIM RPC set incomplete');
    expect(integrationsRuntime).toContain('Enterprise licensing/SCIM RPC grants are not service-role-only');
  });

  it('proves Enterprise billing lifecycle and contract-control runtime boundaries', () => {
    expect(billingRuntime).toContain('enterprise_contract_billing_events');
    expect(billingRuntime).toContain('Enterprise contract billing columns incomplete');
    expect(billingRuntime).toContain('Enterprise contract control/billing RPC set incomplete');
    expect(billingRuntime).toContain('Enterprise contract control/billing RPC privileges are not service-role-only');
    expect(billingRuntime).toContain("contract.contract_mode not in ('compatibility','negotiated')");
  });

  it('proves the Break-Glass tenant and backend-only postconditions', () => {
    for (const table of ['enterprise_break_glass_requests', 'enterprise_break_glass_approvals', 'enterprise_break_glass_events', 'enterprise_break_glass_reviews']) {
      expect(postconditions).toContain(table);
    }
    expect(postconditions).toContain('organization_members_organization_id_id_key');
    expect(postconditions).toContain('enterprise_break_glass_requests_organization_id_id_key');
    expect(postconditions).toContain('break-glass RLS/FORCE RLS boundary is incomplete');
    expect(postconditions).toContain("grantee in ('anon','authenticated')");
    expect(postconditions).toContain('public.expire_enterprise_break_glass_requests(integer)');
  });
});