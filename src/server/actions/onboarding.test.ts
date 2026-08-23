// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertCurrentUserCan: vi.fn(),
  createAdminClient: vi.fn(),
  createOrganization: vi.fn(),
  getCurrentOrganizationForUser: vi.fn(),
  getOrganizationBillingAuthority: vi.fn(),
  invitationEmail: vi.fn(),
  reportError: vi.fn(),
  requireCurrentUser: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/email/client', () => ({ sendEmail: mocks.sendEmail }));
vi.mock('@/lib/email/templates', () => ({ invitationEmail: mocks.invitationEmail }));
vi.mock('@/lib/observability/report-error', () => ({ reportError: mocks.reportError }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock('@/server/actions/organizations', () => ({ createOrganization: mocks.createOrganization }));
vi.mock('@/server/auth/permissions', () => ({ assertCurrentUserCan: mocks.assertCurrentUserCan }));
vi.mock('@/server/queries/auth', () => ({ requireCurrentUser: mocks.requireCurrentUser }));
vi.mock('@/server/queries/current-organization', () => ({
  getCurrentOrganizationForUser: mocks.getCurrentOrganizationForUser,
}));
vi.mock('@/server/queries/subscription', () => ({
  getOrganizationBillingAuthority: mocks.getOrganizationBillingAuthority,
}));

import {
  completeOnboardingActivation,
  createOnboardingActivationIdempotencyKey,
} from './onboarding';

const organizationId = '11111111-1111-4111-8111-111111111111';
const actorUserId = '22222222-2222-4222-8222-222222222222';
const invitationId = '33333333-3333-4333-8333-333333333333';
const token = 'a'.repeat(64);

const baseInput = {
  organizationId,
  organizationName: 'Acme Corp',
  slug: 'acme-corp',
  country: 'pt',
  companyType: 'sme',
  sector: 'saas',
  aiUsage: 'customer_facing',
  aiUsageSummary: 'Customer support automation',
  aiSystemName: 'Support Copilot',
  aiSystemUseCase: 'Assist support agents with grounded response drafts.',
  ownerTeam: 'Support Operations',
  vendorName: 'Model Vendor',
  role: 'deployer',
  lifecycleStatus: 'pilot',
  riskDomain: 'customer_support',
  usesPersonalData: true,
  interactsWithPeople: true,
  generatesContent: true,
  biometricIdentification: false,
  manipulativeOrExploitative: false,
  inviteEmails: ['Teammate@Example.test'],
  selectedPlan: 'professional',
};

function installSupabaseMock(options: {
  outcome?: string;
  rpcError?: Error | null;
  invitations?: unknown[];
} = {}) {
  const rpc = vi.fn(async () => ({
    data: [{
      outcome: options.outcome ?? 'completed',
      activation_run_id: '44444444-4444-4444-8444-444444444444',
      first_ai_system_id: '55555555-5555-4555-8555-555555555555',
      documents_created: 3,
      tasks_created: 4,
      invitations_created: 1,
      organization_name: 'Acme Corp',
      invitation_deliveries: options.invitations ?? [{
        id: invitationId,
        email: 'teammate@example.test',
        role: 'viewer',
        token,
      }],
    }],
    error: options.rpcError ?? null,
  }));

  mocks.createAdminClient.mockReturnValue({ rpc });
  return { rpc };
}

describe('atomic onboarding activation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.eurocomply.test');
    mocks.requireCurrentUser.mockResolvedValue({ id: actorUserId, email: 'owner@example.test' });
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ organization_id: organizationId });
    mocks.getOrganizationBillingAuthority.mockResolvedValue({
      licensed: true,
      plan: 'professional',
      source: 'live_stripe',
    });
    mocks.assertCurrentUserCan.mockResolvedValue('owner');
    mocks.invitationEmail.mockReturnValue({
      subject: 'Join Acme Corp',
      html: '<p>Join</p>',
      text: 'Join',
      template: 'member_invited',
    });
    mocks.sendEmail.mockResolvedValue({ sent: true, provider: 'resend', status: 'sent', attempts: 1 });
    installSupabaseMock();
  });

  it('requires durable commercial authority before delegating any product write to the activation RPC', async () => {
    const { rpc } = installSupabaseMock();

    const result = await completeOnboardingActivation(baseInput, 'pt');

    expect(mocks.assertCurrentUserCan).toHaveBeenNthCalledWith(1, organizationId, actorUserId, 'organization:update');
    expect(mocks.getOrganizationBillingAuthority).toHaveBeenCalledWith(organizationId);
    expect(mocks.assertCurrentUserCan).toHaveBeenNthCalledWith(2, organizationId, actorUserId, 'team:invite');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      'complete_onboarding_activation_atomic',
      expect.objectContaining({
        p_organization_id: organizationId,
        p_actor_user_id: actorUserId,
        p_idempotency_key: expect.stringMatching(/^[a-f0-9]{64}$/),
        p_activation: expect.objectContaining({
          organization: expect.objectContaining({
            selectedPlan: 'professional',
          }),
          inviteEmails: ['teammate@example.test'],
          readinessScore: expect.any(Number),
        }),
      }),
    );
    expect(mocks.getOrganizationBillingAuthority.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.assertCurrentUserCan.mock.invocationCallOrder[0],
    );
    expect(rpc.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.getOrganizationBillingAuthority.mock.invocationCallOrder[0],
    );
    expect(result).toMatchObject({
      status: 'completed',
      documentsCreated: 3,
      tasksCreated: 4,
      invitationsCreated: 1,
      invitationsDelivered: 1,
      dashboardPath: '/pt/dashboard/organizations?plan=professional',
    });
  });

  it('denies an authenticated but unlicensed organization before RPC writes, team invitations or email delivery', async () => {
    const { rpc } = installSupabaseMock();
    mocks.getOrganizationBillingAuthority.mockResolvedValue({
      licensed: false,
      plan: 'starter',
      source: 'none',
    });

    await expect(completeOnboardingActivation(baseInput, 'en')).rejects.toThrow(
      'An active paid subscription or signed contract is required before product onboarding can be activated.',
    );

    expect(mocks.assertCurrentUserCan).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('fails closed when billing authority cannot be resolved and performs no product write', async () => {
    const { rpc } = installSupabaseMock();
    mocks.getOrganizationBillingAuthority.mockRejectedValue(new Error('billing provider unavailable'));

    await expect(completeOnboardingActivation(baseInput, 'en')).rejects.toThrow(
      'Commercial activation is temporarily unavailable. Please retry billing verification.',
    );

    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'billing provider unavailable' }),
      expect.objectContaining({ area: 'onboarding_commercial_authority', organizationId }),
    );
    expect(rpc).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('uses a stable key for semantically identical normalized invitation lists', () => {
    const first = createOnboardingActivationIdempotencyKey({
      organizationId,
      userId: actorUserId,
      payload: { ...baseInput, inviteEmails: ['B@example.test', 'a@example.test', 'b@example.test'] },
    });
    const second = createOnboardingActivationIdempotencyKey({
      organizationId,
      userId: actorUserId,
      payload: { ...baseInput, inviteEmails: ['b@example.test', 'A@example.test'] },
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it('sanitizes RPC failures and never starts invitation delivery', async () => {
    installSupabaseMock({ rpcError: new Error('provider transaction detail') });

    await expect(completeOnboardingActivation(baseInput, 'en')).rejects.toThrow(
      'Unable to complete onboarding activation.',
    );

    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'provider transaction detail' }),
      expect.objectContaining({ area: 'onboarding_activation_atomic', organizationId }),
    );
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('fails closed on a database authorization outcome', async () => {
    installSupabaseMock({ outcome: 'forbidden' });

    await expect(completeOnboardingActivation(baseInput, 'en')).rejects.toThrow(
      'You do not have access to complete this onboarding.',
    );

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('does not claim completion when the configured email provider skips delivery', async () => {
    mocks.sendEmail.mockResolvedValue({ sent: false, provider: 'console', status: 'skipped', attempts: 0 });

    await expect(completeOnboardingActivation(baseInput, 'en')).rejects.toThrow(
      'Onboarding data was saved, but invitation delivery failed. Retry onboarding to resend pending invitations.',
    );

    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ area: 'onboarding_invitation_delivery', invitationId }),
    );
  });

  it('skips team permission and email delivery when no invitations were requested', async () => {
    const { rpc } = installSupabaseMock({ invitations: [] });

    const result = await completeOnboardingActivation({ ...baseInput, inviteEmails: [] }, 'unknown');

    expect(mocks.assertCurrentUserCan).toHaveBeenCalledTimes(1);
    expect(mocks.getOrganizationBillingAuthority).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(result.dashboardPath).toBe('/en/dashboard/organizations?plan=professional');
  });
});
