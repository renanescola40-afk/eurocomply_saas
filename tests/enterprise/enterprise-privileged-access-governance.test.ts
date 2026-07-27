import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260726123000_enterprise_privileged_access_governance.sql', 'utf8');
const service = readFileSync('src/server/enterprise/privileged-access-governance.ts', 'utf8');
const requestRoute = readFileSync('src/app/api/team/privileged-access/route.ts', 'utf8');
const decisionRoute = readFileSync('src/app/api/team/privileged-access/[requestId]/decision/route.ts', 'utf8');
const expiryRoute = readFileSync('src/app/api/internal/enterprise-privileged-access-expiry/route.ts', 'utf8');

describe('enterprise privileged access governance', () => {
  it('enforces bounded temporary access and active-request uniqueness', () => {
    expect(migration).toContain("expires_at <= created_at + interval '24 hours'");
    expect(migration).toContain("where status in ('pending','approved','active')");
  });
  it('forces RLS and service-role-only database access', () => {
    expect(migration.match(/force row level security/g)?.length).toBe(3);
    expect(migration).toContain('grant execute on function public.expire_enterprise_privileged_access(integer) to service_role');
  });
  it('prevents self approval and requires multiple approvals', () => {
    expect(service).toContain("request.requester_user_id === approverUserId");
    expect(migration).toContain('required_approvals integer not null default 2');
  });
  it('protects mutations with RBAC, trusted mutation and step-up', () => {
    for (const route of [requestRoute, decisionRoute]) {
      expect(route).toContain("permission: 'manage_team'");
      expect(route).toContain('requireTrustedMutation');
      expect(route).toContain('requireStepUpForRequest');
      expect(route).toContain("failureMode: 'fail-closed'");
    }
  });
  it('uses an internal authenticated bounded expiry worker', () => {
    expect(expiryRoute).toContain('isAuthorizedInternalCronRequest');
    expect(expiryRoute).toContain('.max(500)');
    expect(expiryRoute).toContain('noStoreJson');
  });
});