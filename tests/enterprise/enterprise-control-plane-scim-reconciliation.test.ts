import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const licensing = readFileSync(
  'supabase/migrations/20260822123550_v19_reconcile_enterprise_licensing_control_plane.sql',
  'utf8',
);
const integrations = readFileSync(
  'supabase/migrations/20260822123552_v19_reconcile_enterprise_integrations_scim.sql',
  'utf8',
);
const scimDeleteBoundary = readFileSync(
  'supabase/migrations/20260822123554_v19_harden_scim_identity_connection_delete_boundary.sql',
  'utf8',
);
const contractModeBridge = readFileSync(
  'supabase/migrations/20260822123556_v19_bridge_enterprise_contract_mode_compatibility.sql',
  'utf8',
);
const billing = readFileSync(
  'supabase/migrations/20260822123558_v19_reconcile_enterprise_billing_lifecycle.sql',
  'utf8',
);
const contractModeFinal = readFileSync(
  'supabase/migrations/20260822123600_v19_finalize_enterprise_contract_mode_compatibility.sql',
  'utf8',
);
const contractControl = readFileSync(
  'supabase/migrations/20260822123602_v19_reconcile_enterprise_contract_control_rpcs.sql',
  'utf8',
);
const licensingRuntime = readFileSync('src/server/enterprise/licensing.ts', 'utf8');
const provisioningRuntime = readFileSync('src/server/enterprise/provisioning.ts', 'utf8');
const scimRuntime = readFileSync('src/server/enterprise/scim.ts', 'utf8');
const billingRuntime = readFileSync('src/server/enterprise/billing.ts', 'utf8');
const lifecycleRuntime = readFileSync('src/server/enterprise/contract-lifecycle.ts', 'utf8');
const contractsRuntime = readFileSync('src/server/enterprise/contracts.ts', 'utf8');

const integrationTables = [
  'enterprise_service_accounts',
  'enterprise_api_keys',
  'enterprise_webhook_subscriptions',
  'enterprise_webhook_deliveries',
  'enterprise_identity_connections',
  'enterprise_scim_tokens',
  'enterprise_integration_audit_events',
  'enterprise_scim_identities',
];

const scimRpcs = [
  'create_enterprise_scim_token_atomic',
  'authenticate_enterprise_scim_token',
  'upsert_enterprise_scim_identity_atomic',
  'get_enterprise_scim_identity',
  'find_enterprise_scim_identity',
  'deactivate_enterprise_scim_identity_atomic',
];

const contractControlRpcs = [
  'provision_enterprise_contract_atomic',
  'update_enterprise_contract_entitlements_atomic',
  'transition_enterprise_contract_status_atomic',
];

