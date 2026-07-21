import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const bulkMigration = readFileSync(
  'supabase/migrations/20260721210000_enterprise_bulk_provisioning_jobs.sql',
  'utf8',
);
const scimMigration = readFileSync(
  'supabase/migrations/20260721211000_enterprise_scim_user_lifecycle.sql',
  'utf8',
);
const worker = readFileSync('src/server/enterprise/bulk-provisioning-worker.ts', 'utf8');
const scimUsers = readFileSync('src/app/api/scim/v2/Users/route.ts', 'utf8');
const scimUser = readFileSync('src/app/api/scim/v2/Users/[id]/route.ts', 'utf8');
const scimServer = readFileSync('src/server/enterprise/scim.ts', 'utf8');

describe('enterprise provisioning and SCIM contracts', () => {
  it('persists bulk jobs with forced RLS, idempotency and bounded rows', () => {
    for (const table of [
      'public.enterprise_provisioning_jobs',
      'public.enterprise_provisioning_job_items',
    ]) {
      expect(bulkMigration).toContain(`create table if not exists ${table}`);
      expect(bulkMigration).toContain(`alter table ${table} force row level security`);
    }
    expect(bulkMigration).toContain('total_items integer not null check (total_items between 1 and 10000)');
    expect(bulkMigration).toContain('unique (organization_id, source, idempotency_key)');
    expect(bulkMigration).toContain('for update of item skip locked');
    expect(bulkMigration).toContain("lease_expires_at = now() + interval '5 minutes'");
  });

  it('reserves queued capacity before workers begin', () => {
    expect(bulkMigration).toContain("queued.status in ('queued','processing')");
    expect(bulkMigration).toContain('v_snapshot.active_members + v_snapshot.pending_invitations + v_queued_members + v_total');
    expect(bulkMigration).toContain("'capacity_insufficient'::text");
    expect(bulkMigration.indexOf("'capacity_insufficient'::text")).toBeLessThan(
      bulkMigration.indexOf('insert into public.enterprise_provisioning_jobs ('),
    );
  });

  it('processes every bulk row through the canonical invitation authority', () => {
    expect(worker).toContain('createOrganizationInvite({');
    expect(worker).toContain('deleteOrganizationInvite({');
    expect(worker).toContain('createAuditEvent({');
    expect(worker).toContain('sendEmail({');
    expect(worker).not.toContain(".from('organization_members').insert");
  });

  it('stores only SCIM token digests and checks negotiated entitlement', () => {
    expect(scimMigration).toContain("coalesce(p_token_hash, '') !~ '^[a-f0-9]{64}$'");
    expect(scimMigration).toContain('v_token.token_hash <> p_token_hash');
    expect(scimMigration).toContain('v_snapshot.scim_enabled is distinct from true');
    expect(scimMigration).not.toMatch(/raw_token|plaintext_token/i);
    expect(scimServer).toContain("createHash('sha256').update(token, 'utf8').digest('hex')");
  });

  it('binds SCIM requests to the token organization and the central seat ledger', () => {
    expect(scimUsers).toContain('authenticateScimRequest(request)');
    expect(scimUsers).toContain('organizationId: authentication.organizationId');
    expect(scimServer).toContain('provisionEnterpriseIdentity({');
    expect(scimServer).toContain("source: 'scim'");
    expect(scimServer).toContain('deprovisionEnterpriseIdentity({');
  });

  it('uses bounded payloads, rate limits and deprovisioning for SCIM mutations', () => {
    expect(scimUsers).toContain('checkDistributedRateLimit(request');
    expect(scimUsers).toContain('readBoundedJsonRequest(request');
    expect(scimUser).toContain('checkDistributedRateLimit(request');
    expect(scimUser).toContain('readBoundedJsonRequest(request');
    expect(scimUser).toContain('deactivateScimUser(authentication, identity)');
    expect(scimUser).not.toContain('request.json()');
  });
});
