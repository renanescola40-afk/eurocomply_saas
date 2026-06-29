/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  checkDistributedRateLimit: vi.fn(),
  createAdminClient: vi.fn(),
  sendEmail: vi.fn(),
  onboardingEmail: vi.fn(),
  reportError: vi.fn(),
  logAuditEvent: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/server/queries/auth', () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('@/lib/email/client', () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock('@/lib/email/templates', () => ({
  onboardingEmail: mocks.onboardingEmail,
}));

vi.mock('@/lib/observability/report-error', () => ({
  reportError: mocks.reportError,
}));

vi.mock('./audit', () => ({
  logAuditEvent: mocks.logAuditEvent,
}));

import { createOrganization } from './organizations';

function installSupabaseMock(options: {
  organizationError?: Error | null;
  memberError?: Error | null;
} = {}) {
  const organization = {
    id: 'org_a',
    name: 'Acme Corp',
    slug: 'acme-corp',
  };

  const organizationBuilder = {
    insert: vi.fn(() => organizationBuilder),
    select: vi.fn(() => organizationBuilder),
    single: vi.fn(async () => ({
      data: options.organizationError ? null : organization,
      error: options.organizationError ?? null,
    })),
  };

  const memberBuilder = {
    insert: vi.fn(async () => ({ error: options.memberError ?? null })),
  };

  const from = vi.fn((table: string) => {
    if (table === 'organizations') return organizationBuilder;
    if (table === 'organization_members') return memberBuilder;
    throw new Error(`Unexpected table ${table}`);
  });

  mocks.createAdminClient.mockReturnValue({ from });

  return { organization, organizationBuilder, memberBuilder, from };
}

describe('organization server action hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.eurocomply.test');
    mocks.requireCurrentUser.mockResolvedValue({
      id: 'user_auth',
      email: 'owner@example.test',
    });
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
    mocks.onboardingEmail.mockReturnValue({
      subject: 'Welcome',
      html: '<p>Welcome</p>',
      text: 'Welcome',
      template: 'onboarding',
    });
    mocks.sendEmail.mockResolvedValue({ ok: true });
    mocks.logAuditEvent.mockResolvedValue({ persisted: true });
    installSupabaseMock();
  });

  it('blocks organization creation without login before admin Supabase is used', async () => {
    mocks.requireCurrentUser.mockRejectedValue(new Error('Authentication required'));

    await expect(createOrganization({ name: 'Acme Corp', slug: 'acme-corp' })).rejects.toThrow('Authentication required');

    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('uses the authenticated user for owner, email and audit fields', async () => {
    const { organizationBuilder, memberBuilder } = installSupabaseMock();

    const result = await createOrganization({ name: 'Acme Corp', slug: 'acme-corp' });

    expect(result).toMatchObject({ id: 'org_a' });
    expect(organizationBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme Corp',
        slug: 'acme-corp',
        created_by_clerk_user_id: 'user_auth',
      }),
    );
    expect(memberBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org_a',
        clerk_user_id: 'user_auth',
        role: 'owner',
      }),
    );
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner@example.test', userId: 'user_auth' }));
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_a',
        actorUserId: 'user_auth',
        action: 'organization.created',
      }),
    );
  });

  it('blocks rate limit exceeded organization creation before mutations', async () => {
    mocks.checkDistributedRateLimit.mockResolvedValue({
      allowed: false,
      limit: 3,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
      category: 'general-api',
      policy: 'general-api',
      highRisk: false,
      failureMode: 'fail-open',
      audit: false,
      key: 'organization:create:user_auth',
      userId: 'user_auth',
      organizationId: null,
      route: 'server-action:createOrganization',
      action: 'organization.create',
    });

    await expect(createOrganization({ name: 'Acme Corp', slug: 'acme-corp' })).rejects.toThrow(
      'Too many organization creation attempts. Please try again later.',
    );

    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
  });

  it('sanitizes provider errors and does not expose Supabase details to the caller', async () => {
    installSupabaseMock({ organizationError: new Error('provider detail') });

    await expect(createOrganization({ name: 'Acme Corp', slug: 'acme-corp' })).rejects.toThrow('Unable to create organization');

    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'provider detail' }),
      expect.objectContaining({ area: 'organization_created_action', userId: 'user_auth', organizationSlug: 'acme-corp' }),
    );
  });
});
