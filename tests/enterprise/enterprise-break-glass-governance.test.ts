import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260727160000_enterprise_break_glass_governance.sql', 'utf8');
const service = readFileSync('src/server/enterprise/break-glass-governance.ts', 'utf8');
const requestRoute = readFileSync('src/app/api/team/break-glass/route.ts', 'utf8');
const decisionRoute = readFileSync('src/app/api/team/break-glass/[requestId]/decision/route.ts', 'utf8');
const revokeRoute = readFileSync('src/app/api/team/break-glass/[requestId]/revoke/route.ts', 'utf8');
const expiryRoute = readFileSync('src/app/api/internal/enterprise-break-glass/expire/route.ts', 'utf8');

describe('enterprise break-glass governance', () => {
  it('forces RLS and service-role-only persistence', () => {
    expect(migration).toContain('force row level security');
    expect(migration).toContain('revoke all on public.enterprise_break_glass_requests from anon, authenticated');
    expect(migration).toContain('grant all on public.enterprise_break_glass_requests to service_role');
  });

  it('bounds emergency access and prevents duplicate active targets', () => {
    expect(migration).toContain("requested_minutes between 15 and 240");
    expect(migration).toContain('enterprise_break_glass_one_open_target');
    expect(migration).toContain("approvals_required integer not null default 2");
  });

  it('prevents requester self-approval and uses append-only event hashes', () => {
    expect(service).toContain('break_glass_self_approval_forbidden');
    expect(service).toContain("createHash('sha256')");
    expect(service).toContain('previous_event_hash');
  });

  it('requires tenant RBAC, trusted mutation, rate limiting and step-up', () => {
    for (const route of [requestRoute, decisionRoute, revokeRoute]) {
      expect(route).toContain("permission: 'manage_team'");
      expect(route).toContain('requireTrustedMutation');
      expect(route).toContain("failureMode: 'fail-closed'");
      expect(route).toContain('requireStepUpForRequest');
      expect(route).toContain('noStoreJson');
    }
  });

  it('expires with bounded internal authorization', () => {
    expect(migration).toContain('for update skip locked');
    expect(expiryRoute).toContain('isAuthorizedInternalCronRequest');
    expect(expiryRoute).toContain('.max(500)');
  });
});
