import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertCurrentUserCan: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
  createAdminClient: vi.fn(),
  logAuditEvent: vi.fn(),
  reportError: vi.fn(),
  requireCurrentUser: vi.fn(),
  removalOutcome: 'removed' as 'removed' | 'last_owner' | 'state_changed' | 'not_found' | 'invalid_input',
  rpcError: null as Error | null,
}));

vi.mock('@/lib/email/client', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/observability/report-error', () => ({
  reportError: mocks.reportError,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('@/server/actions/audit', () => ({
  logAuditEvent: mocks.logAuditEvent,
}));

vi.mock('@/server/auth/permissions', () => ({
  assertCurrentUserCan: mocks.assertCurrentUserCan,
}));

vi.mock('@/server/queries/auth', () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

import { removeOrganizationMember } from './members';

const organizationId='11111111-1111-4111-8111-111111111111';
const memberId='33333333-3333-4333-8333-333333333333';

describe('legacy Server Action removal is disabled (mocked)',()=>{
  beforeEach(()=>{vi.clearAllMocks();});
  it('always fails closed before accessing the Supabase admin client',async()=>{
    await expect(removeOrganizationMember({organizationId,memberId})).rejects.toThrow('Member removal requires the step-up protected API route.');
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });
  it('never performs an audit compensation or a member deletion',async()=>{
    await expect(removeOrganizationMember({organizationId,memberId})).rejects.toThrow();
    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
    expect(mocks.checkDistributedRateLimit).not.toHaveBeenCalled();
  });
});
