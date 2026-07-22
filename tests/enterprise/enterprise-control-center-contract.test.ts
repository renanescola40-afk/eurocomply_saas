import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const platformPage = readFileSync('src/app/[locale]/platform/page.tsx', 'utf8');
const controlCenter = readFileSync('src/components/platform/enterprise-control-center.tsx', 'utf8');
const contractRoute = readFileSync('src/app/api/platform/contracts/route.ts', 'utf8');
const contractStatusRoute = readFileSync('src/app/api/platform/contracts/status/route.ts', 'utf8');
const usageRoute = readFileSync('src/app/api/platform/organizations/[organizationId]/usage/route.ts', 'utf8');
const teamSeatRoute = readFileSync('src/app/api/team/members/seat/route.ts', 'utf8');
const provisioning = readFileSync('src/server/enterprise/provisioning.ts', 'utf8');
const contractProvisioningMigration = readFileSync(
  'supabase/migrations/20260721194500_safe_enterprise_contract_provisioning.sql',
  'utf8',
);
const invitationMigration = readFileSync(
  'supabase/migrations/20260721195000_transactional_enterprise_invitations.sql',
  'utf8',
);
const triggerHardeningMigration = readFileSync(
  'supabase/migrations/20260721200000_enterprise_trigger_hardening.sql',
  'utf8',
);

describe('enterprise platform control center contract', () => {
  it('protects the server-rendered control center with platform capability and no-store', () => {
    expect(platformPage).toContain("export const dynamic = 'force-dynamic'");
    expect(platformPage).toContain("export const fetchCache = 'force-no-store'");
    expect(platformPage).toContain("requirePlatformCapability(user.id, 'organizations')");
    expect(platformPage).toContain('<EnterpriseControlCenter platformRole={membership.role} />');
  });

  it('keeps platform mutations behind origin, rate-limit, MFA capability and no-store responses', () => {
    for (const source of [contractRoute, contractStatusRoute]) {
      expect(source).toContain('requireTrustedMutation(request');
      expect(source).toContain("failureMode: 'fail-closed'");
      expect(source).toContain("requirePlatformCapability(user.id, 'contracts')");
      expect(source).toContain('instanceof PlatformAdminError');
      expect(source).toContain('noStoreJson(');
    }
  });

  it('keeps organization usage read access behind the global platform authority', () => {
    expect(usageRoute).toContain("requirePlatformCapability(user.id, 'organizations')");
    expect(usageRoute).toContain('resolveEnterpriseEntitlementSnapshot(');
    expect(usageRoute).toContain("getSnapshotSeatAvailability(entitlement, 'full')");
    expect(usageRoute).toContain('instanceof PlatformAdminError');
  });

  it('connects the control center UI only to protected APIs', () => {
    expect(controlCenter).toContain("fetch('/api/platform/contracts'");
    expect(controlCenter).toContain("fetch('/api/platform/contracts/status'");
    expect(controlCenter).toContain('/api/platform/organizations/${encodeURIComponent(organizationId.trim())}/usage');
    expect(controlCenter).not.toContain(".from('enterprise_contracts')");
    expect(controlCenter).not.toContain('createAdminClient');
  });

  it('provides one provisioning adapter for SCIM, SSO, CSV, API and admin paths', () => {
    expect(provisioning).toContain('export async function provisionEnterpriseIdentity');
    expect(provisioning).toContain('return reserveEnterpriseSeat(input)');
    expect(provisioning).toContain('export async function deprovisionEnterpriseIdentity');
    expect(provisioning).toContain("const RELEASE_SEAT_RPC = 'release_organization_seat_atomic'");
    expect(provisioning).not.toContain(".from('organization_members').insert");
  });

  it('uses the same central adapter for seat changes, suspension and reactivation', () => {
    expect(teamSeatRoute).toContain('provisionEnterpriseIdentity({');
    expect(teamSeatRoute).toContain('deprovisionEnterpriseIdentity({');
    expect(teamSeatRoute).toContain("permission: 'manage_team'");
    expect(teamSeatRoute).toContain('requireTrustedMutation(request');
    expect(teamSeatRoute).toContain('requireStepUpForRequest({');
    expect(teamSeatRoute).toContain("source: parsed.data.operation === 'reactivate' ? 'reactivation' : 'admin'");
  });

  it('validates current usage before replacing the compatibility contract', () => {
    expect(contractProvisioningMigration).toContain('from public.organization_usage as usage');
    expect(contractProvisioningMigration).toContain('for update;');
    expect(contractProvisioningMigration).toContain('limits_below_current_usage');
    expect(contractProvisioningMigration.indexOf('limits_below_current_usage')).toBeLessThan(
      contractProvisioningMigration.indexOf('from public.create_enterprise_contract_atomic('),
    );
    expect(contractProvisioningMigration).toContain(
      'revoke all on function public.create_enterprise_contract_atomic(',
    );
  });

  it('keeps pending invitation counters synchronized and hardens delete trigger records', () => {
    expect(invitationMigration).toContain('create trigger invitations_sync_pending_usage');
    expect(invitationMigration).toContain('after insert or update of accepted_at, revoked_at, expires_at or delete');
    expect(triggerHardeningMigration).toContain("if tg_op = 'DELETE' then");
    expect(triggerHardeningMigration).toContain('v_organization_id := old.organization_id');
    expect(triggerHardeningMigration).toContain('return old');
  });
});
