import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { issueConstraintSafeEnterpriseApiKey } from '../../src/server/enterprise/api-access';

const migration = readFileSync(
  'supabase/migrations/20260721216000_enterprise_api_key_provisioning.sql',
  'utf8',
);
const auditMigration = readFileSync(
  'supabase/migrations/20260721216010_enterprise_api_provisioning_audit.sql',
  'utf8',
);
const access = readFileSync('src/server/enterprise/api-access.ts', 'utf8');
const issuance = readFileSync(
  'src/app/api/platform/organizations/[organizationId]/api-keys/route.ts',
  'utf8',
);
const provisioning = readFileSync('src/app/api/enterprise/v1/members/route.ts', 'utf8');

describe('Enterprise API provisioning', () => {
  it('issues a constraint-safe show-once key and PBKDF2 verifier', () => {
    const credential = issueConstraintSafeEnterpriseApiKey();
    expect(credential.prefix).toMatch(/^rc_live_[a-f0-9]{8}$/);
    expect(credential.plaintext).toMatch(/^rc_live_[a-f0-9]{8}\.[A-Za-z0-9_-]{32,128}$/);
    expect(credential.verifier).toMatch(/^pbkdf2\$210000\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
    expect(credential.plaintext).not.toContain(credential.verifier);
  });

  it('reuses enterprise_api_keys and permits PBKDF2 without creating a second key table', () => {
    expect(migration).toContain('alter table public.enterprise_api_keys');
    expect(migration).toContain("secret_hash ~ '^pbkdf2");
    expect(migration).not.toMatch(/create table if not exists public\..*api.*token/i);
    expect(migration).toContain('create or replace function public.create_enterprise_api_credential_atomic');
  });

  it('requires platform security authority and active API entitlement before issuance', () => {
    expect(migration).toContain("actor.role in ('owner','platform_owner','platform_admin','platform_security')");
    expect(migration).toContain("v_snapshot.contract_status is distinct from 'active'");
    expect(migration).toContain('v_snapshot.api_enabled is distinct from true');
    expect(issuance).toContain("requirePlatformCapability(user.id, 'security')");
    expect(issuance).toContain('requireTrustedMutation(request');
    expect(issuance).toContain('readBoundedJsonRequest(request');
  });

  it('derives organization and scope from the bearer key instead of request payload', () => {
    expect(access).toContain("requireEnterpriseApiAccess(");
    expect(access).toContain("requiredScope: string");
    expect(access).toContain("resolveEnterpriseEntitlements(organizationId)");
    expect(provisioning).toContain("requireEnterpriseApiAccess(request, 'users:provision')");
    expect(provisioning).not.toContain('organizationId: parsed.data');
    expect(provisioning).toContain('organizationId: access.organizationId');
  });

  it('requires bounded JSON, fail-closed rate limits and idempotency for provisioning', () => {
    expect(provisioning).toContain("failureMode: 'fail-closed'");
    expect(provisioning).toContain('readBoundedJsonRequest(request');
    expect(provisioning).toContain("request.headers.get('idempotency-key')");
    expect(provisioning).toContain('IDEMPOTENCY_PATTERN');
    expect(provisioning).toContain("source: 'api'");
    expect(provisioning).toContain('provisionEnterpriseIdentity({');
  });

  it('records service-account audit evidence without email or bearer token material', () => {
    expect(auditMigration).toContain('actor_service_account_id');
    expect(auditMigration).toContain("'enterprise.api_user_provisioned'");
    expect(auditMigration).toContain('p_idempotency_digest');
    expect(auditMigration).not.toMatch(/email|authorization|bearer|plaintext/i);
    expect(provisioning).toContain("'record_enterprise_api_provisioning_event'");
  });
});