describe('Enterprise Control Plane + SCIM forward reconciliation', () => {
  it('materializes the exact licensing RPC names consumed by the application', () => {
    for (const rpc of [
      'resolve_organization_entitlements_v2',
      'reserve_organization_seat_idempotent_atomic',
    ]) {
      expect(licensingRuntime).toContain(rpc);
      expect(licensing).toContain(`public.${rpc}`);
    }
    expect(provisioningRuntime).toContain('release_organization_seat_atomic');
    expect(licensing).toContain('public.release_organization_seat_atomic');
  });

  it('keeps compatibility contracts fail-closed for Enterprise feature flags', () => {
    expect(licensing).toContain("jsonb_build_object('legacy_compatibility', true)");
    expect(licensing).toContain('Enterprise SSO/SCIM/API/webhooks remain disabled until explicitly contracted.');
    expect(licensing).toContain('sso_enabled boolean not null default false');
    expect(licensing).toContain('scim_enabled boolean not null default false');
    expect(licensing).toContain('api_enabled boolean not null default false');
    expect(licensing).toContain('webhooks_enabled boolean not null default false');
  });

  it('hardens licensing persistence and RPCs as backend-only', () => {
    for (const table of [
      'platform_admin_users',
      'enterprise_contracts',
      'organization_entitlements',
      'organization_usage',
      'enterprise_seat_operations',
    ]) {
      expect(licensing).toContain(`alter table public.${table} force row level security`);
      expect(licensing).toContain(`revoke all on table public.${table} from public, anon, authenticated`);
    }
    expect(licensing).toContain('set search_path = pg_catalog');
    expect(licensing).toContain('audit_logs (organization_id,actor_id,action,entity_type,entity_id,metadata)');
    expect(licensing).not.toContain('audit_logs (organization_id,actor_user_id');
  });

  it('materializes every integration/SCIM table with forced RLS and no browser table grants', () => {
    for (const table of integrationTables) {
      expect(integrations).toContain(`create table if not exists public.${table}`);
      expect(integrations).toContain(`alter table public.${table} force row level security`);
      expect(integrations).toContain(`revoke all on table public.${table} from public,anon,authenticated`);
      expect(integrations).toContain(`grant all on table public.${table} to service_role`);
    }
  });

  it('materializes the exact SCIM RPC names consumed by the application as service-role-only', () => {
    for (const rpc of scimRpcs) {
      expect(scimRuntime).toContain(rpc);
      expect(integrations).toContain(`public.${rpc}`);
    }
    expect(integrations.match(/security definer set search_path=pg_catalog/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(integrations).toContain('enterprise SCIM RPC privileges are not canonical');
    expect(integrations).toContain('enterprise SCIM RPC security configuration is not fixed');
  });

  it('preserves the membership-aware SCIM identity lookup row type', () => {
    expect(integrations).toContain(
      'returns table (outcome text,identity_id uuid,external_id text,user_id uuid,membership_id uuid,email text,role text,seat_type text,active boolean,created_at timestamptz,updated_at timestamptz)',
    );
    expect(integrations).toContain(
      'left join public.organization_members member on member.organization_id=identity.organization_id and member.user_id=identity.user_id',
    );
  });

  it('binds integration child rows to their tenant with validated composite foreign keys', () => {
    for (const constraint of [
      'enterprise_api_keys_service_account_tenant_fk',
      'enterprise_api_keys_rotation_tenant_fk',
      'enterprise_webhook_deliveries_subscription_tenant_fk',
      'enterprise_scim_tokens_connection_tenant_fk',
      'enterprise_integration_audit_service_account_tenant_fk',
      'enterprise_scim_identities_connection_tenant_fk',
    ]) {
      expect(integrations).toContain(constraint);
    }
    expect(integrations).toContain("if tenant_fk_count<>6 then raise exception 'enterprise integration tenant foreign keys incomplete'");
  });

  it('prevents composite SCIM identity deletion from nulling the tenant key', () => {
    expect(scimDeleteBoundary).toContain('drop constraint if exists enterprise_scim_identities_connection_tenant_fk');
    expect(scimDeleteBoundary).toContain('on delete restrict');
    expect(scimDeleteBoundary).toContain("delete_action is distinct from 'r'");
    expect(scimDeleteBoundary).not.toContain('on delete set null');
  });

  it('uses the live audit actor column rather than stale historical actor_user_id writes', () => {
    expect(licensing).toContain('audit_logs (organization_id,actor_id,action,entity_type,entity_id,metadata)');
    expect(integrations).toContain('audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)');
    expect(billing).toContain('audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)');
    expect(contractControl).toContain('audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)');
    expect(licensing).not.toContain('audit_logs (organization_id,actor_user_id');
    expect(integrations).not.toContain('audit_logs(organization_id,actor_user_id');
    expect(billing).not.toContain('audit_logs(organization_id,actor_user_id');
    expect(contractControl).not.toContain('audit_logs(organization_id,actor_user_id');
  });

  it('materializes Enterprise billing lifecycle implementation plus hardened app entrypoint', () => {
    expect(billing).toContain('public.sync_enterprise_contract_billing_v2_atomic');
    expect(contractModeFinal).toContain('public.sync_enterprise_contract_billing_v3_atomic');
    expect(billingRuntime).toContain('sync_enterprise_contract_billing_v3_atomic');
    expect(lifecycleRuntime).toContain('process_enterprise_contract_lifecycle_v2_atomic');
    expect(billing).toContain('public.process_enterprise_contract_lifecycle_v2_atomic');
    expect(billing).toContain('alter table public.enterprise_contract_billing_events force row level security');
    expect(billing).toContain('revoke all on table public.enterprise_contract_billing_events from public,anon,authenticated');
  });

  it('bridges historical contract modes and finishes on compatibility|negotiated only', () => {
    expect(contractModeBridge).toContain("check (contract_mode in ('compatibility','legacy_compatibility','negotiated'))");
    expect(contractModeFinal).toContain("set contract_mode='compatibility'");
    expect(contractModeFinal).toContain("check (contract_mode in ('compatibility','negotiated'))");
    expect(contractModeFinal).toContain('Legacy compatibility contracts are not canonicalized');
  });

  it('never binds ordinary Stripe events to compatibility envelopes or organization metadata alone', () => {
    expect(billing).toContain("contract.contract_mode='negotiated'");
    expect(contractModeFinal).toContain("contract.contract_mode='negotiated'");
    expect(contractModeFinal).toContain("contract_mode='compatibility'");

    const v3Start = contractModeFinal.indexOf(
      'create or replace function public.sync_enterprise_contract_billing_v3_atomic',
    );
    const configureStart = contractModeFinal.indexOf(
      'create or replace function public.configure_enterprise_contract_billing_v2_atomic',
    );
    const v3Definition = contractModeFinal.slice(v3Start, configureStart);
    expect(v3Definition).not.toContain(
      "p_organization_id is not null\n        and contract.organization_id=p_organization_id",
    );
  });

  it('hardens billing SECURITY DEFINER RPCs and keeps the v2 implementation private', () => {
    expect(billing).toContain('set search_path=pg_catalog');
    expect(contractModeFinal).toContain('set search_path=pg_catalog');
    expect(contractModeFinal).toContain('Enterprise billing hardened RPC privileges are not canonical');
    expect(contractModeFinal).toContain('Enterprise billing hardened RPC security configuration is not fixed');
    expect(contractModeFinal).toContain('grant execute on function public.sync_enterprise_contract_billing_v3_atomic');
    expect(contractModeFinal).toContain('grant execute on function public.configure_enterprise_contract_billing_v2_atomic');
    expect(contractModeFinal).toContain('from public,anon,authenticated,service_role');
  });

  it('materializes the exact platform Control Center contract RPCs', () => {
    for (const rpc of contractControlRpcs) {
      expect(contractsRuntime).toContain(rpc);
      expect(contractControl).toContain(`public.${rpc}`);
    }
    expect(contractControl).toContain("contract.contract_mode='negotiated'");
    expect(contractControl).toContain('limits_below_current_usage');
    expect(contractControl).toContain('limits_below_committed_usage');
    expect(contractControl).toContain('platform_role_required');
    expect(contractControl).toContain('Enterprise contract control RPC privileges are not service-role-only');
    expect(contractControl).toContain('Enterprise contract control RPC security configuration is not fixed');
  });

  it('validates active plus pending commitments before replacing the compatibility envelope', () => {
    const committedUsageCheck = contractControl.indexOf('v_active_members+v_pending_members>p_member_limit');
    const compatibilityDelete = contractControl.indexOf("contract.contract_mode='compatibility'");
    expect(committedUsageCheck).toBeGreaterThan(-1);
    expect(compatibilityDelete).toBeGreaterThan(committedUsageCheck);
    expect(contractControl).toContain("'negotiated','enterprise'");
  });
});
