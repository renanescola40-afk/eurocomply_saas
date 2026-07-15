import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireApiUser: vi.fn(),
  requirePermission: vi.fn(),
  requireTrustedMutation: vi.fn(),
  getCurrentOrganizationForUser: vi.fn(),
  createAuditEvent: vi.fn(),
  createNotification: vi.fn(),
  fetchEq: vi.fn(),
  fetchMaybeSingle: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
  updateIs: vi.fn(),
  updateMaybeSingle: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  tryCreateAdminClient: () => {
    const fetchQuery = {
      eq: mocks.fetchEq,
      maybeSingle: mocks.fetchMaybeSingle,
    };
    const updateSelection = { maybeSingle: mocks.updateMaybeSingle };
    const updateQuery = {
      eq: mocks.updateEq,
      is: mocks.updateIs,
      select: vi.fn(() => updateSelection),
    };

    mocks.fetchEq.mockImplementation(() => fetchQuery);
    mocks.update.mockImplementation(() => updateQuery);
    mocks.updateEq.mockImplementation(() => updateQuery);
    mocks.updateIs.mockImplementation(() => updateQuery);

    return {
      from: () => ({
        select: () => fetchQuery,
        update: mocks.update,
      }),
    };
  },
}));

vi.mock('@/server/queries/audit-events', () => ({ createAuditEvent: mocks.createAuditEvent }));
vi.mock('@/server/queries/notifications', () => ({ createNotification: mocks.createNotification }));
vi.mock('@/server/queries/organizations', () => ({ getCurrentOrganizationForUser: mocks.getCurrentOrganizationForUser }));

vi.mock('@/server/security/api-guards', () => ({
  requireApiUser: mocks.requireApiUser,
  requirePermission: mocks.requirePermission,
  requireTrustedMutation: mocks.requireTrustedMutation,
  parseJsonBodyWithZod: async (request: Request, options: { schema: { parse: (value: unknown) => unknown } }) =>
    options.schema.parse(await request.json()),
  assertApiResourceOrganization: (resourceOrganizationId: string, organizationId: string) => {
    if (resourceOrganizationId !== organizationId) throw { code: 'organization_membership_required', status: 403 };
  },
  secureApiError: (error: { code?: string; status?: number; name?: string }) =>
    new Response(JSON.stringify({ error: error?.name === 'ZodError' ? 'invalid_request' : error.code ?? 'internal_server_error' }), {
      status: error?.name === 'ZodError' ? 400 : error.status ?? 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    }),
}));

import { POST } from '../../src/app/api/documents/[id]/approval/route';

function buildRequest(body: Record<string, unknown> = { action: 'approve', note: 'Looks good' }) {
  return new Request('https://app.eurocomply.test/api/documents/doc_a/approval', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://app.eurocomply.test' },
    body: JSON.stringify(body),
  });
}

function params(id = 'doc_a') {
  return { params: Promise.resolve({ id }) };
}

describe('document approval API hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiUser.mockResolvedValue({ id: 'user_admin' });
    mocks.getCurrentOrganizationForUser.mockResolvedValue({ id: 'org_a' });
    mocks.requirePermission.mockResolvedValue({ ok: true, role: 'admin' });
    mocks.requireTrustedMutation.mockResolvedValue(null);
    mocks.createAuditEvent.mockResolvedValue({ persisted: true });
    mocks.createNotification.mockResolvedValue({ persisted: true });
    mocks.fetchMaybeSingle.mockResolvedValue({
      data: { id: 'doc_a', organization_id: 'org_a', name: 'AI Policy', status: 'pending' },
      error: null,
    });
    mocks.updateMaybeSingle.mockResolvedValue({
      data: { id: 'doc_a', organization_id: 'org_a', name: 'AI Policy', status: 'approved' },
      error: null,
    });
  });

  it('blocks unauthenticated users before tenant lookup', async () => {
    mocks.requireApiUser.mockRejectedValue({ code: 'unauthorized', status: 401 });

    const response = await POST(buildRequest(), params());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'unauthorized' });
    expect(mocks.getCurrentOrganizationForUser).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('blocks users without an active organization', async () => {
    mocks.getCurrentOrganizationForUser.mockResolvedValue(null);

    const response = await POST(buildRequest(), params());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'organization_required' });
    expect(mocks.requirePermission).not.toHaveBeenCalled();
  });

  it('blocks viewer role before document update', async () => {
    mocks.requirePermission.mockRejectedValue({ code: 'permission_denied', status: 403 });

    const response = await POST(buildRequest(), params());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'permission_denied' });
    expect(mocks.requireTrustedMutation).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('blocks requests rejected by the trusted mutation guard', async () => {
    mocks.requireTrustedMutation.mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_origin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      }),
    );

    const response = await POST(buildRequest(), params());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'invalid_origin' });
    expect(mocks.fetchMaybeSingle).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('rejects invalid request bodies with a sanitized no-store response', async () => {
    const response = await POST(buildRequest({ action: 'archive' }), params());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'invalid_request' });
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('treats cross-tenant document IDs as not found before update or notification', async () => {
    mocks.fetchMaybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await POST(buildRequest(), params('doc_b'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'document_not_found' });
    expect(mocks.fetchEq).toHaveBeenNthCalledWith(1, 'id', 'doc_b');
    expect(mocks.fetchEq).toHaveBeenNthCalledWith(2, 'organization_id', 'org_a');
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.createNotification).not.toHaveBeenCalled();
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'document_approval_denied',
        organizationId: 'org_a',
        entityId: 'doc_b',
        metadata: expect.objectContaining({ reason: 'document_not_found' }),
      }),
    );
  });

  it('rejects same-state no-op approvals before update or success evidence', async () => {
    mocks.fetchMaybeSingle.mockResolvedValue({
      data: { id: 'doc_a', organization_id: 'org_a', name: 'AI Policy', status: 'approved' },
      error: null,
    });

    const response = await POST(buildRequest({ action: 'approve' }), params());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: 'document_state_unchanged' });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.createNotification).not.toHaveBeenCalled();
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'document_approval_denied',
        metadata: expect.objectContaining({ reason: 'document_state_unchanged' }),
      }),
    );
  });

  it('rejects a stale compare-and-set result without success evidence', async () => {
    mocks.updateMaybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await POST(buildRequest({ action: 'approve' }), params());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: 'document_state_changed' });
    expect(mocks.update).toHaveBeenCalledWith({ status: 'approved' });
    expect(mocks.createNotification).not.toHaveBeenCalled();
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'document_approval_denied',
        metadata: expect.objectContaining({ reason: 'document_state_changed' }),
      }),
    );
    expect(mocks.createAuditEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: 'document_approved' }),
    );
  });

  it('writes success audit and notification only after a confirmed transition', async () => {
    const response = await POST(buildRequest({ action: 'approve', note: 'Approved by compliance' }), params());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      documentId: 'doc_a',
      status: 'approved',
      persisted: true,
      auditPersisted: true,
      notificationPersisted: true,
    });
    expect(mocks.update).toHaveBeenCalledWith({ status: 'approved' });
    expect(mocks.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'document_approved',
        organizationId: 'org_a',
        entityId: 'doc_a',
        metadata: expect.objectContaining({ note: 'Approved by compliance' }),
      }),
    );
    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org_a', userId: 'user_admin', type: 'approval' }),
    );
  });
});
