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
    action: subject.action ?? 'lead_capture',
    route: subject.route ?? '/api/leads',
  })),
  rateLimitResponse: vi.fn((result, message = 'Too many requests') =>
    new Response(JSON.stringify({ error: message }), {
      status: result.reason && result.failureMode === 'fail-closed' ? 503 : 429,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Retry-After': String(result.retryAfterSeconds ?? 60),
      },
    }),
  ),
  tryCreateAdminClient: vi.fn(),
  supabaseInsert: vi.fn(),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
  buildRateLimitSubjectFromRequest: mocks.buildRateLimitSubjectFromRequest,
}));

vi.mock('@/lib/security/rate-limit-response', () => ({
  rateLimitResponse: mocks.rateLimitResponse,
}));

vi.mock('@/lib/supabase/admin', () => ({
  tryCreateAdminClient: mocks.tryCreateAdminClient,
}));

import { POST } from './route';

function buildRequest(body: unknown, headers: HeadersInit = {}) {
  return new Request('https://app.eurocomply.test/api/leads', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Vitest',
      'x-forwarded-for': '203.0.113.10',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function validLead(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Renan Silva',
    workEmail: 'renan@example.test',
    companyName: 'Risck Comply',
    role: 'Founder',
    companySize: '1-10',
    region: 'EU',
    complianceDrivers: ['EU AI Act'],
    timeline: 'Now',
    currentProcess: 'Manual spreadsheet',
    message: 'Need compliance readiness',
    source: 'book-demo',
    locale: 'pt',
    consentToContact: true,
    ...overrides,
  };
}

describe('public lead capture API hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.checkDistributedRateLimit.mockResolvedValue({
      allowed: true,
      limit: 5,
      remaining: 4,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
      category: 'general-api',
      policy: 'general-api',
      highRisk: false,
      failureMode: 'fail-closed',
      audit: false,
      key: 'lead_capture:test',
      userId: null,
      organizationId: null,
      route: '/api/leads',
      action: 'lead_capture',
    });
    mocks.supabaseInsert.mockResolvedValue({ error: null });
    mocks.tryCreateAdminClient.mockReturnValue({
      from: vi.fn(() => ({ insert: mocks.supabaseInsert })),
    });
  });

  it('uses distributed rate limiting before reading and storing the lead', async () => {
    const response = await POST(buildRequest(validLead()));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ ok: true });
    expect(mocks.buildRateLimitSubjectFromRequest).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ action: 'lead_capture', route: '/api/leads' }),
    );
    expect(mocks.checkDistributedRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        policy: 'general-api',
        failureMode: 'fail-closed',
        limit: 5,
        windowMs: 60_000,
        action: 'lead_capture',
        route: '/api/leads',
      }),
    );
    expect(mocks.supabaseInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        work_email: 'renan@example.test',
        company_name: 'Risck Comply',
        consent_to_contact: true,
      }),
    );
  });

  it('blocks rate limited requests before Supabase or webhook side effects', async () => {
    mocks.checkDistributedRateLimit.mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
      category: 'general-api',
      policy: 'general-api',
      highRisk: false,
      failureMode: 'fail-closed',
      audit: false,
      key: 'lead_capture:test',
      userId: null,
      organizationId: null,
      route: '/api/leads',
      action: 'lead_capture',
    });
    vi.stubEnv('RISCK_COMPLY_LEAD_WEBHOOK_URL', 'https://webhook.example.test/leads');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    const response = await POST(buildRequest(validLead()));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'Too many requests. Please try again in a minute.' });
    expect(mocks.tryCreateAdminClient).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON without logging parser details to the response', async () => {
    const response = await POST(buildRequest('{not valid json'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body).toEqual({ error: 'Invalid request body.' });
    expect(JSON.stringify(body)).not.toMatch(/stack|syntax|json/i);
    expect(mocks.tryCreateAdminClient).not.toHaveBeenCalled();
  });

  it('rejects missing consent and invalid email before storage', async () => {
    const response = await POST(buildRequest(validLead({ workEmail: 'bad-email', consentToContact: false })));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Please provide name, work email, company and consent to contact.' });
    expect(mocks.tryCreateAdminClient).not.toHaveBeenCalled();
  });
});
