/* eslint-disable */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  checkDistributedRateLimit: vi.fn(),
  buildRateLimitSubjectFromRequest: vi.fn((_request, subject = {}) => ({
    userId: subject.userId ?? null,
    organizationId: subject.organizationId ?? null,
    ip: '203.0.113.10',
    userAgent: 'Vitest',
    action: subject.action ?? 'trusted_mutation',
    route: subject.route ?? '/api/billing/checkout',
  })),
  stripeCheckoutCreate: vi.fn(),
  getCurrentUser: vi.fn(),
  getCurrentOrganizationForUser: vi.fn(),
  assertOrganizationPermission: vi.fn(),
  permissionDeniedResponse: vi.fn(),
  assertTrustedOrigin: vi.fn(),
  requireStepUpForRequest: vi.fn(),
  publicStepUpSummary: vi.fn(),
  writeAuditLog: vi.fn(),
  supabaseMaybeSingle: vi.fn(),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
  buildRateLimitSubjectFromRequest: mocks.buildRateLimitSubjectFromRequest,
}));

vi.mock('@/lib/security/rate-limit-response', () => ({
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 }),
}));

vi.mock('@/lib/security/audit-log', () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          not: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: mocks.supabaseMaybeSingle,
              }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/server/billing/app-url', () => ({
  resolveBillingReturnBaseUrl: () => ({ ok: true, appUrl: 'https://app.eurocomply.test' }),
}));

vi.mock('@/server/billing/stripe', () => ({
  getStripeClient: () => ({
    checkout: {
      sessions: {
        create: mocks.stripeCheckoutCreate,
      },
    },
  }),
}));

vi.mock('@/server/billing/plans', () => ({
  normalizeBillingPlanId: (plan: string) => {
    if (plan === 'business' || plan === 'professional' || plan === 'growth') return 'growth';
    if (plan === 'essential' || plan === 'starter') return 'starter';
    if (plan === 'enterprise') return 'enterprise';
    return undefined;
  },
  isSelfServePlan: (plan: string) => plan === 'starter' || plan === 'growth' || plan === 'enterprise',
  getStripePriceId: (plan: string) => `price_${plan}`,
}));

vi.mock('@/server/queries/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/server/queries/organizations', () => ({
  getCurrentOrganizationForUser: mocks.getCurrentOrganizationForUser,
}));

vi.mock('@/server/security/rbac', () => ({
  assertOrganizationPermission: mocks.assertOrganizationPermission,
  permissionDeniedResponse: mocks.permissionDeniedResponse,
}));

vi.mock('@/server/security/origin-guard', () => ({
  assertTrustedOrigin: mocks.assertTrustedOrigin,
}));

vi.mock('@/server/security/api-guards', () => ({
  requireApiUser: async () => {
    const user = await mocks.getCurrentUser();
    if (!user) throw { code: 'unauthorized', status: 401 };
    return user;
  },
  requirePermission: async (input: unknown) => {
    const permission = await mocks.assertOrganizationPermission(input);
    if (!permission?.ok) throw { code: permission?.error ?? 'permission_denied', status: permission?.status ?? 403 };
    return permission;
  },
  requireTrustedMutation: async (request: Request, input: { rateLimit?: unknown } = {}) => {
    const originDenied = mocks.assertTrustedOrigin(request);
    if (originDenied) return originDenied;
    const rateLimit = await mocks.checkDistributedRateLimit(input.rateLimit ?? {});
    if (!rateLimit.allowed) return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
    return null;
  },
  secureApiError: (error: { code?: string; status?: number }) =>
    new Response(JSON.stringify({ error: error.code ?? 'internal_server_error' }), {
      status: error.status ?? 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    }),
}));

vi.mock('@/server/security/step-up', () => ({
  requireStepUpForRequest: mocks.requireStepUpForRequest,
  publicStepUpSummary: mocks.publicStepUpSummary,
}));

import { POST } from './route';

function buildRequest(body: unknown, headers: HeadersInit = {}) {
  return new Request('https://app.eurocomply.test/api/billing/checkout', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://app.eurocomply.test',
      'x-eurocomply-step-up-token': 'step_up_token',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('billing checkout API security gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
    mocks.getCurrentUser.mockResolvedValue({ id: 'user_admin', email: 'admin@example.test' });
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ id: 'org_a', clerk_org_id: 'clerk_org_a' });
    mocks.assertOrganizationPermission.mockResolvedValue({ ok: true, role: 'admin' });
    mocks.permissionDeniedResponse.mockImplementation(() => new Response(JSON.stringify({ error: 'permission_denied' }), { status: 403 }));
    mocks.assertTrustedOrigin.mockReturnValue(null);
    mocks.requireStepUpForRequest.mockResolvedValue({
      ok: true,
      assessment: { action: 'manage_billing', verifiedAt: '2026-06-21T09:00:00.000Z' },
    });
    mocks.publicStepUpSummary.mockReturnValue({ verified: true });
    mocks.stripeCheckoutCreate.mockResolvedValue({ id: 'checkout_session_fixture', url: 'https://checkout.stripe.test/session-fixture' });
    mocks.writeAuditLog.mockResolvedValue(undefined);
    mocks.supabaseMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('blocks checkout without an authenticated user', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await POST(buildRequest({ plan: 'growth', locale: 'en' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'unauthorized' });
    expect(mocks.getCurrentOrganizationForUser).not.toHaveBeenCalled();
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
    expect(mocks.writeAuditLog).not.toHaveBeenCalled();
  });

  it('blocks checkout without manage_billing permission', async () => {
    mocks.assertOrganizationPermission.mockResolvedValue({
      ok: false,
      error: 'permission_denied',
      status: 403,
      message: 'Permission denied.',
    });

    const response = await POST(buildRequest({ plan: 'growth', locale: 'en' }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'permission_denied' });
    expect(mocks.assertTrustedOrigin).not.toHaveBeenCalled();
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
    expect(mocks.writeAuditLog).not.toHaveBeenCalled();
  });

  it('blocks checkout without a valid step-up token', async () => {
    mocks.requireStepUpForRequest.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'step_up_required' }), { status: 403 }),
    });

    const response = await POST(buildRequest({ plan: 'growth', locale: 'en' }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'step_up_required' });
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
    expect(mocks.writeAuditLog).not.toHaveBeenCalled();
  });

  it('rejects non-self-serve plans before contacting Stripe', async () => {
    const response = await POST(buildRequest({ plan: 'unknown', locale: 'en' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'invalid_plan' });
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
    expect(mocks.requireStepUpForRequest).not.toHaveBeenCalled();
  });
});
